import unittest

from relationships import Book, Library, Member


class FakeNotifier:
    def __init__(self):
        self.sent = []

    def send(self, to, text):
        self.sent.append((to, text))
        return "ok"


class RelationshipsTest(unittest.TestCase):
    def test_composition_the_library_creates_and_holds_its_own_books(self):
        lib = Library()
        book = lib.add_book("b1", "Dune")
        self.assertIsInstance(book, Book)
        self.assertEqual(lib.books, [book])

    def test_aggregation_a_member_can_belong_to_two_libraries_and_is_not_copied(self):
        ana = Member("ana", "Ana")
        north, south = Library(), Library()
        north.join(ana)
        south.join(ana)
        self.assertIs(north.members[0], south.members[0])

    def test_dependency_the_notifier_is_passed_in_so_a_fake_can_stand_in_for_it(self):
        fake = FakeNotifier()
        lib = Library()
        ana = Member("ana", "Ana")
        book = lib.add_book("b1", "Dune")
        self.assertEqual(lib.lend(ana, book, 0, fake), "ok")
        self.assertEqual(fake.sent, [("Ana", "borrowed Dune")])
        self.assertEqual(len(lib.loans), 1)


if __name__ == "__main__":
    unittest.main()
