# Several commands that undo as one. It is a command too, so History needs no change.
class Macro:
    def __init__(self, commands):
        self.commands = commands

    def do(self):
        for cmd in self.commands:
            cmd.do()

    # Reverse order matters: the last change sits on top of the earlier ones.
    def undo(self):
        for cmd in reversed(self.commands):
            cmd.undo()
