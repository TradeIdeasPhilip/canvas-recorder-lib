import { canWrite, chooseFolder, rememberedFolder } from "./folder.ts";
import {
  DEFAULT_PROCESSING,
  supportedProcessing,
  VoiceRecorder,
  type HeardResult,
  type ProcessingChoices,
  type ProcessingName,
} from "./voice-recorder.ts";

/**
 * The voice recorder's controls:  a level meter, the voice processing checkboxes, the folder, and
 * ● Record.  🎙 Record mode in the player shows and hides it.  It brings its own styles.
 *
 * The panel owns the mic and the folder.  The player owns everything about the video:  ● Record calls
 * {@link VoicePanelOptions.onRecord}, and the player says when recording starts and stops with
 * {@link VoicePanel.setRecording}.
 *
 * Copied from riemann-surfaces-3d's src/recording/record-panel.ts (9bbe2f9), without the Marker,
 * and in the player's left column instead of floating.  See development-plans/voice-recording.md.
 * @module
 */

export type VoicePanelOptions = {
  /** The panel goes at the end of this element. */
  readonly parent: HTMLElement;
  /** The player's AudioContext, so the mic and the video share one clock. */
  readonly context: AudioContext;
  /** ● Record, with a folder we can write to.  Start recording, and the video. */
  readonly onRecord: (recorder: VoiceRecorder, folder: FileSystemDirectoryHandle) => Promise<void>;
  /** ■ Stop. */
  readonly onStop: () => void;
  /** Called after the panel closes, by × or by {@link VoicePanel.close}. */
  readonly onClose?: () => void;
};

export type VoicePanel = {
  readonly recorder: VoiceRecorder;
  /** The player started or stopped recording.  ● Record becomes ■ Stop, and back. */
  setRecording(on: boolean): void;
  /** How far past the end of the play limits the recording is, in ms.  Undefined when it isn't. */
  setPastEnd(ms: number | undefined): void;
  /** A line in the status area. */
  say(text: string, warning?: boolean): void;
  /** Use this folder from now on, without asking.  For tests. */
  setFolder(folder: FileSystemDirectoryHandle): void;
  /** Stop recording, turn the mic off, and remove the panel. */
  close(): Promise<void>;
};

/** The meter shows −60 to 0 dBFS. */
const METER_FLOOR = -60;
/** Where your voice's peaks should land.  The usual target for speech. */
const VOICE_TARGET_DB = -12;
/** Peaks louder than this count as clipping. */
const CLIP_DB = -1;
/** The bar averages the level over about this long, in seconds.  Meters usually do. */
const METER_SECONDS = 0.3;
const STORAGE = {
  processing: "voice-recorder.processing",
  chirpLevel: "voice-recorder.chirp-level",
};

const CSS = /* css */ `
.vr-panel {
  margin-top: 0.5em;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(160, 180, 230, 0.25);
  background: rgb(14, 18, 32);
  color: #e6ecfa;
  font: 13px/1.35 system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.vr-panel.vr-recording {
  border-color: #ff5a5f;
}
.vr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 650;
}
.vr-panel button {
  font: inherit;
  color: inherit;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(160, 180, 230, 0.25);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}
.vr-panel button:hover {
  background: rgba(255, 255, 255, 0.16);
}
.vr-panel button:disabled {
  opacity: 0.5;
  cursor: default;
}
.vr-close {
  padding: 0 7px !important;
  font-size: 16px !important;
}
.vr-meter {
  display: flex;
  align-items: center;
  gap: 8px;
}
.vr-track {
  position: relative;
  flex: 1;
  height: 14px;
  border-radius: 3px;
  background: linear-gradient(to right, #1f6f3d 0%, #1f6f3d 75%, #7a6a10 75%, #7a6a10 93%, #7a1f22 93%);
  overflow: hidden;
}
.vr-level {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, #3ddc84 0%, #3ddc84 75%, #f2d14c 75%, #f2d14c 93%, #ff5a5f 93%);
}
.vr-peak {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #fff;
}
.vr-mark {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 0;
  border-left: 2px dashed;
}
.vr-mark.vr-voice {
  border-color: #7fd0ff;
}
.vr-mark.vr-sound {
  border-color: #ff9df2;
}
.vr-db {
  width: 62px;
  text-align: right;
}
.vr-clipping .vr-db {
  color: #ff5a5f;
  font-weight: 700;
}
.vr-legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #9aa7c4;
}
.vr-legend span::before {
  content: "";
  display: inline-block;
  width: 10px;
  margin-right: 4px;
  vertical-align: middle;
  border-top: 2px dashed;
}
.vr-legend .vr-voice::before {
  border-color: #7fd0ff;
}
.vr-legend .vr-sound::before {
  border-color: #ff9df2;
}
.vr-choice {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.vr-got {
  margin-left: auto;
  font-size: 11px;
  color: #9aa7c4;
}
.vr-got.vr-mismatch {
  color: #ff9a5f;
}
.vr-small {
  font-size: 11px;
  color: #9aa7c4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vr-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}
.vr-record {
  min-width: 92px;
}
.vr-recording .vr-record {
  background: rgba(255, 90, 95, 0.3) !important;
  border-color: #ff5a5f !important;
}
.vr-past-end {
  color: #ff9a5f;
}
.vr-time {
  margin-left: auto;
  font-size: 15px;
}
.vr-recording .vr-time::before {
  content: "● ";
  color: #ff5a5f;
}
.vr-status:empty {
  display: none;
}
.vr-status.vr-warning {
  color: #ff9a5f;
}
`;

function addStyles() {
  if (!document.getElementById("vr-styles")) {
    const style = document.createElement("style");
    style.id = "vr-styles";
    style.textContent = CSS;
    document.head.append(style);
  }
}

/** Make an element, with a class and some content. */
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  ...content: (Node | string)[]
) {
  const result = document.createElement(tag);
  result.className = className;
  result.append(...content);
  return result;
}

const toDb = (level: number) => 20 * Math.log10(Math.max(level, 1e-6));
/** Where on the meter, 0 to 1. */
const meterFraction = (db: number) =>
  Math.min(1, Math.max(0, (db - METER_FLOOR) / -METER_FLOOR));
const formatDb = (db: number) =>
  db <= METER_FLOOR ? "−∞ dB" : `${db.toFixed(1).replace("-", "−")} dB`;

function loadChoices(): ProcessingChoices {
  try {
    const saved = localStorage.getItem(STORAGE.processing);
    return saved ? JSON.parse(saved) : { ...DEFAULT_PROCESSING };
  } catch {
    return { ...DEFAULT_PROCESSING };
  }
}

/**
 * Open the panel and turn on the mic.  Call this from a click, so the browser lets audio start.
 * The browser asks for permission to use the mic the first time.
 */
export async function openVoicePanel(options: VoicePanelOptions): Promise<VoicePanel> {
  addStyles();
  const panel = element("div", "vr-panel");
  const close = element("button", "vr-close", "×");
  close.title = "Close record mode, and turn the mic off";
  const level = element("div", "vr-level");
  const peak = element("div", "vr-peak");
  const voiceMark = element("div", "vr-mark vr-voice");
  const soundMark = element("div", "vr-mark vr-sound");
  const db = element("span", "vr-db", formatDb(-Infinity));
  const meter = element(
    "div",
    "vr-meter",
    element("div", "vr-track", level, peak, voiceMark, soundMark),
    db,
  );
  const legend = element(
    "div",
    "vr-legend",
    element("span", "vr-voice", "voice target"),
    element("span", "vr-sound", "chirp, last time"),
  );
  const choicesBox = element("div");
  const micLine = element("div", "vr-small", "Turning on the mic…");
  const folderName = element("b", "", "…");
  const changeFolder = element("button", "", "Change…");
  changeFolder.style.padding = "0 6px";
  const folderLine = element("div", "vr-small", "Folder: ", folderName, " ", changeFolder);
  const record = element("button", "vr-record", "● Record");
  record.title =
    "Play the chirp, then record your voice while the video plays.  Pause the video to stop.  " +
    "Each seek starts a new sound clip.";
  const pastEnd = element("span", "vr-past-end");
  const time = element("span", "vr-time", "0:00");
  const status = element("div", "vr-status");
  panel.append(
    element("div", "vr-head", element("span", "", "🎙 Record mode"), close),
    meter,
    legend,
    choicesBox,
    micLine,
    folderLine,
    element("div", "vr-buttons", record, pastEnd, time),
    status,
  );
  options.parent.append(panel);

  const say = (text: string, warning = false) => {
    status.textContent = text;
    status.classList.toggle("vr-warning", warning);
  };
  const placeMark = (mark: HTMLElement, value: number | undefined) => {
    mark.hidden = value === undefined;
    mark.style.left = `${meterFraction(value ?? 0) * 100}%`;
  };
  placeMark(voiceMark, VOICE_TARGET_DB);
  const savedChirpLevel = Number(localStorage.getItem(STORAGE.chirpLevel));
  placeMark(
    soundMark,
    Number.isFinite(savedChirpLevel) && savedChirpLevel < 0 ? savedChirpLevel : undefined,
  );
  const closed = () => {
    panel.remove();
    options.onClose?.();
  };

  // The folder.  Independent of the mic, so it shows even if the mic is refused.
  // Not awaited:  the mic should start while this click still counts as a click.
  let folder: FileSystemDirectoryHandle | undefined;
  const showFolder = () => {
    folderName.textContent = folder ? folder.name || "browser storage" : "not chosen yet";
  };
  void rememberedFolder().then((remembered) => {
    // ??=, in case Change… or setFolder() got here first.
    folder ??= remembered;
    showFolder();
  });
  changeFolder.addEventListener("click", async () => {
    changeFolder.blur();
    try {
      folder = (await chooseFolder()) ?? folder;
      showFolder();
    } catch (error) {
      say(error instanceof Error ? error.message : String(error), true);
    }
  });

  let recorder: VoiceRecorder;
  try {
    recorder = await VoiceRecorder.open(options.context, loadChoices());
  } catch (error) {
    micLine.textContent = "No mic.";
    say(`Couldn't turn on the mic: ${error instanceof Error ? error.message : error}`, true);
    // Leave the panel up, so you can read why.
    close.addEventListener("click", closed);
    throw error;
  }

  // The level meter.  The bar is the average level, and the line is the peak, held for a moment.
  let held = -Infinity;
  let heldAt = 0;
  let lastLevel = performance.now();
  let clippedAt = -Infinity;
  let meanSquare = 0;
  recorder.onLevel = (peakLevel, rms) => {
    const now = performance.now();
    const seconds = (now - lastLevel) / 1000;
    lastLevel = now;
    meanSquare += (rms * rms - meanSquare) * (1 - Math.exp(-seconds / METER_SECONDS));
    const peakDb = toDb(peakLevel);
    if (peakDb >= held) {
      held = peakDb;
      heldAt = now;
    } else if (now - heldAt > 1000) {
      // Hold the peak for a second, then let it fall 20 dB a second.
      held = Math.max(peakDb, held - 20 * seconds);
    }
    if (peakDb >= CLIP_DB) {
      clippedAt = now;
    }
    level.style.clipPath = `inset(0 ${(1 - meterFraction(toDb(Math.sqrt(meanSquare)))) * 100}% 0 0)`;
    peak.style.left = `calc(${meterFraction(held) * 100}% - 1px)`;
    db.textContent = formatDb(held);
    panel.classList.toggle("vr-clipping", now - clippedAt < 2000);
  };

  // The voice processing checkboxes, and what the mic actually got.
  const gotLabels = new Map<ProcessingName, HTMLElement>();
  const showSettings = () => {
    const actual = recorder.actualSettings();
    const requested = loadChoices();
    for (const [name, got] of gotLabels) {
      const value = actual[name];
      got.textContent = value === undefined ? "got: ?" : `got: ${value ? "on" : "off"}`;
      got.classList.toggle(
        "vr-mismatch",
        value !== undefined && value !== (requested[name] ?? false),
      );
    }
    const rate = actual.sampleRate ? ` · ${Number(actual.sampleRate) / 1000} kHz` : "";
    micLine.textContent = `Mic: ${recorder.micName || "unknown"}${rate}`;
  };
  for (const { name, label, help } of supportedProcessing()) {
    const box = element("input");
    box.type = "checkbox";
    box.checked = loadChoices()[name] ?? false;
    box.setAttribute("aria-label", label);
    const got = element("span", "vr-got");
    gotLabels.set(name, got);
    const row = element("label", "vr-choice", box, label, got);
    row.title = help;
    // "change", not "input":  each one reopens the mic, so once per click is right.
    box.addEventListener("change", async () => {
      box.blur();
      localStorage.setItem(
        STORAGE.processing,
        JSON.stringify({ ...loadChoices(), [name]: box.checked }),
      );
      box.disabled = true;
      try {
        await recorder.setProcessing(name, box.checked);
      } catch (error) {
        say(
          `Couldn't change ${label.toLowerCase()}: ${error instanceof Error ? error.message : error}`,
          true,
        );
      }
      box.disabled = false;
      showSettings();
    });
    choicesBox.append(row);
  }
  showSettings();

  // What we heard of the chirp.
  recorder.onHeard = (result: HeardResult) => {
    if (result.roundTripMs === undefined) {
      say(
        `Didn't hear the chirp.  Are the speakers off, or are you using headphones?  ` +
          `Using the last delay measured, ${recorder.micDelayMs.toFixed(0)} ms.`,
        true,
      );
      return;
    }
    localStorage.setItem(STORAGE.chirpLevel, String(result.peakDb));
    placeMark(soundMark, result.peakDb);
    say(
      `Heard the chirp.  Round trip ${result.roundTripMs.toFixed(1)} ms, at ${formatDb(result.peakDb)}.  ` +
        `Mic delay ${recorder.micDelayMs.toFixed(0)} ms.`,
    );
  };

  // ● Record and ■ Stop.
  let started = 0;
  let clock = 0;
  const showTime = () => {
    const seconds = Math.floor((performance.now() - started) / 1000);
    time.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  /** What the button says:  ■ Stop.  That's what a click does, even if the two ever disagree. */
  let showingStop = false;
  record.addEventListener("click", async () => {
    record.blur();
    if (showingStop) {
      options.onStop();
      return;
    }
    record.disabled = true;
    try {
      if (!folder || !(await canWrite(folder, true))) {
        folder = await chooseFolder();
        showFolder();
      }
      if (!folder) {
        say("Choose a folder for the recordings first.", true);
        return;
      }
      say("");
      await options.onRecord(recorder, folder);
    } catch (error) {
      say(error instanceof Error ? error.message : String(error), true);
    } finally {
      record.disabled = false;
    }
  });

  const result: VoicePanel = {
    recorder,
    setRecording(on) {
      showingStop = on;
      panel.classList.toggle("vr-recording", on);
      record.textContent = on ? "■ Stop" : "● Record";
      window.clearInterval(clock);
      if (on) {
        started = performance.now();
        clock = window.setInterval(showTime, 250);
        showTime();
      } else {
        pastEnd.textContent = "";
      }
    },
    setPastEnd(ms) {
      pastEnd.textContent = ms === undefined ? "" : `+${(ms / 1000).toFixed(1)} s past the end`;
    },
    say,
    setFolder(newFolder) {
      folder = newFolder;
      showFolder();
    },
    async close() {
      window.clearInterval(clock);
      await recorder.close();
      closed();
    },
  };
  close.addEventListener("click", () => void result.close());
  return result;
}
