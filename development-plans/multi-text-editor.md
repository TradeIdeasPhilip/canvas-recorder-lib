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