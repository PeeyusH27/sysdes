class Doc:
    def __init__(self):
        self.text = ""


# A command knows how to do and undo itself. It keeps what it needs to reverse the change.
class Type:
    def __init__(self, doc, text):
        self.doc = doc
        self.text = text

    def do(self):
        self.doc.text += self.text

    def undo(self):
        self.doc.text = self.doc.text[: len(self.doc.text) - len(self.text)]


class Erase:
    def __init__(self, doc, count):
        self.doc = doc
        self.count = count
        self.removed = ""

    def do(self):
        keep = max(0, len(self.doc.text) - self.count)
        self.removed = self.doc.text[keep:]  # may be fewer than count characters
        self.doc.text = self.doc.text[:keep]

    def undo(self):
        self.doc.text += self.removed


# Two stacks. History never looks inside a command, so a new kind of edit needs no change here.
class History:
    def __init__(self):
        self._done = []
        self._undone = []

    def run(self, cmd):
        cmd.do()
        self._done.append(cmd)
        self._undone.clear()  # a new edit ends the old future

    def undo(self):
        if not self._done:
            return False
        cmd = self._done.pop()
        cmd.undo()
        self._undone.append(cmd)
        return True

    def redo(self):
        if not self._undone:
            return False
        cmd = self._undone.pop()
        cmd.do()
        self._done.append(cmd)
        return True
