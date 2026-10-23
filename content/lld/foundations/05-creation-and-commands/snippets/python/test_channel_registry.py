import unittest

from channel_registry import default_channels


class Push:
    cost_in_cents = 0

    def send(self, to, text):
        return f"push to {to}: {text}"


class ChannelRegistryTest(unittest.TestCase):
    def test_creates_a_channel_from_its_name(self):
        channels = default_channels()
        self.assertEqual(channels.create("email").send("ann@x.com", "hi"), "email to ann@x.com: hi")
        self.assertEqual(channels.create("sms").cost_in_cents, 4)
        self.assertEqual(channels.create("email").cost_in_cents, 0)

    def test_sms_truncates_to_160_characters(self):
        out = default_channels().create("sms").send("+1555", "x" * 200)
        self.assertEqual(out, "sms to +1555: " + "x" * 160)

    def test_an_unknown_kind_fails_loudly_in_one_place(self):
        with self.assertRaisesRegex(ValueError, "unknown channel: fax"):
            default_channels().create("fax")

    def test_a_new_kind_is_registered_without_editing_any_existing_class(self):
        channels = default_channels().register("push", Push)
        self.assertEqual(channels.create("push").send("device-7", "hi"), "push to device-7: hi")


if __name__ == "__main__":
    unittest.main()
