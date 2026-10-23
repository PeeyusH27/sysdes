# A command knows how to do and undo itself. The editor only keeps two stacks of them.
class TypeCommand:
    def __init__(self, text):
        self.text = text

    def do(self, doc):
        doc["text"] += self.text

    def undo(self, doc):
        doc["text"] = doc["text"][: len(doc["text"]) - len(self.text)]


class DeleteCommand:
    def __init__(self, count):
        self.count = count
        self.removed = ""  # remembered so that undo restores exactly what was taken

    def do(self, doc):
        keep = max(0, len(doc["text"]) - self.count)
        self.removed = doc["text"][keep:]
        doc["text"] = doc["text"][:keep]

    def undo(self, doc):
        doc["text"] += self.removed


# A group of commands is itself a command (Composite): undo runs the children backwards.
class MacroCommand:
    def __init__(self):
        self.children = []

    def do(self, doc):
        for c in self.children:
            c.do(doc)

    def undo(self, doc):
        for c in reversed(self.children):
            c.undo(doc)


class Editor:
    def __init__(self):
        self.doc = {"text": ""}
        self.undo_stack = []
        self.redo_stack = []
        self.group = None  # the open outermost macro, if any
        self.depth = 0  # how many begin_group calls are still open

    # Runs a command now and files it: into the open group, or straight into history.
    def run(self, cmd):
        cmd.do(self.doc)
        if self.group is not None:
            self.group.children.append(cmd)
        else:
            self.commit(cmd)

    def commit(self, cmd):
        self.undo_stack.append(cmd)
        self.redo_stack = []  # a new action ends the redo branch

    def type(self, text):
        if len(text) == 0:
            return 0
        self.run(TypeCommand(text))
        return len(text)

    def delete(self, count):
        if count < 1 or len(self.doc["text"]) == 0:
            return 0
        cmd = DeleteCommand(count)
        self.run(cmd)
        return len(cmd.removed)

    def begin_group(self):
        if self.depth == 0:
            self.group = MacroCommand()
        self.depth += 1

    def end_group(self):
        if self.depth == 0:
            return False
        self.depth -= 1
        if self.depth == 0:
            macro = self.group
            self.group = None
            if macro.children:  # an empty group is not an action
                self.commit(macro)
        return True

    def can_undo(self):
        return self.depth == 0 and len(self.undo_stack) > 0

    def can_redo(self):
        return self.depth == 0 and len(self.redo_stack) > 0

    def undo(self):
        if not self.can_undo():
            return False
        cmd = self.undo_stack.pop()
        cmd.undo(self.doc)
        self.redo_stack.append(cmd)
        return True

    def redo(self):
        if not self.can_redo():
            return False
        cmd = self.redo_stack.pop()
        cmd.do(self.doc)
        self.undo_stack.append(cmd)
        return True

    def text(self):
        return self.doc["text"]
