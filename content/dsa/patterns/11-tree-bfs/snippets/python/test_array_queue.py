import unittest

from array_queue import ArrayQueue


class TestArrayQueue(unittest.TestCase):
    def test_first_in_first_out(self):
        q = ArrayQueue()
        q.push(1)
        q.push(2)
        q.push(3)
        self.assertEqual(q.shift(), 1)
        q.push(4)
        self.assertEqual([q.shift(), q.shift(), q.shift()], [2, 3, 4])
        self.assertIsNone(q.shift())
        self.assertEqual(q.size, 0)

    def test_stays_correct_across_compaction(self):
        q = ArrayQueue()
        out = []
        for i in range(5000):
            q.push(i)
            q.push(i)
            out.append(q.shift())
        self.assertEqual(q.size, 5000)
        self.assertEqual(out[:4], [0, 0, 1, 1])
        self.assertEqual(q.shift(), 2500)


if __name__ == "__main__":
    unittest.main()
