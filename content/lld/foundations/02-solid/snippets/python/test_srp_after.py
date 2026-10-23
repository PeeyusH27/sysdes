import unittest

from srp_after import Order, OrderStore, receipt_text, with_tax


class FakeDb:
    def __init__(self):
        self.rows = []

    def insert(self, table, row):
        self.rows.append((table, row["total"]))


def build():
    order = Order()
    order.add("Tea", 500, 2)
    order.add("Cake", 250, 1)
    return order


class SrpAfterTest(unittest.TestCase):
    def test_an_order_only_knows_its_items_and_tax_is_a_separate_rule(self):
        order = build()
        self.assertEqual(order.subtotal(), 1250)
        self.assertEqual(with_tax(order.subtotal(), 18), 1475)
        self.assertEqual(with_tax(order.subtotal(), 5), 1313)  # 1312.5 rounds up

    def test_the_receipt_layout_changes_without_touching_pricing(self):
        self.assertEqual(receipt_text(build(), 1475), "2 x Tea\n1 x Cake\nTotal: 14.75")

    def test_storage_is_its_own_class_so_it_is_tested_with_a_fake(self):
        db = FakeDb()
        OrderStore(db).save(build(), 1475)
        self.assertEqual(db.rows, [("orders", 1475)])


if __name__ == "__main__":
    unittest.main()
