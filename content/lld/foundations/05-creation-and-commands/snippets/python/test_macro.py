import unittest

from command import Doc, Erase, History, Type
from macro import Macro


class Step:
    def __init__(self, name, log):
        self.name, self.log = name, log

    def do(self):
        self.log.append(f"do {self.name}")

    def undo(self):
        self.log.append(f"undo {self.name}")


class MacroTest(unittest.TestCase):
    def test_a_macro_is_one_undo_step(self):
        doc, history = Doc(), History()
        history.run(Type(doc, "hello world"))
        history.run(Macro([Erase(doc, 5), Type(doc, "there")]))
        self.assertEqual(doc.text, "hello there")
        history.undo()
        self.assertEqual(doc.text, "hello world")
        history.redo()
        self.assertEqual(doc.text, "hello there")

    def test_undo_runs_the_steps_in_reverse_order(self):
        log = []
        macro = Macro([Step("a", log), Step("b", log), Step("c", log)])
        macro.do()
        macro.undo()
        self.assertEqual(log, ["do a", "do b", "do c", "undo c", "undo b", "undo a"])


if __name__ == "__main__":
    unittest.main()
