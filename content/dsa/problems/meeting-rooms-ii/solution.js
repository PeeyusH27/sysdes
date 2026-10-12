function minMeetingRooms(intervals) {
  const starts = intervals.map((m) => m[0]).sort((a, b) => a - b);
  const ends = intervals.map((m) => m[1]).sort((a, b) => a - b);
  let inUse = 0;
  let most = 0;
  let e = 0;
  for (const s of starts) {
    // Free every room whose meeting has finished by time s (ending at s counts as finished).
    while (e < ends.length && ends[e] <= s) {
      inUse--;
      e++;
    }
    inUse++;                        // this meeting takes a room
    most = Math.max(most, inUse);
  }
  return most;
}
