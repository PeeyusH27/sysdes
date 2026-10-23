import unittest

from library_after import Library, Member


def setup(member=None):
    lib = Library()
    lib.add_book("b1", "Dune", 2)
    lib.join(member or Member("ana", "Ana"))
    return lib


class LibraryAfterTest(unittest.TestCase):
    def test_a_loan_takes_a_copy_and_is_due_after_the_member_loan_period(self):
        lib = setup()
        loan = lib.borrow("ana", "b1", 3)
        self.assertEqual(loan.due_day, 17)
        self.assertEqual(lib.books["b1"].copies, 1)

    def test_refuses_when_the_member_is_at_the_limit_or_the_book_is_out_of_stock(self):
        lib = setup(Member("ana", "Ana", 1))
        self.assertIsNotNone(lib.borrow("ana", "b1", 0))
        self.assertIsNone(lib.borrow("ana", "b1", 0))  # limit of 1
        lib.join(Member("bo", "Bo"))
        self.assertIsNotNone(lib.borrow("bo", "b1", 0))
        lib.join(Member("cy", "Cy"))
        self.assertIsNone(lib.borrow("cy", "b1", 0))  # both copies are out

    def test_charges_half_a_unit_a_day_after_the_due_day_and_a_student_rule_needs_no_edit(self):
        lib = setup()
        lib.join(Member("sam", "Sam", 3, 7))  # students: 7 days
        lib.borrow("ana", "b1", 0)
        lib.borrow("sam", "b1", 0)
        self.assertEqual(lib.give_back("ana", "b1", 20), 3)
        self.assertEqual(lib.give_back("sam", "b1", 10), 1.5)
        self.assertEqual(lib.books["b1"].copies, 2)

    def test_returns_minus_one_for_a_book_the_member_does_not_hold(self):
        lib = setup()
        self.assertEqual(lib.give_back("ana", "b1", 5), -1)
        self.assertEqual(lib.give_back("nobody", "b1", 5), -1)


if __name__ == "__main__":
    unittest.main()
