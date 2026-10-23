import { test, expect } from 'vitest';
import { Mmu, PageFault } from './paging.js';

const table = () => new Map([[0, 5], [1, 9], [2, 4], [3, 7]]);

test('0x3A7C is page 3, offset 0xA7C; page 3 sits in frame 7, so the physical address is 0x7A7C', () => {
  expect(new Mmu(table()).translate(0x3a7c)).toBe(0x7a7c);
});

test('the second access to a page hits the TLB and skips the page-table walk', () => {
  const mmu = new Mmu(table());
  mmu.translate(0x3a7c);
  mmu.translate(0x3a80);
  expect(mmu.stats).toEqual({ tlbHits: 1, walks: 1, faults: 0 });
});

test('an unmapped page raises a page fault for the kernel to handle', () => {
  const mmu = new Mmu(table());
  expect(() => mmu.translate(0x9000)).toThrow(PageFault);
  expect(mmu.stats.faults).toBe(1);
});

test('a two-entry TLB forgets the least recently used page', () => {
  const mmu = new Mmu(table(), 2);
  for (const page of [0, 1, 2]) mmu.translate(page * 4096); // page 0 is evicted
  mmu.translate(0); // walks again
  expect(mmu.stats.walks).toBe(4);
  expect(mmu.stats.tlbHits).toBe(0);
});

test('the kernel can map the page and retry, and then the access works', () => {
  const pt = table();
  const mmu = new Mmu(pt);
  try {
    mmu.translate(0x4010);
  } catch (e) {
    pt.set(e.vpn, 11); // "read the page in from disk"
  }
  expect(mmu.translate(0x4010)).toBe(11 * 4096 + 0x10);
});
