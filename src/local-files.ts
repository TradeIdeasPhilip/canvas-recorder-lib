import type { Showable } from "./showable";

/**
 * Video, sound and image files on the user's own computer, instead of on a web server.
 *
 * A component stores a URL like `local:Screen Recording 2026-10-18 at 10.00.00.mov`.
 * That string can go anywhere a URL can:  a JSON save file, the clipboard, a sound clip's source.
 * The file handle itself can't, so this module keeps the list of handles, in IndexedDB,
 * and looks each name up when the file is needed.
 *
 * The list is shared by every video on this origin, so a file picked in one video can be
 * picked from the list in another.
 *
 * **Permission.**  The browser may forget its permission to read a file, typically when the
 * page reloads.  Asking again needs a click, so a component can't just ask when it needs the
 * file.  Instead, {@link getLocalFile} fails with a {@link LocalFileError}, the file goes on
 * the {@link localFilesNeedingPermission} list, and the player shows a 🔓 button that calls
 * {@link requestLocalFileAccess}.  {@link onLocalFilesChange} tells everyone to try again.
 *
 * A file handle only means something in the browser profile that picked it.
 * A project that uses local files works on this computer, not on someone else's.
 *
 * See development-plans/loading-video-clips-from-local-files.md.
 * @module
 */

// MARK: URLs

/** Every local file URL starts with this. */
export const LOCAL_FILE_PREFIX = "local:";

/** True for a URL made by {@link localFileUrl}. */
export function isLocalFileUrl(url: string): boolean {
  return url.startsWith(LOCAL_FILE_PREFIX);
}

/** The URL that stands for the local file with this name. */
export function localFileUrl(name: string): string {
  return LOCAL_FILE_PREFIX + name;
}

/** The file name in a local file URL. */
export function localFileName(url: string): string {
  if (!isLocalFileUrl(url)) {
    throw new Error(`"${url}" is not a local file URL.`);
  }
  return url.slice(LOCAL_FILE_PREFIX.length);
}

/** Why a local file couldn't be read. */
export class LocalFileError extends Error {
  constructor(
    message: string,
    /** The file's name, without the `local:` prefix. */
    readonly fileName: string,
    /**
     * - `unknown`:  this browser has never seen a file by this name.  Pick it again.
     * - `permission`:  the browser needs the user's OK.  See {@link requestLocalFileAccess}.
     * - `unreadable`:  the file was moved, deleted or changed.  Pick it again.
     */
    readonly reason: "unknown" | "permission" | "unreadable",
  ) {
    super(message);
    this.name = "LocalFileError";
  }
}

// MARK: Change notifications

let generation = 0;
const listeners = new Set<() => void>();

/**
 * A number that goes up whenever the list of files or their permissions change.
 * A component that caches a failed attempt to open a local file can compare this to
 * know when to try again.
 */
export function localFilesGeneration(): number {
  return generation;
}

/**
 * Call `listener` whenever the list of files or their permissions change.
 * @returns A function that removes the listener.
 */
export function onLocalFilesChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function changed() {
  generation++;
  for (const listener of listeners) {
    listener();
  }
}

// MARK: The list of handles (IndexedDB)

type HandleRecord = {
  readonly name: string;
  readonly handle: FileSystemFileHandle;
  readonly addedAt: number;
};

const DB_NAME = "canvas-recorder-local-files";
const STORE = "handles";

let dbPromise: Promise<IDBDatabase> | undefined;
function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "name" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function readRecord(name: string): Promise<HandleRecord | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(name);
    request.onsuccess = () => resolve(request.result as HandleRecord | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function readAllRecords(): Promise<HandleRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as HandleRecord[]);
    request.onerror = () => reject(request.error);
  });
}

async function writeRecord(record: HandleRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/** Handles already read from IndexedDB.  The list is short, so this never needs trimming. */
const handles = new Map<string, FileSystemFileHandle>();

async function findHandle(name: string): Promise<FileSystemFileHandle | undefined> {
  let handle = handles.get(name);
  if (!handle) {
    handle = (await readRecord(name))?.handle;
    if (handle) handles.set(name, handle);
  }
  return handle;
}

// MARK: Adding files

/**
 * Remember this file, and return the URL that stands for it.
 *
 * A file with the same name replaces the old one.  That's how a moved file gets fixed:
 * pick it again from its new place.
 */
export async function addLocalFile(handle: FileSystemFileHandle): Promise<string> {
  await writeRecord({ name: handle.name, handle, addedAt: Date.now() });
  handles.set(handle.name, handle);
  needingPermission.delete(handle.name);
  changed();
  return localFileUrl(handle.name);
}

/** Video files, for {@link pickLocalFile}. */
export const VIDEO_FILE_TYPES: FilePickerAcceptType[] = [
  {
    description: "Video",
    accept: { "video/*": [".mp4", ".mov", ".m4v", ".webm", ".mkv"] },
  },
];

/** Image files, for {@link pickLocalFile}. */
export const IMAGE_FILE_TYPES: FilePickerAcceptType[] = [
  {
    description: "Image",
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"] },
  },
];

/**
 * Ask the user for a file, remember it, and return its URL.
 * Call this from a click handler:  the browser only shows a file picker for a click.
 * @param options `id` makes the picker remember its own folder, e.g. "video-clips".
 * @returns The new URL, or undefined if the user canceled.
 */
export async function pickLocalFile(options: {
  id?: string;
  types?: FilePickerAcceptType[];
  /** Where the picker starts the first time, before `id` remembers a folder.  The default is "videos". */
  startIn?: WellKnownDirectory;
}): Promise<string | undefined> {
  let handle: FileSystemFileHandle;
  try {
    [handle] = await window.showOpenFilePicker({
      id: options.id,
      types: options.types,
      startIn: options.startIn ?? "videos",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return undefined;
    }
    throw error;
  }
  return addLocalFile(handle);
}

/** One entry in {@link listLocalFiles}. */
export type LocalFileInfo = {
  readonly name: string;
  readonly url: string;
  readonly addedAt: number;
};

/** Every file this browser remembers, newest first. */
export async function listLocalFiles(): Promise<LocalFileInfo[]> {
  const records = await readAllRecords();
  return records
    .toSorted((a, b) => b.addedAt - a.addedAt)
    .map(({ name, addedAt }) => ({ name, url: localFileUrl(name), addedAt }));
}

// MARK: Reading files

/** Names whose permission was found missing, and not yet granted. */
const needingPermission = new Set<string>();

/** The files that need a click on 🔓 before they can be read.  See {@link requestLocalFileAccess}. */
export function localFilesNeedingPermission(): readonly string[] {
  return [...needingPermission];
}

function permissionNeeded(name: string): LocalFileError {
  if (!needingPermission.has(name)) {
    needingPermission.add(name);
    changed();
  }
  return new LocalFileError(
    `"${name}" is on your computer.  Click 🔓 to let the browser read it.`,
    name,
    "permission",
  );
}

/**
 * The file for a local file URL, as it is right now.
 *
 * This never asks the user anything.  If the browser needs permission, this fails with a
 * {@link LocalFileError} whose reason is `permission`, and adds the file to
 * {@link localFilesNeedingPermission}.
 */
export async function getLocalFile(url: string): Promise<File> {
  const name = localFileName(url);
  const handle = await findHandle(name);
  if (!handle) {
    throw new LocalFileError(
      `"${name}" isn't in this browser's list of local files.  Pick it again.`,
      name,
      "unknown",
    );
  }
  if ((await handle.queryPermission({ mode: "read" })) !== "granted") {
    throw permissionNeeded(name);
  }
  try {
    return await handle.getFile();
  } catch (error) {
    throw new LocalFileError(
      `Can't read "${name}".  It may have been moved or deleted.  Pick it again.  (${error})`,
      name,
      "unreadable",
    );
  }
}

/**
 * Ask the user for permission to read every file in {@link localFilesNeedingPermission}.
 * Call this from a click handler.
 *
 * The browser may only show one prompt per click.  Any file it skips stays on the list,
 * so the user can click again.
 */
export async function requestLocalFileAccess(): Promise<void> {
  let anyGranted = false;
  for (const name of [...needingPermission]) {
    const handle = await findHandle(name);
    if (!handle) {
      needingPermission.delete(name);
      continue;
    }
    try {
      if ((await handle.requestPermission({ mode: "read" })) === "granted") {
        needingPermission.delete(name);
        anyGranted = true;
      }
    } catch (error) {
      // Usually "user activation is required":  this click was used up by an earlier prompt.
      console.info(`Couldn't ask about "${name}" yet.  Click again.`, error);
      break;
    }
  }
  if (anyGranted) {
    changed();
  }
}

/**
 * Check, without asking the user anything, that every local file in `urls` can be read.
 * Any that need permission go on {@link localFilesNeedingPermission}.
 * @returns One problem per file that can't be read now.  Empty when everything is ready.
 */
export async function checkLocalFiles(
  urls: Iterable<string>,
): Promise<LocalFileError[]> {
  const problems: LocalFileError[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    if (!isLocalFileUrl(url) || seen.has(url)) continue;
    seen.add(url);
    try {
      await getLocalFile(url);
    } catch (error) {
      problems.push(
        error instanceof LocalFileError
          ? error
          : new LocalFileError(String(error), localFileName(url), "unreadable"),
      );
    }
  }
  return problems;
}

/**
 * Every local file URL used anywhere in this showable or its descendants:
 * in scalars, in string schedules, and in sound clips.
 */
export function localFileUrlsIn(showable: Showable): Set<string> {
  const found = new Set<string>();
  const visit = (current: Showable) => {
    for (const scalar of current.scalars ?? []) {
      if (typeof scalar.value === "string" && isLocalFileUrl(scalar.value)) {
        found.add(scalar.value);
      }
    }
    for (const schedule of current.schedules ?? []) {
      for (const keyframe of schedule.schedule) {
        if (typeof keyframe.value === "string" && isLocalFileUrl(keyframe.value)) {
          found.add(keyframe.value);
        }
      }
    }
    for (const sound of current.soundClips ?? []) {
      if (isLocalFileUrl(sound.source)) found.add(sound.source);
    }
    current.children?.forEach(({ child }) => visit(child));
  };
  visit(showable);
  return found;
}

/**
 * Like `fetch()`, but it also understands local file URLs.
 * Use this anywhere media is read by URL, so local files work there too.
 */
export async function fetchMedia(url: string, init?: RequestInit): Promise<Response> {
  if (isLocalFileUrl(url)) {
    const file = await getLocalFile(url);
    return new Response(init?.method === "HEAD" ? null : file, {
      headers: {
        "content-length": String(file.size),
        "last-modified": new Date(file.lastModified).toUTCString(),
      },
    });
  }
  return fetch(url, init);
}
