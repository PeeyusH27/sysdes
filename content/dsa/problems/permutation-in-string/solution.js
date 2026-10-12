function checkInclusion(s1, s2) {
  const m = s1.length;
  if (m > s2.length) return false;
  const diff = new Array(26).fill(0); // s1's letter counts minus the window's letter counts
  for (const ch of s1) diff[ch.charCodeAt(0) - 97]++;
  let unbalanced = diff.filter((d) => d !== 0).length; // letters whose counts don't match yet

  const change = (ch, delta) => {
    const i = ch.charCodeAt(0) - 97;
    if (diff[i] === 0) unbalanced++;   // this letter was balanced, now it won't be
    diff[i] += delta;
    if (diff[i] === 0) unbalanced--;   // this letter just became balanced
  };

  for (let right = 0; right < s2.length; right++) {
    change(s2[right], -1);                          // s2[right] enters the window
    if (right >= m) change(s2[right - m], +1);      // the oldest letter leaves
    if (unbalanced === 0) return true;              // window counts equal s1's counts
  }
  return false;
}
