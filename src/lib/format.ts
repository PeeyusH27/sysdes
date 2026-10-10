const compactFmt = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 35000 → "35K", 1250000 → "1.3M" */
export const compact = (v: number) => compactFmt.format(v);

/** 1234.5 → "1,235" */
export const int = (v: number) => Math.round(v).toLocaleString("en");

/** Bytes → "1.2 TB" (decimal units, which is what capacity estimates use). */
export function bytes(n: number) {
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return `${n >= 100 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

/** Minutes → "3.65 days" / "8.77 h" / "52.6 min" */
export function duration(minutes: number) {
  if (minutes >= 60 * 24) return `${(minutes / 60 / 24).toFixed(2)} days`;
  if (minutes >= 60) return `${(minutes / 60).toFixed(2)} h`;
  if (minutes >= 1) return `${minutes.toFixed(minutes >= 10 ? 1 : 2)} min`;
  return `${(minutes * 60).toFixed(1)} s`;
}
