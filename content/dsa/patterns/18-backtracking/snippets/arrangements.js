// Template 2: when order matters, every call may pick ANY item that is not already in the path.
// used[i] records whether items[i] is in the path, so the check is O(1). With k = items.length
// this lists every permutation.
export function arrangements(items, k = items.length) {
  const result = [];
  const path = [];
  const used = new Array(items.length).fill(false);

  function backtrack() {
    if (path.length === k) {
      result.push([...path]);
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue;     // already placed in this path
      used[i] = true;            // choose
      path.push(items[i]);
      backtrack();               // explore
      path.pop();                // un-choose: undo both changes
      used[i] = false;
    }
  }

  backtrack();
  return result;
}
