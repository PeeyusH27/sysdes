### Intuition

The tempting design is to join the strings with a separator, say a comma, and split on it later. It breaks the moment a string contains a comma. You can escape the separator, but then you must escape the escape character too, and the decoder gets fiddly.

Avoid the whole problem by **never asking the decoder to look inside a string**. Put the length in front of every string. Once the decoder knows "the next 4 characters are one string", the content of those characters is irrelevant: they may be commas, digits or `#` signs.

### Step by step

1. `encode`: for every string `s`, write `s.length`, then a marker `#`, then `s` itself. Concatenate all the pieces.
2. `decode`: keep an index `i` at the start of the next piece.
   1. Find the first `#` at or after `i`. Everything between `i` and that `#` is the length `len`. This is safe because the length is digits only, so no `#` can appear before the real marker.
   2. The string is the `len` characters right after the `#`.
   3. Move `i` to the end of that string and repeat until `i` reaches the end.
3. An empty list encodes to the empty string, which decodes to an empty list. A list with one empty string encodes to `"0#"`, which decodes back to `[""]`: the two cases stay distinguishable.

### Dry run: `["ab", "", "3#x"]`

Encoded: `2#ab` + `0#` + `3#3#x` = `2#ab0#3#3#x`

| i | text from i | length read | string taken | next i |
|---|---|---|---|---|
| 0 | `2#ab0#3#3#x` | 2 | `ab` | 4 |
| 4 | `0#3#3#x` | 0 | `` (empty) | 6 |
| 6 | `3#3#x` | 3 | `3#x` | 11 (end) |

The last string contains a `#`, but the decoder never scans it: it was told to take exactly 3 characters.

### Why it works

The encoded text is a sequence of self-describing blocks. Reading left to right, the decoder is always positioned at the start of a block, the digits before the first `#` identify the block length unambiguously, and skipping exactly that many characters lands on the start of the next block. By induction every string is recovered.

### Common mistakes

- Using `split("#")` or any delimiter scan on the whole text: data containing the delimiter corrupts the result.
- Reading only one digit for the length, which fails for strings of 10 or more characters.
- Treating `[]` and `[""]` as the same thing. They must decode differently.

### Other ways to solve it

**Escaping**: use a delimiter and escape it (and the escape character) inside the data. Works, but decoding needs a small state machine. **JSON**: `JSON.stringify(strs)` and `JSON.parse` is also a valid, correct encoding, as the checker accepts any string. Interviewers usually want the length-prefix idea, which works without a parser.
