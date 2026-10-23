import unittest
from dataclasses import FrozenInstanceError

from email_builder import EmailBuilder


class EmailBuilderTest(unittest.TestCase):
    def test_builds_an_email_step_by_step(self):
        email = EmailBuilder().to("ann@x.com").cc("bob@x.com").subject("Lunch").body("12:30?").build()
        self.assertEqual(email.to, ("ann@x.com",))
        self.assertEqual(email.cc, ("bob@x.com",))
        self.assertEqual((email.subject, email.body), ("Lunch", "12:30?"))

    def test_an_invalid_combination_never_becomes_an_object(self):
        with self.assertRaisesRegex(ValueError, "needs a recipient"):
            EmailBuilder().subject("Hi").build()
        with self.assertRaisesRegex(ValueError, "needs a subject"):
            EmailBuilder().to("ann@x.com").build()

    def test_a_built_email_is_frozen_and_independent_of_the_builder(self):
        builder = EmailBuilder().to("ann@x.com").subject("Hi")
        first = builder.build()
        builder.to("bob@x.com")
        self.assertEqual(first.to, ("ann@x.com",))
        with self.assertRaises(FrozenInstanceError):
            first.subject = "Other"
        self.assertEqual(builder.build().to, ("ann@x.com", "bob@x.com"))


if __name__ == "__main__":
    unittest.main()
