import { test, expect } from 'vitest';
import { masterPlaylist, mediaPlaylist } from './manifest.js';
import { LADDER } from './abr.js';

test('the master playlist lists every rendition with its bandwidth', () => {
  const m = masterPlaylist('v1', LADDER).split('\n');
  expect(m[0]).toBe('#EXTM3U');
  expect(m).toContain('#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720');
  expect(m).toContain('720p/index.m3u8');
  expect(m.filter((l) => l.startsWith('#EXT-X-STREAM-INF'))).toHaveLength(5);
});

test('a 10 minute media playlist has 150 four-second segments and ends', () => {
  const lines = mediaPlaylist(600).split('\n');
  expect(lines.filter((l) => l.startsWith('#EXTINF'))).toHaveLength(150);
  expect(lines).toContain('seg_00149.m4s');
  expect(lines.at(-2)).toBe('#EXT-X-ENDLIST');
});

test('the last segment carries the leftover duration', () => {
  const lines = mediaPlaylist(10).split('\n');
  expect(lines.filter((l) => l.startsWith('#EXTINF'))).toEqual(['#EXTINF:4.000,', '#EXTINF:4.000,', '#EXTINF:2.000,']);
});
