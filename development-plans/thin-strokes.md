# Thin Strokes

How thin a stroke can get before it stops looking consistent.

**Status (2026-11-13):** A note. Low priority.

- **What the user saw:** when lines get too thin, some look noticeably thinner than others, despite anti-aliasing.
- **Where:** this happens at a larger font size for the Hershey fonts (Futura L, Cursive), because Boldness 1 gives them about half the Line Font's stroke.
- **Where to look:** the showcase slide "Font Width: Futura L and Cursive" ([test-project/src/showcase/font-stretch.ts](../test-project/src/showcase/font-stretch.ts)), with the preview at about 40% of the screen.
- **Not a problem:** in a paragraph, the different default thicknesses look like switching between ordinary fonts.
