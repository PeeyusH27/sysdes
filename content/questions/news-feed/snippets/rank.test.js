import { describe, expect, test } from 'vitest';
import { rank, score } from './rank.js';

const NOW = Date.UTC(2026, 0, 1);
const HOUR = 3_600_000;
const post = (over = {}) => ({ id: 'p', authorId: 'a', createdAt: NOW, likes: 0, comments: 0, shares: 0, ...over });
const viewer = { affinity: { friend: 3 } };

describe('score', () => {
  test('matches the formula: 10 likes, brand new, no affinity → 11 / 2^1.5 ≈ 3.89', () => {
    expect(score(post({ likes: 10 }), viewer, NOW)).toBeCloseTo(11 / Math.pow(2, 1.5), 10);
    expect(score(post({ likes: 10 }), viewer, NOW)).toBeCloseTo(3.889, 3);
  });

  test('newer posts rank higher than older ones with the same engagement', () => {
    const fresh = score(post({ likes: 5 }), viewer, NOW);
    const old = score(post({ likes: 5, createdAt: NOW - 6 * HOUR }), viewer, NOW);
    expect(fresh).toBeGreaterThan(old);
  });

  test('more engaged posts rank higher; comments and shares weigh more than likes', () => {
    expect(score(post({ likes: 20 }), viewer, NOW)).toBeGreaterThan(score(post({ likes: 2 }), viewer, NOW));
    expect(score(post({ shares: 1 }), viewer, NOW)).toBeGreaterThan(score(post({ likes: 2 }), viewer, NOW));   // 3 > 2
  });

  test('affinity multiplies the score (unknown authors default to 1)', () => {
    const stranger = score(post({ likes: 4 }), viewer, NOW);
    const friend = score(post({ likes: 4, authorId: 'friend' }), viewer, NOW);
    expect(friend).toBeCloseTo(3 * stranger, 10);
  });

  test('a viral post from yesterday still beats a fresh post nobody engaged with', () => {
    const viral = score(post({ likes: 1_000, createdAt: NOW - 24 * HOUR }), viewer, NOW);   // 1001 / 26^1.5 ≈ 7.55
    const quiet = score(post({ likes: 5 }), viewer, NOW);                                    // 6 / 2^1.5 ≈ 2.12
    expect(viral).toBeCloseTo(7.55, 2);
    expect(quiet).toBeCloseTo(2.12, 2);
    expect(viral).toBeGreaterThan(quiet);
  });
});

describe('rank', () => {
  test('orders a candidate set by score without mutating it', () => {
    const candidates = [
      post({ id: 'old', likes: 5, createdAt: NOW - 48 * HOUR }),
      post({ id: 'friend', authorId: 'friend', likes: 1 }),
      post({ id: 'popular', likes: 50, createdAt: NOW - 2 * HOUR }),
    ];
    const before = candidates.map(p => p.id);
    expect(rank(candidates, viewer, NOW).map(p => p.id)).toEqual(['popular', 'friend', 'old']);
    expect(candidates.map(p => p.id)).toEqual(before);
  });
});
