import { Doc, Type, Erase, History } from './command.js'; // @hide
import { Macro } from './macro.js'; // @hide
// Change the edits, or add a second Macro, and watch what one undo does.
const doc = new Doc();
const history = new History();

history.run(new Type(doc, 'hello world'));
history.run(new Macro([new Erase(doc, 5), new Type(doc, 'there')]));
console.log(doc.text);               // hello there

history.undo();
console.log(doc.text);               // hello world  (the whole macro, in one step)

history.undo();
console.log(JSON.stringify(doc.text)); // ""

history.redo();
console.log(doc.text);               // hello world

history.run(new Type(doc, '!'));
console.log(history.redo());         // false: a new edit clears the redo stack
