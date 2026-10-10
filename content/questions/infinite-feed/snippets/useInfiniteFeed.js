// useInfiniteFeed.js (fixes source bug #6: busy reset in finally, observer cleanup, abort)
import { useCallback, useEffect, useRef, useState } from 'react';

export function useInfiniteFeed(url, limit = 20) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle');                      // idle | loading | error | done
  const cursor = useRef(null), busy = useRef(false), ctrl = useRef(null);

  const loadMore = useCallback(async () => {
    if (busy.current || cursor.current === 'END') return;            // one request in flight, nothing after the end
    busy.current = true;
    setStatus('loading');
    ctrl.current = new AbortController();
    try {
      const qs = new URLSearchParams({ limit: String(limit), ...(cursor.current && { cursor: cursor.current }) });
      const res = await fetch(`${url}?${qs}`, { signal: ctrl.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data, nextCursor } = await res.json();
      setItems(prev => [...prev, ...data]);
      cursor.current = nextCursor ?? 'END';
      setStatus(nextCursor ? 'idle' : 'done');
    } catch (e) {
      if (e.name !== 'AbortError') setStatus('error');               // the UI offers Retry → loadMore()
    } finally {
      busy.current = false;                                           // the source forgot this: one error froze the feed
    }
  }, [url, limit]);

  const sentinel = useCallback(node => {                              // React 19: ref callbacks can return a cleanup
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), { rootMargin: '600px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, [loadMore]);

  useEffect(() => () => ctrl.current?.abort(), []);
  return { items, status, loadMore, sentinel };
}
