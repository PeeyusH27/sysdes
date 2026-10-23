import unittest

from command import Doc, Erase, History, Type


class CommandTest(unittest.TestCase):
    def test_undo_reverses_the_last_edit_and_redo_replays_it(self):
        doc, history = Doc(), History()
        history.run(Type(doc, "hello"))
        history.run(Type(doc, " world"))
        self.assertEqual(doc.text, "hello world")
        self.assertTrue(history.undo())
        self.assertEqual(doc.text, "hello")
        self.assertTrue(history.redo())
        self.assertEqual(doc.text, "hello world")

    def test_erase_restores_exactly_what_it_removed_even_when_count_was_too_big(self):
        doc, history = Doc(), History()
        history.run(Type(doc, "ab"))
        history.run(Erase(doc, 5))
        self.assertEqual(doc.text, "")
        history.undo()
        self.assertEqual(doc.text, "ab")

    def test_nothing_to_undo_or_redo_returns_false(self):
        history = History()
        self.assertFalse(history.undo())
        self.assertFalse(history.redo())

    def test_a_new_edit_clears_the_redo_stack(self):
        doc, history = Doc(), History()
        history.run(Type(doc, "a"))
        history.run(Type(doc, "b"))
        history.undo()
        history.run(Type(doc, "x"))
        self.assertFalse(history.redo())
        self.assertEqual(doc.text, "ax")


if __name__ == "__main__":
    unittest.main()
