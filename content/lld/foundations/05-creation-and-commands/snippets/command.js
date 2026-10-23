export class Doc {
  text = '';
}

// A command knows how to do and undo itself. It keeps what it needs to reverse the change.
export class Type {
  constructor(doc, text) { this.doc = doc; this.text = text; }
  do() { this.doc.text += this.text; }
  undo() { this.doc.text = this.doc.text.slice(0, this.doc.text.length - this.text.length); }
}

export class Erase {
  constructor(doc, count) { this.doc = doc; this.count = count; }
  do() {
    const keep = Math.max(0, this.doc.text.length - this.count);
    this.removed = this.doc.text.slice(keep); // may be fewer than count characters
    this.doc.text = this.doc.text.slice(0, keep);
  }
  undo() { this.doc.text += this.removed; }
}

// Two stacks. History never looks inside a command, so a new kind of edit needs no change here.
export class History {
  #done = [];
  #undone = [];

  run(cmd) {
    cmd.do();
    this.#done.push(cmd);
    this.#undone.length = 0; // a new edit ends the old future
  }

  undo() {
    const cmd = this.#done.pop();
    if (!cmd) return false;
    cmd.undo();
    this.#undone.push(cmd);
    return true;
  }

  redo() {
    const cmd = this.#undone.pop();
    if (!cmd) return false;
    cmd.do();
    this.#done.push(cmd);
    return true;
  }
}
