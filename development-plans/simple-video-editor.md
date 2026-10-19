# Simple Video Editor

I want a _very_ stripped down version of our main program.
It is aimed at someone editing video clips and adding standard text and callouts.
It is made to be used directly from github pages by a non programmer.
Any saves will be made locally, and never rolled back into the source code.

## Prerequisites

[loading-video-clips-from-local-files.md](./loading-video-clips-from-local-files.md) should be finished.
This is good for a lot of reasons.
But it's pretty much essential for the non programmer / person running from github pages.
And this main program would be a great way to test that feature.
We can do these all at once.

[configurable-video-size.md](./configurable-video-size.md) should also be finished.
The user will be in full control of the video, and have no access to TypeScript, so he will need these controls.
Again, this main program would be a great way to test that feature.
We can do these all at once.

## Defaults

2880 × 1800 pixels to match my M1 MacBook Air screen recordings.
That's my primary use for this project at the moment.
Let YouTube handle the resizing (when it first encodes) and the pillarboxing (when it displays).

16 × 10 for the internal dimensions.
That's how I usually hear it quoted.

## Use Case

I really don't need but a small fraction of the features CapCut or DaVinci Resolve offer.
But those are often unnecessarily confusing and annoying.
I wouldn't have created this whole library just for this one super simplified video editor.
But since we already have the pieces, why not publish the generic video editor?

My primary use case for the library remains videos like some5 with lots of typescript driven custom graphics and the [robot math video](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d) which was an interactive program that was adapted after the fact to make videos.

All use cases will benefit from custom features as they are added to the library.
