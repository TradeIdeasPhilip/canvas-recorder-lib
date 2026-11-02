import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { ease } from "canvas-recorder-lib/src/interpolate";
import { ScheduleInfo, Showable } from "canvas-recorder-lib/src/showable";
import { zipper } from "canvas-recorder-lib/src/zipper";
import { only, ReadOnlyRect } from "phil-lib/misc";

import { SingleImageComponent } from "canvas-recorder-lib/src/slide-components/image";
import imageUrl from "./Philip Smolen.jpeg";
import {
  DEFAULT_POST_ROLL_MS,
  DEFAULT_PRE_ROLL_MS,
  titleFont,
} from "./shared.ts";

/** The "<img src="...">" slide. */
export function imageSlide(): Showable {
  // This object is created in an older style.
  // The main showable does not expose any children.
  // I export very specific schedules from the children.
  // Newer code would typically use InParallelComponent as a base class.
  // InParallelComponent.addFixed() prevents the Visual Editor from deleting the children.
  // But it exposes all properties of the children.
  // That's a nice combination that works well.
  /**
   * Draw four images.
   */
  const description = '<img src="...">';
  /**
   * Information about the title.
   * We draw it as a rainbow just for fun.
   */
  const pathShape = ParagraphLayout.singlePathShape({
    text: description,
    font: titleFont,
    alignment: "center",
    width: 16,
  });
  const boundingBox = pathShape.getBBox();
  const path = pathShape.canvasPath;
  const schedules: ScheduleInfo[] = [];
  const components = new Map<string, Showable>();
  // Notice the three different ways this sample accesses images.
  // Peano and Fourier can be found in this project's public folder and are available at "./".
  // My picture can be found with the source files and can be accessed by an import statement.
  // And the plush Pi Creature can be found on an external web server.
  // The SingleImageComponent doesn't care; use whichever is most convenient to you.
  // However, be careful of CORS issues with some external web sites.
  components.set(
    "Peano",
    new SingleImageComponent({ url: "./Giuseppe_Peano.jpg" }),
  );
  components.set("Philip", new SingleImageComponent({ url: imageUrl }));
  components.set(
    "Pi Creature",
    new SingleImageComponent({
      url: "https://store.dftba.com/cdn/shop/files/3b1b-piplushieplump-site-2.jpg",
    }),
  );
  components.set(
    "Fourier",
    new SingleImageComponent({ url: "./Fourier2_-_restoration1.jpg" }),
  );
  // Copy the position schedule from each image to the top level object.
  components.forEach((component, name) => {
    const original = only(
      component.schedules!.filter(
        (originalSchedule) => originalSchedule.type == "rectangle",
      ),
    );
    // Rename the schedules so they don't conflict with each other.
    // Copy the name of the image component and use that as the name of the schedule.
    const visible: ScheduleInfo = { ...original, description: name };
    schedules.push(visible);
  });
  /**
   * Each picture shows up here briefly.
   */
  const middleRectangle: ReadOnlyRect = {
    x: 4.672377558479532,
    y: 1.473364400584795,
    width: 6.690880847953214,
    height: 6.861111111111109,
  };
  /**
   * Each picture spends most of its time here.
   * It moves into the the {@link middleRectangle} briefly then moves back here.
   */
  const smallRectangles: readonly ReadOnlyRect[] = [
    { x: 1, y: 1, width: 2.2007492690058483, height: 2.389117324561403 },
    {
      x: 0.7563048245614037,
      y: 5.650356359649122,
      width: 2.5989583333333326,
      height: 2.4562774122807016,
    },
    {
      x: 12.436403508771932,
      y: 0.9299616228070178,
      width: 2.3993055555555527,
      height: 3.285727339181287,
    },
    {
      x: 12.18704312865497,
      y: 5.207145467836257,
      width: 2.927448830409356,
      height: 3.1443713450292394,
    },
  ];
  let startTime = DEFAULT_PRE_ROLL_MS;
  // Create each image's schedule.
  // Each moves after the next.
  zipper([schedules, smallRectangles]).forEach(
    ([scheduleInfo, smallRectangle]) => {
      if (scheduleInfo.type != "rectangle") {
        throw new Error("wtf");
      }
      const schedule = scheduleInfo.schedule;
      schedule.length = 0;
      schedule.push({
        time: startTime,
        value: smallRectangle,
        easeAfter: ease,
      });
      schedule.push({ time: startTime + 1000, value: middleRectangle });
      schedule.push({
        time: startTime + 6000,
        value: middleRectangle,
        easeAfter: ease,
      });
      schedule.push({ time: startTime + 7000, value: smallRectangle });
      startTime += 6000;
    },
  );
  const scene: Showable = {
    description,
    schedules,
    duration: schedules.at(-1)!.schedule.at(-1)!.time + DEFAULT_POST_ROLL_MS,
    getFramePromises(
      timeInMs: number,
      set: Pick<Set<Promise<unknown>>, "add">,
    ): void {
      components.forEach((image) => {
        image.getFramePromises?.(timeInMs, set);
      });
    },
    show(options) {
      // Show the images.
      components.forEach((component) => component.show(options));
      // Show the title.
      const context = options.context;
      const gradient = context.createLinearGradient(
        boundingBox.x.min,
        boundingBox.y.max,
        boundingBox.x.max,
        boundingBox.y.max,
      );
      myRainbow.forEach((color, index, array) => {
        gradient.addColorStop(index / (array.length - 1), color);
      });
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = gradient;
      context.stroke(path);
    },
  };
  return scene;
}
