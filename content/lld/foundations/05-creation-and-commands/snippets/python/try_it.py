from command import Doc, Type, Erase, History  # @hide
from macro import Macro  # @hide
# Change the edits, or add a second Macro, and watch what one undo does.
doc = Doc()
history = History()

history.run(Type(doc, "hello world"))
history.run(Macro([Erase(doc, 5), Type(doc, "there")]))
print(doc.text)               # hello there

history.undo()
print(doc.text)               # hello world  (the whole macro, in one step)

history.undo()
print(repr(doc.text))         # ''

history.redo()
print(doc.text)               # hello world

history.run(Type(doc, "!"))
print(history.redo())         # False: a new edit clears the redo stack
