import unittest

from door_flags import Door


class DoorFlagsTest(unittest.TestCase):
    def test_the_happy_path_works(self):
        door = Door()
        door.open()
        door.close()
        door.lock()
        self.assertEqual((door.is_open, door.is_locked), (False, True))

    def test_the_flags_allow_a_door_that_is_open_and_locked_at_once(self):
        door = Door()
        door.open()
        door.lock()
        self.assertEqual((door.is_open, door.is_locked), (True, True))  # impossible, and nothing said no


if __name__ == "__main__":
    unittest.main()
