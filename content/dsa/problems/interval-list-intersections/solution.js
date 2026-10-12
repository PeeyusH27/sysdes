function intervalIntersection(firstList, secondList) {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < firstList.length && j < secondList.length) {
    const [a1, a2] = firstList[i];
    const [b1, b2] = secondList[j];
    const lo = Math.max(a1, b1);   // the later start
    const hi = Math.min(a2, b2);   // the earlier end
    if (lo <= hi) result.push([lo, hi]);
    // Whichever interval ends first can't reach anything further along the other list.
    if (a2 < b2) i++;
    else j++;
  }
  return result;
}
