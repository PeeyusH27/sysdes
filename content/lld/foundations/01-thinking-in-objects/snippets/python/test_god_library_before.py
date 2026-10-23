import unittest

from god_library_before import Library


def setup():
    lib = Library()
    lib.add_book("b1", "Dune", 5)
    lib.join("ana", "Ana")
    return lib


class GodLibraryTest(unittest.TestCase):
    def test_lends_three_books_and_refuses_the_fourth(self):
        lib = setup()
        self.assertEqual([lib.borrow("ana", "b1", 0) for _ in range(4)], [True, True, True, False])

    def test_the_14_day_rule_is_baked_into_both_the_email_and_the_fee(self):
        lib = setup()
        lib.borrow("ana", "b1", 0)
        self.assertEqual(lib.outbox, ["Ana: Dune is due on day 14"])
        self.assertEqual(lib.give_back("ana", "b1", 14), 0)

        lib.borrow("ana", "b1", 0)
        self.assertEqual(lib.give_back("ana", "b1", 20), 3)


if __name__ == "__main__":
    unittest.main()
