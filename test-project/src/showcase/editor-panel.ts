import { NumberScheduleInfo } from "canvas-recorder-lib/src/schedule-helper";
import type {
  EditorPanel,
  EditorPanelAPI,
  ShowOptions,
  Showable,
} from "canvas-recorder-lib/src/showable";
import { ComponentWithFixedDuration } from "canvas-recorder-lib/src/slide-components/fixed-duration";
import { FourierComponent } from "canvas-recorder-lib/src/slide-components/fourier";

//
// Your own panels in the Visual Editor, two ways:
//
// * A component's own `editorPanel`:  the circle.
// * `canvasRecorder.addEditorPanel()`, for components you didn't write:
//   every Fourier gets a list of its terms.  showcase.ts adds it.
//
// Select the circle or the Fourier in the Visual Editor to see the panels,
// bottom right, with the properties.

// MARK: Shared pieces

/** A fieldset in the same style as the library's own panels. */
function panelFieldset(title: string): HTMLFieldSetElement {
  const fieldset = document.createElement("fieldset");
  fieldset.style.cssText = "border-color:#6a7fae;margin-bottom:0.4em";
  const legend = document.createElement("legend");
  legend.textContent = title;
  fieldset.append(legend);
  return fieldset;
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const result = document.createElement("button");
  result.textContent = text;
  result.addEventListener("click", onClick);
  return result;
}

// MARK: A component's own panel

/** A circle that grows.  Its panel shows its own time and changes its Radius. */
class PanelCircle implements Showable {
  readonly description = "Circle with a panel";
  readonly duration = 6_000;
  readonly radiusSchedule = new NumberScheduleInfo("Radius", [
    { time: 0, value: 1 },
    { time: 6_000, value: 2.5 },
  ]);
  readonly schedules = [this.radiusSchedule];
  /** One panel object for the life of this component.  No DOM until start(). */
  readonly editorPanel: EditorPanel = circlePanel(this);
  show({ context, timeInMs }: ShowOptions) {
    context.beginPath();
    context.arc(8, 4.5, this.radiusSchedule.at(timeInMs), 0, 2 * Math.PI);
    context.lineWidth = 0.08;
    context.strokeStyle = "orange";
    context.stroke();
  }
}

function circlePanel(circle: PanelCircle): EditorPanel {
  let editor: EditorPanelAPI | undefined;
  let status: HTMLDivElement | undefined;
  /** Not a property, so the panel object remembers it across rebuilds, but not across a reload. */
  let presses = 0;
  function refresh() {
    if (!editor || !status) return;
    const ms = editor.getTimeMs();
    status.textContent =
      `This circle's own time:  ${(ms / 1000).toFixed(2)} s.  ` +
      `Radius:  ${circle.radiusSchedule.at(ms).toFixed(3)}.  ` +
      `× 1.1 pressed ${presses} time${presses === 1 ? "" : "s"}.`;
  }
  return {
    start(api) {
      editor = api;
      const fieldset = panelFieldset("Circle (its own editorPanel)");
      status = document.createElement("div");
      status.style.cssText = "font-size:0.9em;margin-bottom:0.3em";
      fieldset.append(
        status,
        button("Radius × 1.1", () => {
          for (const keyframe of circle.radiusSchedule.schedule) {
            keyframe.value *= 1.1;
          }
          presses++;
          // Saves, redraws, and rebuilds the properties, which restarts this panel.
          api.propertyChanged(circle.radiusSchedule);
        }),
        " ",
        button("Go to its start", () => api.seek(0)),
      );
      refresh();
      return fieldset;
    },
    suspend() {
      editor = undefined;
      status = undefined;
    },
    update: refresh,
    timeChanged: refresh,
  };
}

// MARK: A panel for every Fourier

/** How many terms the list shows. */
const TERMS_SHOWN = 24;

/**
 * For `canvasRecorder.addEditorPanel()`:  a list of the terms of each Fourier's
 * source, in the order Term Groups numbers them.
 */
export function editorPanelForFourier(
  component: Showable,
): EditorPanel | undefined {
  if (!(component instanceof FourierComponent)) return undefined;
  const fourier = component;
  let editor: EditorPanelAPI | undefined;
  let body: HTMLDivElement | undefined;
  /** The source the list shows, so it's only rebuilt when that changes. */
  let shownSource: string | undefined;
  function refresh() {
    if (!editor || !body) return;
    const name = fourier.sourceSchedule.at(editor.getTimeMs());
    if (name === shownSource) return;
    shownSource = name;
    const result = fourier.termsFor(name);
    if (typeof result === "string") {
      body.textContent = result;
      return;
    }
    const table = document.createElement("table");
    table.style.cssText = "font-size:0.85em;border-collapse:collapse";
    const row = (cells: string[], header = false) => {
      const tr = table.insertRow();
      for (const text of cells) {
        const cell = document.createElement(header ? "th" : "td");
        cell.textContent = text;
        cell.style.cssText = "padding:0 0.6em;text-align:right";
        tr.append(cell);
      }
    };
    row(["Term", "Frequency", "Amplitude"], true);
    result.terms.slice(0, TERMS_SHOWN).forEach((term, index) => {
      row([`${index}`, `${term.frequency}`, term.amplitude.toFixed(4)]);
    });
    const caption = document.createElement("div");
    caption.textContent = `"${name}":  ${result.terms.length} terms.  Term is the number Term Groups uses.`;
    body.replaceChildren(caption, table);
  }
  return {
    start(api) {
      editor = api;
      shownSource = undefined;
      const fieldset = panelFieldset(
        "Terms (from canvasRecorder.addEditorPanel)",
      );
      body = document.createElement("div");
      body.style.fontSize = "0.9em";
      fieldset.append(body);
      refresh();
      return fieldset;
    },
    suspend() {
      editor = undefined;
      body = undefined;
    },
    update: refresh,
    // Source can change at a keyframe.
    timeChanged: refresh,
  };
}

// MARK: The slide

/** The "Editor Panels" slide. */
export function editorPanels(): Showable {
  const scene = new ComponentWithFixedDuration("Editor Panels", 10_000);
  // Starts 2 s in, so its own time isn't the slide's.
  scene.addFixed({
    child: new PanelCircle(),
    padding: { initialTime: 2_000 },
  });
  scene.addFixed({
    child: new FourierComponent({
      description: "Fourier with a terms panel",
      source: "Star",
      termGroups: "0, 1, 2, 3-9, 10-1022",
      step: [
        { time: 0, value: 0 },
        { time: 9_000, value: 5 },
      ],
      destRect: { x: 0.5, y: 0.5, width: 5, height: 5 },
      strokeColor: "white",
      lineWidth: 0.04,
      minDuration: 0,
    }),
  });
  return scene;
}
