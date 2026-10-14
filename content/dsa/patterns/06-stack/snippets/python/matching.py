# Template 1: matching and nesting. Push what is still open; a closer must match the most recent open item.
from typing import List, Optional

PAIRS = {")": "(", "]": "[", "}": "{"}


def is_balanced(s: str) -> bool:
    stack: List[str] = []
    for ch in s:
        if ch in PAIRS:
            open_ch: Optional[str] = stack.pop() if stack else None   # None when nothing is open
            if open_ch != PAIRS[ch]:
                return False
        else:
            stack.append(ch)
    return not stack   # anything left was never closed


# The same shape handles "undo the most recent": ".." cancels the latest directory.
def simplify_path(path: str) -> str:
    stack: List[str] = []
    for part in path.split("/"):
        if part == "..":
            if stack:
                stack.pop()
        elif part != "" and part != ".":
            stack.append(part)
    return "/" + "/".join(stack)
