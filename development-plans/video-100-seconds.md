# A Video: canvas-recorder-lib in 100 Seconds

A short video that says what the library is, in the style of the "in 100 seconds" videos.

**Status (2026-11-15):** A first script, written 2026-11-14. Nothing recorded, and no other work on it yet.
The user: "I think it will come out really well and I want to do it right."
The script was only in a chat until today. It's saved here so it isn't lost.

## The script (first draft)

For YouTube viewers who might use the library, plus friends and family who want to know what the user has been building.
About 360 words, roughly 1:50 at a brisk pace. Cut the two paragraphs marked _(optional)_ for a true 100 seconds.

> **canvas-recorder-lib:** a TypeScript library for making math animation videos, where your code and a visual editor work on the same video, at the same time.
>
> It was created in 2025 by me, a programmer who sat down to make one math video and stood up a year later with a video editor.
>
> _(optional)_ Most tools make you pick a side. A video editor gives you a timeline, but ask it for a Fourier series and it just stares at you. Code tools like Manim can draw anything, but nudging a label usually means edit, render, and wait.
>
> Here, you get both. Everything on screen is a Showable: a description, a duration, and a show function that draws one instant of time on an HTML canvas. Play them in series or in parallel, and you have a video.
>
> Change your code, and the page reloads before you can reach for your coffee. Then open the Visual Editor. Drag things around the canvas, set keyframes on a timeline, drop in video clips, and record your voiceover right there. A speech model in your browser finds every word, so you can time the animation to what you said.
>
> The editor only saves what's different from your code, so the two never fight over who's in charge.
>
> _(optional)_ It also packs a math toolbox: fonts that write themselves like handwriting, Fourier series, and crisp vector paths that survive YouTube's compression.
>
> When it looks right, hit record. No screen capture: the library draws every frame, in 4K at 60 frames per second, and saves an MP4 right in the browser. A slow computer just takes longer. It never drops a frame.
>
> Not a programmer? The Simple Video Editor is the same tool with an empty project. Open a link, add clips, text and callouts, and save your video. Nothing to install.
>
> It's still version zero-point-something, built by one guy, mostly for one guy. But it's free, it's on npm, and it has already made real videos.
>
> This has been canvas-recorder-lib in 100 seconds. Hit the like button and subscribe if you want to see more. Thanks for watching, and I will see you in the next one.

## Lines to check before recording

- **"Created in 2025":** canvas-recorder's first commit is 2025-12-20, so "a year later" is really about eleven months.
  - Philip's thoughts: Good enough! This project has evolved continuously for a while, so there's no reason to be more specific.
- **The Manim line:** it's the common complaint about Manim, hedged with "usually". Cut the name to avoid pointing at anyone.
- **"Reloads before you can reach for your coffee":** true for the page, but the editor doesn't yet put its GUI state back after a reload ([priorities.md](../priorities.md), under Features).
  - Philip's thoughts: It's pretty close. We've been focused on cleaning up the worst offenders first. And the current plan admits that we may never get all of the cases.
- **"Version zero-point-something":** change it if 1.0 ships first.

## The pictures

**"…ask it for a Fourier series and it just stares at you"** (the user, 2026-11-15):

- **The drawing:** a simple line drawing of a face with a blank stare. It's `face.html` in 7-pointed-star.
- **A first animation exists:** a Fourier series that goes from nothing to the face, made with that project's invisible bridges. "That version was good but rushed."
- **The timing to aim for:** the animation is big on the screen. On the words "Fourier series" you see a lot of circles. On "stares at you" you see the finished blank stare.
- "I think we can tweak that animation and make it perfect."
- The daily 7-pointed-star videos are the test bed for it.

**The rest:** a shot list that matches each paragraph to a showcase slide or an editor action. Offered, not written.
