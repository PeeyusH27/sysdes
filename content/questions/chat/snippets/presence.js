// @display-only: needs a Redis client (passed in)
// Online = a heartbeat key exists. Expiry handles crashed clients for free.
export const heartbeat = (redis, userId) => redis.set(`presence:${userId}`, Date.now(), 'EX', 70);   // on connect + each pong (30 s)
export const isOnline = (redis, userId) => redis.exists(`presence:${userId}`);
// On the client, typing is throttled: send at most one { type: 'typing' } every 3 s (typingThrottle in chat-state.js);
// receivers hide the indicator after 5 s of silence.
