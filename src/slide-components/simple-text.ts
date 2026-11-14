import { ReadOnlyRect } from "phil-lib/misc";
import { MIN_FONT_SIZE, MIN_FONT_WIDTH } from "../glib/line-font.ts";
import {
  checkCharacters,
  FONT_NAMES,
  FontName,
  makeFontByName,
  MissingCharacters,
} from "../glib/font-choices.ts";
import { ParagraphLayout } from "../glib/paragraph-layout.ts";
import {
  ColorScheduleInfo,
  RectangleScheduleInfo,
  StringScheduleInfo,
  NumberScheduleInfo,
  SelectScheduleInfo,
} from "../schedule-helper.ts";
import { ShowOptions } from "../showable.ts";
import { DurationAgnosticComponent } from "./duration-agnostic.ts";
import { Keyframe } from "../interpolate.ts";
import { Font } from "../glib/letters-base.ts";

type CachedFont = {
  readonly font: Font;
  readonly fontName: FontName;
  readonly size: number;
  readonly fontWidth: number;
  readonly boldness: number;
  readonly obliqueness: number;
};

export class TextComponent extends DurationAgnosticComponent {
  readonly registryKey = "Text";
  readonly colorSchedule = new ColorScheduleInfo("Color", "#888");
  readonly rectSchedule = new RectangleScheduleInfo("Rect", {
    x: 2,
    y: 2,
    width: 6,
    height: 4,
  });
  readonly textSchedule = new StringScheduleInfo("Text", "Type Here");
  /**
   * Which font:  Line Font, Futura L or Cursive.  See {@link FONT_NAMES}.
   * Each font has its own set of characters.
   */
  readonly fontSchedule = new SelectScheduleInfo<FontName, FontName>(
    "Font",
    "Line Font",
    FONT_NAMES,
  );
  readonly sizeSchedule = new NumberScheduleInfo("Size", 1);
  /**
   * How wide the letters are, compared to normal, keeping their height.  See
   * {@link Font.stretch}.
   */
  readonly fontWidthSchedule = new NumberScheduleInfo("Font Width", 1);
  readonly boldnessSchedule = new NumberScheduleInfo("Boldness", 1);
  readonly obliquenessSchedule = new NumberScheduleInfo("Obliqueness", 0);
  readonly alignmentSchedule = new SelectScheduleInfo("Alignment", "left", [
    "left",
    "center",
    "right",
    "justify",
  ]);
  override readonly replaceableComponents = undefined;
  constructor(
    initialValues: {
      description?: string;
      minDuration?: number;
      color?: string | readonly Keyframe<string>[];
      rect?: ReadOnlyRect | readonly Keyframe<ReadOnlyRect>[];
      text?: string | readonly Keyframe<string>[];
      font?: FontName | readonly Keyframe<FontName>[];
      size?: number | readonly Keyframe<number>[];
      fontWidth?: number | readonly Keyframe<number>[];
      boldness?: number | readonly Keyframe<number>[];
      obliqueness?: number | readonly Keyframe<number>[];
      // I have mixed feelings on the complicated type definition.
      // It is exactly what it needs to be, and it avoids any duplicated code or namespace pollution.
      // But it is long and complicated.
      // Final thoughts:  It was only complicated the first time.
      // You could clone this any number of times with different classes and properties.
      alignmentSchedule?: Parameters<
        TextComponent["alignmentSchedule"]["set"]
      >[0];
    } = {},
  ) {
    super(initialValues.description ?? "Text");
    if (initialValues.minDuration !== undefined) {
      this.minDurationScalar.value = initialValues.minDuration;
    }
    this.schedules.push(
      this.colorSchedule,
      this.rectSchedule,
      this.textSchedule,
      this.fontSchedule,
      this.sizeSchedule,
      this.fontWidthSchedule,
      this.boldnessSchedule,
      this.obliquenessSchedule,
      this.alignmentSchedule,
    );
    if (initialValues.color !== undefined) {
      this.colorSchedule.set(initialValues.color);
    }
    if (initialValues.rect !== undefined) {
      this.rectSchedule.set(initialValues.rect);
    }
    if (initialValues.text !== undefined) {
      this.textSchedule.set(initialValues.text);
    }
    if (initialValues.font !== undefined) {
      this.fontSchedule.set(initialValues.font);
    }
    if (initialValues.size !== undefined) {
      this.sizeSchedule.set(initialValues.size);
    }
    if (initialValues.fontWidth !== undefined) {
      this.fontWidthSchedule.set(initialValues.fontWidth);
    }
    if (initialValues.boldness !== undefined) {
      this.boldnessSchedule.set(initialValues.boldness);
    }
    if (initialValues.obliqueness !== undefined) {
      this.obliquenessSchedule.set(initialValues.obliqueness);
    }
    if (initialValues.alignmentSchedule !== undefined) {
      this.alignmentSchedule.set(initialValues.alignmentSchedule);
    }
  }
  /**
   * Characters in Text that Font can't draw.  They're left out, so they never
   * reach the canvas.  For the Visual Editor's status.
   *
   * Checked over the whole timeline:  at every keyframe of Text and of Font.
   */
  missingCharacters(): MissingCharacters[] {
    const times = [
      ...this.textSchedule.schedule,
      ...this.fontSchedule.schedule,
    ].map(({ time }) => time);
    return checkCharacters(times, (timeInMs) => [
      {
        text: this.textSchedule.at(timeInMs),
        fontName: this.fontSchedule.at(timeInMs),
      },
    ]);
  }
  #cachedFont: undefined | CachedFont;
  #cachedPath:
    | undefined
    | {
        readonly cachedFont: CachedFont;
        readonly width: number;
        readonly text: string;
        readonly alignment: TextComponent["alignmentSchedule"]["choices"][0];
        readonly path: Path2D;
      };
  override show(options: ShowOptions) {
    const { context, timeInMs } = options;
    const color = this.colorSchedule.at(timeInMs);
    const rect = this.rectSchedule.at(timeInMs);
    const text = this.textSchedule.at(timeInMs);
    const fontName = this.fontSchedule.at(timeInMs);
    // 0 or less can't be drawn.  Too small to see is the closest thing.
    const size = Math.max(MIN_FONT_SIZE, this.sizeSchedule.at(timeInMs) || 0);
    // 0 or less can't be drawn.  As thin as it goes is the closest thing.
    const fontWidth = Math.max(
      MIN_FONT_WIDTH,
      this.fontWidthSchedule.at(timeInMs) || 0,
    );
    const boldness = this.boldnessSchedule.at(timeInMs);
    const obliqueness = this.obliquenessSchedule.at(timeInMs);
    const alignment = this.alignmentSchedule.at(timeInMs);
    context.strokeStyle = color;
    if (
      !this.#cachedFont ||
      this.#cachedFont.fontName != fontName ||
      this.#cachedFont.size != size ||
      this.#cachedFont.fontWidth != fontWidth ||
      this.#cachedFont.boldness != boldness ||
      this.#cachedFont.obliqueness != obliqueness
    ) {
      const font = makeFontByName(fontName, {
        size,
        width: fontWidth,
        boldness,
        obliqueness,
      });
      this.#cachedFont = {
        font,
        fontName,
        size,
        fontWidth,
        boldness,
        obliqueness,
      };
    }
    if (
      !this.#cachedPath ||
      this.#cachedPath.cachedFont != this.#cachedFont ||
      this.#cachedPath.width != rect.width ||
      this.#cachedPath.text != text ||
      this.#cachedPath.alignment != alignment
    ) {
      const path = ParagraphLayout.singlePathShape({
        font: this.#cachedFont.font,
        text,
        width: rect.width,
        alignment,
      }).canvasPath;
      const cachedFont = this.#cachedFont;
      this.#cachedPath = {
        cachedFont,
        path,
        text,
        width: rect.width,
        alignment,
      };
    }
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = this.#cachedFont.font.strokeWidth;
    const matrix = context.getTransform();
    context.translate(rect.x, rect.y);
    context.stroke(this.#cachedPath.path);
    context.setTransform(matrix);
  }
}
