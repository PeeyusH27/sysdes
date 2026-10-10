// useTypeahead.js: debounce + abort + LRU/TTL cache, in one effect
import { useEffect, useEffectEvent, useRef, useState } from 'react';

export function useTypeahead(fetchSuggestions, { delay = 250, minChars = 2, ttlMs = 60_000, maxEntries = 100 } = {}) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'idle', items: [] });
  const cache = useRef(new Map());                                     // q -> { items, at }; Map order = LRU order
  const load = useEffectEvent((q, signal) => fetchSuggestions(q, signal));   // always the latest prop (React 19.2)

  /* eslint-disable react-hooks/set-state-in-effect -- the idle and cached results must follow the query in the same commit */ // @hide
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < minChars) { setState({ status: 'idle', items: [] }); return; }
    const hit = cache.current.get(q);
    if (hit && Date.now() - hit.at < ttlMs) { setState({ status: 'success', items: hit.items }); return; }   // instant: no wait, no request

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setState(s => ({ ...s, status: 'loading' }));                    // keep the previous items visible meanwhile
      try {
        const items = await load(q, ctrl.signal);
        if (ctrl.signal.aborted) return;                              // a newer query took over
        cache.current.delete(q);
        cache.current.set(q, { items, at: Date.now() });              // re-insert = most recently used
        if (cache.current.size > maxEntries) cache.current.delete(cache.current.keys().next().value);
        setState({ status: 'success', items });
      } catch (e) {
        if (e.name !== 'AbortError') setState({ status: 'error', items: [] });
      }
    }, delay);
    return () => { clearTimeout(timer); ctrl.abort(); };              // the next keystroke cancels the wait and the request
  }, [query, delay, minChars, ttlMs, maxEntries]);
  /* eslint-enable react-hooks/set-state-in-effect */ // @hide

  return { query, setQuery, ...state };
}
