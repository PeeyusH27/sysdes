// @display-only: needs a browser and the GET /api/feed/new-count endpoint
// NewPostsBanner.jsx: poll a cheap count; never insert posts above the reader without consent
import { useEffect, useState } from 'react';

export function NewPostsBanner({ newestId, onShow }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!newestId) return;
    const t = setInterval(async () => {
      if (document.hidden) return;                                    // background tabs don't poll
      const r = await fetch(`/api/feed/new-count?after=${encodeURIComponent(newestId)}`).catch(() => null);
      if (r?.ok) setCount((await r.json()).count);
    }, 30_000);
    return () => clearInterval(t);
  }, [newestId]);
  if (!count) return null;
  return <button className="new-posts" onClick={() => { setCount(0); onShow(); }}>{count} new posts ↑</button>;
}
