import type { Basics } from "./types";

export const basics: Record<string, Basics> = {
  hashing: {
    what: "A hash map stores key and value pairs and finds any key in one step, however many you store. A set is the same idea with keys only.",
    why: "Searching a list item by item gets slower as it grows. A hash map jumps straight to the answer, so a nested loop of O(n²) often becomes one pass of O(n).",
    example: "A coat check. You hand over a coat and get ticket 42. Later the attendant walks straight to hook 42. Nobody searches the whole rack.",
    when: "Use it when you keep asking: have I seen this before, how many times, or which items belong together?",
  },
  "binary-search": {
    what: "Binary search finds a value in sorted data. Check the middle, then throw away the half that cannot hold the answer. Every check halves what is left.",
    why: "Looking one by one takes n steps. Halving takes about log n, so a million items need only about 20 checks.",
    example: "Guess a number from 1 to 100 by asking: higher or lower than 50? Seven questions are always enough.",
    when: "Use it on sorted arrays, or whenever the answer flips once from too small to big enough, like the slowest speed that still finishes in time.",
  },
};
