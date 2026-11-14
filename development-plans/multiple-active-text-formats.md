# Multiple Active Text Formats

We want a way to draw shadows and halos and outlines and similar effects in a MultiTextComponent.
Those require stroking the same path multiple times with different formatting options.

The concept is simple enough and I've done it enough times with SVG and with TypeScript and canvas.
The only thing holding this up was the user interface.
I finally know what I want (mostly).

## New User Interface

Text Format Objects can have direct children which are also Text Format Objects.
Only these two levels.†

A text span will call out a top level format object by name, like always.
The first part of the process only uses that format object.
Creating the fonts and paths continue to work as they do today.
But when it comes to stroking the path, we do that once per formatter, and each formatter applies its own formatting.

Notice that the font's boldness is used in two places.
The first time is used to create the font's path.
The second time is used to stroke it.
The first will only come from the main format.
But each stroke can use whatever line width it choses.

Can a second level formatting object have a name?
Then a text span could reach in and access just that.
It might make sense because it could promote reuse.
Some spans use one format or another.
And some spans use both formats.
Be careful or the case where a lot of formats are all added with the conflicting name of "", but I'm not yet sure how.

† If we allow the inner formatters to have names, then is it worth building an arbitrary tree?
I said exactly two levels because I assumed that would make implementation much easier and I wasn't sure of the value it would offer.

Need to decide!

Maybe we need a simpler object for the children, something without the unused properties like the font size.
These would not need names.

## New Properties

### Offset

We need an offset property.
x and y.
Presumably grouped into one property, because I think that's how it will be used, see my thoughts on the editor, where we change x and y together.

Is the offset relative to the parent?
It would take more effort, but if we were ever going to do this, it would be nice not to break the older code.

I want the ability to drag my mouse across the canvas (as one way) to change the offset.
I'm not sure what that user interface should look like.
We typically add a marker to the screen to be dragged, but I'm not sure where to put the marker!

The default value for this property, of course, is (0, 0).

### Z

When the MultiTextComponent is ready to draw the paths, it needs to group and sort them.
All of the shadows should be drawn before any of the main text.

z defaults to 0, with everything in one group.
Withing a group I think we need to draw the spans in the order that they appear in their parent.

Presumably z is a double and we can interpolate on it.
That's pretty standard.

Is z relative to its parent?
A complete tree makes things very powerful, but there are a lot of things to do to make it work.

My plan is that z only applies within a multi text component.

## Multiple Text effects

Can / should each one get to pick its own text effect (e.g. handwriting effect).
Yes!

The requested text effect for each format defaults to "".
The default name for a new text effect defaults to "".

If a formatter requests "" and a text effect exists with the the name "", use it.
If a formatter requests "" and no such text effect exists, use the unmodified path.
That goes with the simplest case where you add exactly zero or one text effects to a multi text: All text will use the text effect if it exists.
And existing components can be read in with "" used for the missing name fields.
But it's easy enough to add and use more text effects.
Just use values other than "" for the text effect name!

Any duplicate or missing names should generate a mild warning.
That's the sort of thing that will inevitably come up temporarily when making normal changes.
(That's come up a lot recently.
At some time we should probably have a uniform way to report problems.
Maybe something that matches a video's tree structure.
Just thinking, for the moment, maybe this needs its own file.)

## Use Case

https://github.com/TradeIdeasPhilip/handwriting-effect
This is probably the most popular of my fun git projects!
This allows the user to create multiple layers, each with a handwriting effect on its own schedule.

It will be a huge milestone when this project can do all of that.

## Related

Notice [paint-layers.md](./from-previous-project/paint-layers.md) which was a previous look at some overlapping issues.
These two documents should probably be merged.
