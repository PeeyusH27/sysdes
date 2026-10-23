import unittest

from ocp_before import price


class OcpBeforeTest(unittest.TestCase):
    def test_known_kinds_get_their_discount(self):
        self.assertEqual(price("regular", 2000), 2000)
        self.assertEqual(price("gold", 2000), 1800)
        self.assertEqual(price("employee", 2000), 1400)

    def test_a_new_kind_falls_through_to_the_full_price_until_the_function_is_edited(self):
        self.assertEqual(price("student", 2000), 2000)


if __name__ == "__main__":
    unittest.main()
