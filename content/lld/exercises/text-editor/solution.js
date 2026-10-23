// A command knows how to do and undo itself. The editor only keeps two stacks of them.
class TypeCommand {
  constructor(text) {
    this.text = text;
  }
  do(doc) {
    doc.text += this.text;
  }
  undo(doc) {
    doc.text = doc.text.slice(0, doc.text.length - this.text.length);
  }
}

class DeleteCommand {
  constructor(count) {
    this.count = count;
    this.removed = ""; // remembered so that undo restores exactly what was taken
  }
  do(doc) {
    const keep = Math.max(0, doc.text.length - this.count);
    this.removed = doc.text.slice(keep);
    doc.text = doc.text.slice(0, keep);
  }
  undo(doc) {
    doc.text += this.removed;
  }
}

// A group of commands is itself a command (Composite): undo runs the children backwards.
class MacroCommand {
  constructor() {
    this.children = [];
  }
  do(doc) {
    for (const c of this.children) c.do(doc);
  }
  undo(doc) {
    for (let i = this.children.length - 1; i >= 0; i--) this.children[i].undo(doc);
  }
}

class Editor {
  constructor() {
    this.doc = { text: "" };
    this.undoStack = [];
    this.redoStack = [];
    this.group = null; // the open outermost macro, if any
    this.depth = 0; // how many beginGroup calls are still open
  }

  // Runs a command now and files it: into the open group, or straight into history.
  run(cmd) {
    cmd.do(this.doc);
    if (this.group) this.group.children.push(cmd);
    else this.commit(cmd);
  }

  commit(cmd) {
    this.undoStack.push(cmd);
    this.redoStack = []; // a new action ends the redo branch
  }

  type(text) {
    if (text.length === 0) return 0;
    this.run(new TypeCommand(text));
    return text.length;
  }

  delete(count) {
    if (count < 1 || this.doc.text.length === 0) return 0;
    const cmd = new DeleteCommand(count);
    this.run(cmd);
    return cmd.removed.length;
  }

  beginGroup() {
    if (this.depth++ === 0) this.group = new MacroCommand();
  }

  endGroup() {
    if (this.depth === 0) return false;
    if (--this.depth === 0) {
      const macro = this.group;
      this.group = null;
      if (macro.children.length > 0) this.commit(macro); // an empty group is not an action
    }
    return true;
  }

  canUndo() {
    return this.depth === 0 && this.undoStack.length > 0;
  }

  canRedo() {
    return this.depth === 0 && this.redoStack.length > 0;
  }

  undo() {
    if (!this.canUndo()) return false;
    const cmd = this.undoStack.pop();
    cmd.undo(this.doc);
    this.redoStack.push(cmd);
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    const cmd = this.redoStack.pop();
    cmd.do(this.doc);
    this.undoStack.push(cmd);
    return true;
  }

  text() {
    return this.doc.text;
  }
}
