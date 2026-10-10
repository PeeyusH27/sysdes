import { describe, expect, test } from 'vitest';
import { mergeTimelines, pairs } from './timeline.js';

// A tiny in-memory stand-in for ZREVRANGEBYSCORE key max -inf WITHSCORES LIMIT 0 limit
const zrev = (zset, max, limit) => {
  const bound = max === '+inf' ? Infinity : Number(String(max).replace('(', ''));
  return [...zset]
    .filter(([, ts]) => ts < bound)                                // "(" = exclusive
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .flatMap(([id, ts]) => [id, String(ts)]);                      // Redis returns scores as strings
};

// getFeed from feed.js, minus hydration, against in-memory sorted sets
const getPage = (feed, celebTimelines, cursor, limit) => {
  const max = cursor ? `(${cursor}` : '+inf';
  const page = mergeTimelines(zrev(feed, max, limit), celebTimelines.map(t => zrev(t, max, limit)), limit);
  return { ids: page.map(e => e.id), nextCursor: page.length < limit ? null : page.at(-1).ts };
};

describe('pairs', () => {
  test('turns a flat WITHSCORES reply into { id, ts } objects', () => {
    expect(pairs(['p3', '300', 'p1', '100'])).toEqual([{ id: 'p3', ts: 300 }, { id: 'p1', ts: 100 }]);
    expect(pairs([])).toEqual([]);
  });
});

describe('mergeTimelines', () => {
  test('interleaves pushed and celebrity posts newest first and cuts to the limit', () => {
    const pushed = ['a', '500', 'b', '300', 'c', '100'];
    const pulled = [['x', '400', 'y', '50'], ['z', '350']];
    expect(mergeTimelines(pushed, pulled, 4).map(e => e.id)).toEqual(['a', 'x', 'z', 'b']);
  });

  test('keeps one copy of a post that is in both the pushed feed and a celebrity timeline', () => {
    const merged = mergeTimelines(['p1', '200', 'p0', '100'], [['p1', '200', 'c1', '150']], 10);
    expect(merged.map(e => e.id)).toEqual(['p1', 'c1', 'p0']);
  });

  test('works with no celebrities and with empty feeds', () => {
    expect(mergeTimelines(['a', '1'], [], 20)).toEqual([{ id: 'a', ts: 1 }]);
    expect(mergeTimelines([], [[], []], 20)).toEqual([]);
  });
});

describe('score-cursor pagination', () => {
  const feed = new Map([['p9', 900], ['p7', 700], ['p5', 500], ['p3', 300], ['p1', 100]]);
  const celeb = new Map([['c8', 800], ['c4', 400], ['c2', 200]]);

  test('walks the merged feed with no duplicates and no gaps', () => {
    const seen = [];
    let cursor = null;
    do {
      const page = getPage(feed, [celeb], cursor, 3);
      seen.push(...page.ids);
      cursor = page.nextCursor;
    } while (cursor !== null);
    expect(seen).toEqual(['p9', 'c8', 'p7', 'p5', 'c4', 'p3', 'c2', 'p1']);
  });

  test('a post pushed between page loads does not shift the next page (list offsets would)', () => {
    const live = new Map(feed);
    const first = getPage(live, [], null, 2);                      // p9, p7
    live.set('p10', 1_000);                                        // a new post arrives at the top
    const second = getPage(live, [], first.nextCursor, 2);
    expect(second.ids).toEqual(['p5', 'p3']);                      // continues exactly where page 1 ended

    const byOffset = [...live].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    expect(byOffset.slice(2, 4)).toEqual(['p7', 'p5']);            // offset 2 now repeats p7: the classic bug
  });
});
