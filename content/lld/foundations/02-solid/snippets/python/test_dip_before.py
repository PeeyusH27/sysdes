import unittest

from dip_before import OrderService


class DipBeforeTest(unittest.TestCase):
    def test_placing_an_order_cannot_be_tested_without_a_mail_server(self):
        with self.assertRaisesRegex(ConnectionError, "no SMTP server"):
            OrderService().place({"id": 7, "email": "ana@example.com"})


if __name__ == "__main__":
    unittest.main()
