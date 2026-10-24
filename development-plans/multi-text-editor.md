# Multi Text Editor

The multi text component is very powerful but sometimes hard to use.
I propose a simple tool to be added to the Visual Editor for this component.
The user should be able to type text more or less like any plain text editor.
And we insert HTML `<select>` tags to change the formats.

This is based on 

See https://github.com/TradeIdeasPhilip/format-editor-prototype for my prototype for this editor.
This should be added to the Visual Editor for the Multi Text Component.

Note that the editor has no sense of a schedule.
Proposal:
Create and delete Text Span Components as needed to match the editor.
Set all text span components to have exactly the text copied from the shared input.
Set all schedules to have a time of 0 and just that text value, like we normally do for schedules with just one item.

## More

When we change the multi text, if we are destroying any interesting objects, a text span with any entries on any schedule properties at a time other than 0, then check if there are any unsaved changes.  If so we should force a save now, so those special properties **will** be in the undo history.  I know we accelerate the process of saving on other places, like on page exit or before opening the "load" dialog, but we might have to expose things that were internal.