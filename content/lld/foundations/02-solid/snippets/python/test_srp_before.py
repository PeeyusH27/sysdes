import unittest

from srp_before import Order


class FakeDb:
    def __init__(self):
        self.rows = []

    def insert(self, table, row):
        self.rows.append((table, row["total"]))


def build(db):
    order = Order(db)
    order.add("Tea", 500, 2)
    order.add("Cake", 250, 1)
    return order


class SrpBeforeTest(unittest.TestCase):
    def test_totals_with_tax_and_prints_a_receipt(self):
        order = build(None)
        self.assertEqual(order.total(), 1475)
        self.assertEqual(order.receipt(), "2 x Tea\n1 x Cake\nTotal: 14.75")

    def test_you_cannot_price_an_order_without_also_being_able_to_talk_to_a_database(self):
        db = FakeDb()
        build(db).save()
        self.assertEqual(db.rows, [("orders", 1475)])
        with self.assertRaises(AttributeError):
            build(None).save()


if __name__ == "__main__":
    unittest.main()
