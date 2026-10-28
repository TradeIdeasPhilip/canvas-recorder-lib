import { Input, InputVideoTrack } from "mediabunny";
import { ReadOnlyRect } from "phil-lib/misc";
import { canvasRecorder } from "../../lib/main-control.ts";

// MARK: Constants

/** The width of the canvas, in units.  Usually 16.  See {@link canvasRecorder.width}. */
export function canvasWidthUnits(): number {
  return canvasRecorder.width;
}

/** The height of the canvas, in units.  Usually 9.  See {@link canvasRecorder.height}. */
export function canvasHeightUnits(): number {
  return canvasRecorder.height;
}

/**
 * Output pixels per canvas unit, across.  3840 / 16 = 240 for the defaults.
 * A video drawn at exactly this many of its own pixels per unit appears at its
 * native resolution in the final output, with no resampling at all.
 */
export function pixelsPerUnit(): number {
  return canvasRecorder.pixelWidth / canvasRecorder.width;
}

// MARK: Reading a file

/**
 * What we can learn about a video file cheaply — fast enough to run on every
 * keystroke while someone types a URL.
 *
 * Deliberately *not* included:  anything that needs a scan of the whole file,
 * like exact frame rate statistics.  `npm run info` (record/cli-info.ts) is the
 * place for those.
 */
export type VideoInfo = {
  /** The container, e.g. "MP4" or "QuickTime". */
  readonly formatName: string;
  /** The video track's duration — from metadata when there is any, otherwise computed. */
  readonly durationMs: number;
  readonly video: {
    readonly width: number;
    readonly height: number;
    readonly codec: string | null;
    /**
     * Measured from a sample of packets, not the whole file.  Variable frame
     * rate recordings (most screen recordings) can disagree with themselves.
     */
    readonly fpsLabel: string;
    /** Where the presentation timeline starts.  Usually 0. */
    readonly firstTimestampMs: number;
  };
  /** `undefined` means the file has no audio track, which is common and normal. */
  readonly audio:
    | {
        readonly channels: number;
        readonly sampleRate: number;
        readonly codec: string | null;
        /**
         * Edit-list adjusted.  A negative value means the decoded audio starts
         * that long *before* the video's presentation timeline, so that much
         * has to be skipped to keep the two in sync.  See
         * development-plans/import-audio-button.md.
         */
        readonly firstTimestampMs: number;
      }
    | undefined;
};

function formatFps(n: number): string {
  return Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2);
}

/**
 * Collect {@link VideoInfo} from an already open `Input`.
 *
 * Pass the video track if the caller already looked it up, to avoid doing it
 * twice.
 */
export async function readVideoInfo(
  input: Input,
  videoTrack?: InputVideoTrack,
): Promise<VideoInfo> {
  const track = videoTrack ?? (await input.getPrimaryVideoTrack());
  if (!track) {
    throw new Error("No video track found.");
  }
  // The video track's duration, not the container's:  "use the whole file"
  // has to end exactly where the frames end, even if the audio runs longer.
  // Metadata first (cheap); a scan only when the file doesn't declare one.
  const metaDuration = await track.getDurationFromMetadata();
  const durationMs = (metaDuration ?? (await track.computeDuration())) * 1_000;
  // Default sample size, not a full scan.
  const metrics = await track.computeFrameRateMetrics();
  const fpsLabel =
    metrics.minFrameRate === metrics.maxFrameRate
      ? formatFps(metrics.minFrameRate)
      : `${formatFps(metrics.minFrameRate)}–${formatFps(metrics.maxFrameRate)}`;
  const audioTrack = await input.getPrimaryAudioTrack();
  return {
    formatName: (await input.getFormat()).name,
    durationMs,
    video: {
      width: await track.getDisplayWidth(),
      height: await track.getDisplayHeight(),
      codec: await track.getCodec(),
      fpsLabel,
      firstTimestampMs: (await track.getFirstTimestamp()) * 1_000,
    },
    audio: audioTrack
      ? {
          channels: await audioTrack.getNumberOfChannels(),
          sampleRate: await audioTrack.getSampleRate(),
          codec: await audioTrack.getCodec(),
          firstTimestampMs: (await audioTrack.getFirstTimestamp()) * 1_000,
        }
      : undefined,
  };
}

// MARK: Sizing a destination rectangle

type Size = { readonly width: number; readonly height: number };

/** "max fit" / "meet" / "contain": the whole video fits inside the canvas. */
export function maxFit(mediaWidth: number, mediaHeight: number): Size {
  const canvasWidth = canvasWidthUnits();
  const canvasHeight = canvasHeightUnits();
  const mediaAspect = mediaWidth / mediaHeight;
  const canvasAspect = canvasWidth / canvasHeight;
  return mediaAspect > canvasAspect
    ? { width: canvasWidth, height: canvasWidth / mediaAspect }
    : { width: canvasHeight * mediaAspect, height: canvasHeight };
}

/** "min to cover" / "slice" / "fill": the canvas is fully covered; the video may overflow it. */
export function minCover(mediaWidth: number, mediaHeight: number): Size {
  const canvasWidth = canvasWidthUnits();
  const canvasHeight = canvasHeightUnits();
  const mediaAspect = mediaWidth / mediaHeight;
  const canvasAspect = canvasWidth / canvasHeight;
  return mediaAspect > canvasAspect
    ? { width: canvasHeight * mediaAspect, height: canvasHeight }
    : { width: canvasWidth, height: canvasWidth / mediaAspect };
}

/** "preserve pixels": native resolution in the final output.  See {@link pixelsPerUnit}. */
export function preservePixels(mediaWidth: number, mediaHeight: number): Size {
  return {
    width: mediaWidth / pixelsPerUnit(),
    height: mediaHeight / pixelsPerUnit(),
  };
}

/** A rectangle of the given size, centered on the canvas. */
export function centeredOnCanvas(size: Size): ReadOnlyRect {
  return {
    x: (canvasWidthUnits() - size.width) / 2,
    y: (canvasHeightUnits() - size.height) / 2,
    width: size.width,
    height: size.height,
  };
}

/** A rectangle of the given size, sharing a center with `around`. */
export function sameCenter(size: Size, around: ReadOnlyRect): ReadOnlyRect {
  return {
    x: around.x + (around.width - size.width) / 2,
    y: around.y + (around.height - size.height) / 2,
    width: size.width,
    height: size.height,
  };
}

/**
 * The largest rectangle with the given aspect ratio that fits inside `rect`,
 * sharing its center.  This is exactly the area VideoClipComponent actually
 * draws into, because it letterboxes the video inside whatever rectangle it
 * is given.
 */
export function shrinkToAspect(rect: ReadOnlyRect, aspect: number): ReadOnlyRect {
  const rectAspect = rect.width / rect.height;
  const size =
    rectAspect > aspect
      ? { width: rect.height * aspect, height: rect.height }
      : { width: rect.width, height: rect.width / aspect };
  return sameCenter(size, rect);
}
