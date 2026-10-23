Build the core of a **text editor with undo and redo**. Every edit is an action that can be reversed, and a user can also bundle several edits into one step, the way a "replace all" or a macro is undone with a single Ctrl+Z. This is the Command pattern: each action is an object that knows how to do and undo itself, so the editor needs no special case per kind of edit.

Implement the class `Editor`. It starts with the empty text `""` and an empty history. Text is plain ASCII, and the cursor is always at the end.

**Editing**

- `type(text)`: appends `text`. Returns the number of characters typed. Typing `""` does nothing, returns 0 and is not recorded.
- `delete(count)`: removes up to `count` characters from the end. Deleting more than exist removes what exists. Returns the number of characters actually removed. If `count` is below 1 or the text is empty, nothing happens, it returns 0 and it is not recorded.

**History**

- `undo()`: reverses the most recent recorded action and returns `true`, or does nothing and returns `false` when there is nothing to undo. Undoing a `delete` restores exactly the characters that delete removed, which is not always `count` (see the note).
- `redo()`: re-applies the most recently undone action and returns `true`, or returns `false` when there is nothing to redo.
- `canUndo()` and `canRedo()`: whether `undo()` or `redo()` would do something.
- `text()`: the current text.
- **A new action clears the redo history.** Recording any action (a `type` or `delete` that changes something, or a closed group that contains something) discards everything that could have been redone.

**Groups**

- `beginGroup()`: starts a group. Everything done until the matching `endGroup()` becomes **one** undo step. It returns nothing.
- `endGroup()`: ends the innermost open group. Returns `false` if no group is open, otherwise `true`.
- Groups nest, and a nested group collapses into the **outermost** one: only the `endGroup()` that closes the outermost group records the step.
- A group that ends up with no recorded actions (nothing inside, or only no-op actions such as `type("")`) is **not** recorded, and does not clear the redo history.
- Inside an open group the edits apply to `text()` immediately, but the history is frozen: `undo()` and `redo()` return `false` without doing anything, and `canUndo()` and `canRedo()` return `false`. A group that is never closed is never recorded.
- Undoing a group reverses its actions in the opposite order. Redoing it replays them in the original order.

**Notes**

- Clamping example: after `type("ab")`, `delete(5)` returns `2` and leaves `""`. Undo restores `"ab"` (the 2 characters removed), not 5 characters.
- A recorded action is exactly one undo step, so `type("hello")` is undone in one go, not letter by letter.
- There are no exceptions: every call returns one of the values above.
