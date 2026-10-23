// Several commands that undo as one. It is a command too, so History needs no change.
export class Macro {
  constructor(commands) { this.commands = commands; }

  do() {
    for (const cmd of this.commands) cmd.do();
  }

  // Reverse order matters: the last change sits on top of the earlier ones.
  undo() {
    for (const cmd of [...this.commands].reverse()) cmd.undo();
  }
}
