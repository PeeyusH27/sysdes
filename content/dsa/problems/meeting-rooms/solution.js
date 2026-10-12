function canAttendMeetings(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]); // copy: don't reorder the caller's array
  for (let i = 1; i < sorted.length; i++) {
    // In start order, a clash always shows up between neighbours.
    if (sorted[i][0] < sorted[i - 1][1]) return false;
  }
  return true;
}
