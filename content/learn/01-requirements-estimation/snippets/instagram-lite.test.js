import { test, expect } from 'vitest';
import { instagramLite } from './instagram-lite.js';

test('Instagram-lite: 100M DAU, 10% upload 2 photos, 10 feed views each', () => {
  expect(instagramLite()).toEqual({
    uploadQps: 231,          // ≈ 230/s
    peakUploadQps: 694,      // ≈ 700/s
    mediaPerDayTB: 10,
    mediaPerYearPB: 3.65,
    feedQps: 11574,          // ≈ 11.6K/s
    peakFeedQps: 34722,      // ≈ 35K/s
    egressGBps: 5.8,
    egressGbps: 46,
  });
});

test('photo metadata is small next to the media', () => {
  // 20M rows/day × ~1 KB = 20 GB/day ≈ 7.3 TB/year, versus 3.65 PB/year of photos
  const rowsPerDay = 100e6 * 0.1 * 2;
  expect((rowsPerDay * 1_000) / 1e9).toBe(20);
  expect((rowsPerDay * 1_000 * 365) / 1e12).toBe(7.3);
});
