// @display-only: needs a queue client (`queue`) and a cached preferences lookup (`getPrefs`)
// One deterministic message per enabled channel, routed by priority
import { nextAllowedSendTime } from './quiet-hours.js';

const PRIORITY = { otp: 'critical', order_update: 'high', marketing: 'low' };

export async function notify({ eventId, userId, type, data }) {
  const prefs = await getPrefs(userId);                     // cached: { push, email, sms, types, quietHours, tz }
  const priority = PRIORITY[type] ?? 'normal';
  const channels = ['push', 'email', 'sms'].filter(ch => prefs[ch] && prefs.types?.[type]?.[ch] !== false);
  for (const ch of channels) {
    await queue.publish(`notif.${ch}.${priority}`, {
      id: `${eventId}:${ch}`,                               // deterministic → safe to dedupe
      userId, type, ch, data,
      notBefore: priority === 'low' ? nextAllowedSendTime(prefs, new Date()) : Date.now(),
    });
  }
}
