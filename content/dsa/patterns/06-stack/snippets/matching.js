// Template 1: matching and nesting. Push what is still open; a closer must match the most recent open item.
const PAIRS = new Map([[")", "("], ["]", "["], ["}", "{"]]);

export function isBalanced(s) {
  const stack = [];
  for (const ch of s) {
    if (PAIRS.has(ch)) {
      const open = stack.pop(); // undefined when nothing is open
      if (open !== PAIRS.get(ch)) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0; // anything left was never closed
}

// The same shape handles "undo the most recent": ".." cancels the latest directory.
export function simplifyPath(path) {
  const stack = [];
  for (const part of path.split("/")) {
    if (part === "..") stack.pop();
    else if (part !== "" && part !== ".") stack.push(part);
  }
  return "/" + stack.join("/");
}
