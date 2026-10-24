import {
  isLocalFileUrl,
  listLocalFiles,
  onLocalFilesChange,
  pickLocalFile,
} from "../src/local-files.ts";

/** What {@link buildLocalFileRow} needs to know. */
export type LocalFileRowOptions = {
  /** Which files the picker offers, e.g. VIDEO_FILE_TYPES. */
  readonly types: FilePickerAcceptType[];
  /** The picker remembers a folder for each id, e.g. "video-clips". */
  readonly pickerId: string;
  /** Where the picker starts the first time. */
  readonly startIn?: WellKnownDirectory;
  /** The component's URL right now. */
  readonly currentUrl: () => string;
  /** The user chose a file.  Store this URL in the component. */
  readonly choose: (url: string) => void;
};

/**
 * A row for a media panel:  "📂 Open file…" and a list of the files this browser already
 * knows about.  Choosing either one gives the component a `local:` URL.
 * See src/local-files.ts.
 *
 * Typing an http(s) or relative URL in the URL field still works as before.
 */
export function buildLocalFileRow(options: LocalFileRowOptions): HTMLElement {
  const row = document.createElement("div");
  row.style.cssText = "margin-bottom:0.3em;display:flex;gap:0.3em;align-items:center;flex-wrap:wrap";

  const pickButton = document.createElement("button");
  pickButton.type = "button";
  pickButton.textContent = "📂 Open file…";
  pickButton.title =
    "Use a file from this computer.  The browser remembers it, so next time it's in the list.";
  row.append(pickButton);

  const recentSelect = document.createElement("select");
  recentSelect.title = "Files this browser already knows about, newest first.";
  recentSelect.style.maxWidth = "18em";
  row.append(recentSelect);

  const where = document.createElement("span");
  where.style.cssText = "font-size:0.85em;color:#555";
  row.append(where);

  /** Bumped by every redraw, so an old, slow answer can't overwrite a newer one. */
  let generation = 0;
  async function redraw() {
    const myGeneration = ++generation;
    const url = options.currentUrl();
    where.textContent = isLocalFileUrl(url) ? "On this computer" : url ? "On the web server" : "";
    let files: Awaited<ReturnType<typeof listLocalFiles>>;
    try {
      files = await listLocalFiles();
    } catch {
      files = [];
    }
    if (myGeneration !== generation) return;
    const placeholder = document.createElement("option");
    placeholder.textContent = files.length ? "Recent files…" : "No recent files";
    placeholder.value = "";
    placeholder.disabled = true;
    const choices = files.map((file) => {
      const option = document.createElement("option");
      option.value = file.url;
      option.textContent = file.name;
      return option;
    });
    recentSelect.replaceChildren(placeholder, ...choices);
    recentSelect.value = isLocalFileUrl(url) && files.some((f) => f.url === url) ? url : "";
    recentSelect.disabled = files.length === 0;
  }

  pickButton.addEventListener("click", async () => {
    try {
      const url = await pickLocalFile({
        id: options.pickerId,
        types: options.types,
        startIn: options.startIn,
      });
      if (url) options.choose(url);
    } catch (error) {
      alert(`Couldn't open that file:  ${error}`);
    }
    void redraw();
  });

  recentSelect.addEventListener("input", () => {
    if (recentSelect.value) options.choose(recentSelect.value);
  });

  // Another panel may add a file to the list.  Stop listening once this row is gone.
  const stopListening = onLocalFilesChange(() => {
    if (!row.isConnected) {
      stopListening();
      return;
    }
    void redraw();
  });

  void redraw();
  return row;
}

