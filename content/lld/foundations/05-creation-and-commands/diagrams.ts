import type { ClassSpec } from "@/components/diagram/types";

export const commandDesign: ClassSpec = {
  id: "command-undo-design",
  title: "Undo and redo with commands",
  description:
    "An Editor owns a Doc and a History. Type and Erase are commands that implement Command, so History can run, undo and redo any of them. Macro is also a Command and wraps many, so a group of edits undoes in one step.",
  classes: [
    { id: "editor", name: "Editor", col: 0, row: 0, fields: ["doc: Doc"], methods: ["type(text)", "erase(count)", "undo()", "redo()"] },
    { id: "history", name: "History", col: 1, row: 0, fields: ["done: Command[]", "undone: Command[]"], methods: ["run(cmd)", "undo()", "redo()"] },
    { id: "doc", name: "Doc", col: 0, row: 1, fields: ["text: string"] },
    { id: "command", name: "Command", col: 1, row: 1, stereotype: "interface", methods: ["do()", "undo()"] },
    { id: "type", name: "Type", col: 0, row: 2, fields: ["doc: Doc", "text: string"], methods: ["do()", "undo()"] },
    { id: "erase", name: "Erase", col: 1, row: 2, fields: ["doc: Doc", "count: number", "removed: string"], methods: ["do()", "undo()"] },
    { id: "macro", name: "Macro", col: 2, row: 2, fields: ["commands: Command[]"], methods: ["do()", "undo() in reverse"] },
  ],
  relations: [
    { from: "editor", to: "history", type: "composition" },
    { from: "editor", to: "doc", type: "composition" },
    { from: "history", to: "command", type: "aggregation", label: "done, undone" },
    { from: "type", to: "command", type: "implements" },
    { from: "erase", to: "command", type: "implements" },
    { from: "macro", to: "command", type: "implements", label: "wraps many" },
    { from: "type", to: "doc", type: "dependency", label: "edits" },
    { from: "erase", to: "doc", type: "dependency", label: "edits" },
  ],
  stages: [
    {
      title: "The naive editor",
      note: "The editor changes the Doc directly. Undo has nowhere to live, so the usual patch is a full copy of the text before every edit: easy to write, heavy on memory, and redo needs a second pile of copies.",
      add: ["editor", "doc"],
    },
    {
      title: "An action becomes an object",
      note: "Type and Erase each know how to do and undo themselves, and Erase remembers what it removed. An edit is now a value you can keep, replay or reverse.",
      add: ["command", "type", "erase"],
    },
    {
      title: "History keeps two stacks",
      note: "History runs a command, pushes it on done, and moves it to undone on undo. It never looks inside a command, so a new kind of edit needs no change here.",
      add: ["history"],
    },
    {
      title: "Group steps into one undo",
      note: "Macro is a Command that holds other commands: do in order, undo in reverse. A replace-all or a paste-and-format becomes one entry on the stack with no change to History.",
      add: ["macro"],
    },
  ],
};
