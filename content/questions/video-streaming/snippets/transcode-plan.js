// Turn one uploaded video into independent tasks. Because every task reads the same source and writes a
// deterministic path, any task can run twice or on any machine: a crashed worker just means "run it again".
import { LADDER } from './abr.js';

export function planJob(videoId, durationS, { segmentS = 4, ladder = LADDER } = {}) {
  const segments = Math.ceil(durationS / segmentS);
  const tasks = [];
  for (const r of ladder) {
    for (let i = 0; i < segments; i++) {
      tasks.push({
        id: `${videoId}/${r.label}/${i}`,
        kind: 'encode',
        from: i * segmentS,
        to: Math.min((i + 1) * segmentS, durationS),
        bps: r.bps,
        out: `v/${videoId}/${r.label}/seg_${String(i).padStart(5, '0')}.m4s`,   // same input, same path: safe to retry
      });
    }
  }
  // Playlists can only be written once every segment exists, so this task waits for all of them.
  tasks.push({ id: `${videoId}/package`, kind: 'package', after: tasks.map((t) => t.id), out: `v/${videoId}/master.m3u8` });
  return tasks;
}

// How many CPU cores keep up with a day of uploads, if one core encodes `speed` seconds of video per second.
export function coresNeeded(videosPerDay, durationS, renditions, speed) {
  const coreSecondsPerDay = (videosPerDay * durationS * renditions) / speed;
  return coreSecondsPerDay / 86_400;
}
