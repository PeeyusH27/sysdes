// Is it quiet time for this user right now? { start: 22, end: 8 } in their time zone
export function inQuietHours(now, { tz, quietHours: { start, end } }) {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(now));
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;   // handles windows past midnight
}
// inQuietHours(new Date('2026-10-10T21:30:00Z'), { tz: 'Asia/Kolkata', quietHours: { start: 22, end: 8 } }) → true (03:00 IST)

// When may a low-priority message go out? Now, or when the user's quiet window ends (epoch ms).
// Across a daylight-saving switch the answer can be an hour early; the worker re-checks at send time.
export function nextAllowedSendTime(prefs, now) {
  if (!prefs.quietHours || !inQuietHours(now, prefs)) return now.getTime();
  const local = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23', timeZone: prefs.tz })
      .formatToParts(now).map(p => [p.type, Number(p.value)]),
  );
  const hoursLeft = (prefs.quietHours.end - local.hour + 24) % 24;
  return now.getTime() + hoursLeft * 3_600_000 - local.minute * 60_000 - local.second * 1_000 - now.getMilliseconds();
}
// 23:30 in Kolkata with quiet hours 22–8 → 08:00 the next morning in Kolkata (8.5 hours later)
