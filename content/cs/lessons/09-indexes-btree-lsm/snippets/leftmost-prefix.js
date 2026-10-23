// An index on (a, b, c) is sorted by a, then by b inside each a, then by c inside each b.
// It can narrow a search using equality on a leading run of its columns, plus one range column right after.
export function usableColumns(indexColumns, { equals = [], range = [] }) {
  let used = 0;
  for (const column of indexColumns) {
    if (equals.includes(column)) {
      used += 1;
      continue;
    }
    if (range.includes(column)) used += 1; // a range ends the useful prefix
    break;
  }
  return used;
}

// A covering index holds every column the query needs, so the table itself is never touched.
export const isCovering = (indexColumns, needed) => needed.every((column) => indexColumns.includes(column));
