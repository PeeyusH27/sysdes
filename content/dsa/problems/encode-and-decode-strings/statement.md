You want to send a **list of strings** over a channel that can carry only one string. Design two functions:

- `encode(strs)` turns the list into a single string.
- `decode(s)` takes that string and returns the original list, with the same strings in the same order.

The strings can contain **any characters**: commas, digits, `#`, spaces, newlines, even text that looks like your own encoding. Some strings may be empty, and the list itself may be empty. `decode` receives nothing except the string `encode` produced, so you cannot use shared state between the two calls.

The tests call a function `roundTrip(strs)`. Write `encode` and `decode` in your file (in JavaScript the starter already has them as stubs), and have `roundTrip` return the pair `[encode(strs), decode(encode(strs))]`. A test passes when the first item is a string and the second item equals the input list exactly. (In Python, define `encode`, `decode` and `round_trip` yourself.)

### Constraints

- `0 <= strs.length <= 200`
- `0 <= strs[i].length <= 200`
- Strings may contain any characters, including the ones you choose as separators.
