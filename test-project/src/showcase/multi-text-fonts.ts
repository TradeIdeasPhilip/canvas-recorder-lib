import { HandwritingEffectComponent } from "canvas-recorder-lib/src/slide-components/handwriting-effect";
import {
  MultiTextComponent,
  TextFormatComponent,
  TextSpanComponent,
} from "canvas-recorder-lib/src/slide-components/multi-text";
import { Showable } from "canvas-recorder-lib/src/showable";

import { bottomNote, slide, Stack, title } from "./multi-text-manual.ts";
import { caption, heightGuides, multiText } from "./multi-text-font-width.ts";

/**
 * The Font property:  Line Font, Futura L or Cursive, in any Text Format.  And what happens
 * to a character a font doesn't have.
 * @module
 */

const PANGRAM = "Sphinx of black quartz, judge my vow.";

// MARK: Fonts

/** The "Multi Text: Fonts" slide. */
export function multiTextFonts(): Showable {
  const LEFT = 0.6;
  const stack = new Stack(1.05, { x: LEFT, width: 14.8 });
  stack.note(
    "Every Text Format has a Font: Line Font, Futura L or Cursive. " +
      "Font Size, Font Width, Boldness, Obliqueness and the text effects work the same on all three.",
    { size: 0.25 },
  );
  const parts: Showable[] = [];
  const LABEL_WIDTH = 4.2;
  const ROW = 0.62;
  const SIZE = 0.36;
  const rows = [
    { label: "Line Font", format: { font: "Line Font" } },
    { label: "Futura L", format: { font: "Futura L" } },
    { label: "Cursive", format: { font: "Cursive" } },
    {
      label: "Boldness 2, Font Width 1.2",
      format: { font: "Cursive", boldness: 2, fontWidth: 1.2 },
    },
  ] as const;
  rows.forEach(({ label, format }, index) => {
    const y = stack.y + index * ROW;
    parts.push(caption(label, LEFT, y + 0.1, LABEL_WIDTH));
    parts.push(
      multiText([{ text: PANGRAM, format: { size: SIZE, ...format } }], {
        position: { x: LEFT + LABEL_WIDTH, y },
        widthMode: "unbounded",
        anchorX: "left",
      }).text,
    );
  });
  stack.skip(rows.length * ROW + 0.1);

  // MARK: Mixed
  stack.note(
    "Mixed on one line, in one Multi Text. They share a baseline and a capital top (dashed).",
    { size: 0.25, gap: 0.1 },
  );
  const mixed = multiText(
    [
      { text: "Mix ", format: { size: 0.42 } },
      { text: "Cursive", format: { size: 0.42, font: "Cursive", boldness: 2 } },
      { text: ", ", format: { size: 0.42 } },
      {
        text: "Futura L",
        format: { size: 0.42, font: "Futura L", boldness: 2 },
      },
      { text: " and the Line Font.", format: { size: 0.42 } },
    ],
    {
      position: { x: LEFT + 0.3, y: stack.y + 0.05 },
      widthMode: "unbounded",
      anchorX: "left",
    },
  );
  stack.skip(0.85);

  // MARK: Handwriting
  stack.note(
    "Cursive with a Handwriting Effect. Its letters join, so the pen rarely lifts.",
    { size: 0.25, gap: 0.1 },
  );
  const written = multiText(
    [
      {
        text: "Written by hand, one stroke at a time.",
        format: { size: 0.55, font: "Cursive", boldness: 2.5 },
      },
    ],
    {
      position: { x: LEFT + 0.3, y: stack.y + 0.05 },
      widthMode: "unbounded",
      anchorX: "left",
    },
  );
  written.text.addFixed({
    child: new HandwritingEffectComponent({
      progress: [
        { time: 500, value: 0 },
        { time: 7_000, value: 1 },
      ],
    }),
  });

  return slide("Multi Text: Fonts", [
    title("Multi Text: Fonts"),
    stack.parts,
    parts,
    heightGuides(mixed.text, mixed.formats[0]),
    mixed.text,
    written.text,
    bottomNote(
      "Boldness 1 is each font's own normal stroke. Futura L and Cursive were drawn for a thinner pen, " +
        "about half the Line Font's, so they look lighter at the same Boldness.",
      { color: "#6f6f6f", size: 0.25, x: LEFT, width: 14.8 },
    ),
  ]);
}

// MARK: Characters

/** The "Multi Text: Characters" slide. */
export function multiTextCharacters(): Showable {
  const LEFT = 0.6;
  const stack = new Stack(1.05, { x: LEFT, width: 14.8 });
  stack.note(
    "Each font has its own characters: the Line Font has 186, with Greek, arrows and math; " +
      "Futura L and Cursive, the 96 printable ASCII characters. A character the font doesn't have is left out.",
    { size: 0.25 },
  );
  const parts: Showable[] = [];
  const LABEL_WIDTH = 2.2;
  const TEXT = "π ≈ 3.14159, θ → 0, and don't forget ∞.";
  (["Line Font", "Cursive"] as const).forEach((font, index) => {
    const y = stack.y + index * 0.75;
    parts.push(caption(font, LEFT, y + 0.15, LABEL_WIDTH));
    parts.push(
      multiText([{ text: TEXT, format: { size: 0.45, font } }], {
        position: { x: LEFT + LABEL_WIDTH, y },
        widthMode: "unbounded",
        anchorX: "left",
      }).text,
    );
  });
  stack.skip(1.6);

  // MARK: Animated
  stack.note(
    "The check covers the whole timeline, not just the playhead. This text changes at 5 seconds, " +
      "and the warning lists ∑ from the start.",
    { size: 0.25, gap: 0.15 },
  );
  const animated = new MultiTextComponent({
    position: { x: LEFT + LABEL_WIDTH, y: stack.y },
    widthMode: "unbounded",
    anchorX: "left",
  });
  animated.addFixed({
    child: new TextFormatComponent({
      name: "sum",
      color: "white",
      size: 0.45,
      font: "Futura L",
    }),
  });
  // A Text Span child, not program text, so its keyframes show in the Visual Editor.
  animated.addFixed({
    child: new TextSpanComponent({
      style: "sum",
      content: [
        { time: 0, value: "1 + 2 + 3 + 4 = 10" },
        { time: 5_000, value: "∑ of 1 to 4 = 10" },
      ],
    }),
  });
  parts.push(caption("Futura L", LEFT, stack.y + 0.15, LABEL_WIDTH));
  stack.skip(0.85);

  // MARK: In the editor
  stack.note("In the Visual Editor:", {
    size: 0.3,
    color: "#c8c8c8",
    gap: 0.1,
  });
  stack.note(
    "Select one of these Multi Texts. Its Text Frame panel and its Edit Text dialog name each missing character.",
    { size: 0.25, gap: 0.1, x: LEFT + 0.3, width: 14.5 },
  );
  stack.note(
    "Select a Text Format or a Text, or open Edit Text. The Characters panel shows every character any font has, " +
      "with the ones its font doesn't have in gray. Click one to copy it. In Edit Text, a click types it.",
    { size: 0.25, gap: 0.1, x: LEFT + 0.3, width: 14.5 },
  );
  return slide("Multi Text: Characters", [
    title("Multi Text: Characters"),
    stack.parts,
    parts,
    animated,
  ]);
}
