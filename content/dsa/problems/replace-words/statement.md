A **root** is a short string that longer words can be built from by adding letters at the end: `"re"` is a root of `"reread"` and of `"return"`.

You are given a list of roots, `dictionary`, and a `sentence` made of words separated by single spaces. Replace every word in the sentence that starts with some root by that root. If several roots match the same word, use the **shortest** one. Words that start with no root stay as they are.

Return the sentence after all replacements, with the words still separated by single spaces.

### Constraints

- `1 <= dictionary.length <= 1000`
- `1 <= dictionary[i].length <= 100`
- `1 <= sentence.length <= 10^6`
- The dictionary and the sentence use lowercase English letters; the sentence also has single spaces between words and none at either end.
