# Smarter Initial Position

When you insert a new component, call a constructor and keep all of the new component's default properties.

This doesn't work well for "destination rect" and similar properties.
These should be tagged somehow so they can select an appropriate starting place.

This doesn't change the saving routine.
If the value is different from the default, regardless of why, its value will be changed.

Back in the day Windows had a standard way of creating new windows.
You could ask for something specific in the constructor, but the normal option was:

> When you pass CW_USEDEFAULT, Windows uses a diagonal cascade algorithm based on title-bar metrics, combined with monitor-selection rules and screen-edge bounds.

Similar when you paste new items into a vector graphics program.
(Should we be worried about paste, too?)
Items would typically be offset from each other, often making a diagonal line if you made several duplicates of the same object.

It can be confusing when a lot of similar items are on top of each other (same in every way but the z-order).
And it can be annoying when new items are drawn off screen.
The latter happens a lot when components are created and tested in a project with one aspect ratio, then used in a project with a different aspect ratio.

Alternatives include buttons or hotkeys to quickly move the item into view.
