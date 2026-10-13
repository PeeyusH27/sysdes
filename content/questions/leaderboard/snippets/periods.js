// Which boards one match result lands on. The period comes from when the match was played, not
// when the event is processed, so a result from 23:59:59 still counts for that day even if it
// arrives after midnight. One time zone per board (UTC here); say which one in the interview.
export const DAY_TTL_S = 8 * 86_400;   // late events, prizes, and rebuilding the week from its days
export const WEEK_TTL_S = 14 * 86_400; // this week and last week

export const dayOf = ms => new Date(ms).toISOString().slice(0, 10); // '2026-10-13'

// ISO-8601 week: weeks start on Monday, and the week's Thursday decides its year.
export function isoWeek(ms) {
  const d = new Date(ms);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));      // move to Thursday
  const week = Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// `{game}` is a Redis Cluster hash tag: every board of one game lands in the same slot, so one
// Lua script may update all of them atomically.
export function boardKeys(game, playedAtMs) {
  return {
    all: `lb:{${game}}:all`,
    daily: `lb:{${game}}:daily:${dayOf(playedAtMs)}`,
    weekly: `lb:{${game}}:weekly:${isoWeek(playedAtMs)}`,
  };
}

// The seven daily keys of the ISO week containing `ms`, Monday first (input for ZUNIONSTORE).
export function dailyKeysOfWeek(game, ms) {
  const d = new Date(ms);
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ((d.getUTCDay() || 7) - 1) * 86_400_000;
  return Array.from({ length: 7 }, (_, i) => `lb:{${game}}:daily:${dayOf(monday + i * 86_400_000)}`);
}
