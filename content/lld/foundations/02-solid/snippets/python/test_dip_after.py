import unittest

from dip_after import OrderService


class FakeMailer:
    def __init__(self):
        self.sent = []

    def send(self, to, text):
        self.sent.append({"to": to, "text": text})


class BrokenMailer:
    def send(self, to, text):
        raise RuntimeError("mail is down")


class DipAfterTest(unittest.TestCase):
    def test_the_service_sends_a_confirmation_through_whatever_mailer_it_was_given(self):
        mailer = FakeMailer()
        self.assertEqual(OrderService(mailer).place({"id": 7, "email": "ana@example.com"}), 7)
        self.assertEqual(mailer.sent, [{"to": "ana@example.com", "text": "Order 7 confirmed"}])

    def test_a_failing_mailer_is_easy_to_simulate_too(self):
        with self.assertRaisesRegex(RuntimeError, "mail is down"):
            OrderService(BrokenMailer()).place({"id": 8, "email": "bo@example.com"})


if __name__ == "__main__":
    unittest.main()
