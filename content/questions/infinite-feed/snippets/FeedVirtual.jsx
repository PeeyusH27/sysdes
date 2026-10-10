// @display-only: needs @tanstack/react-query and @tanstack/react-virtual
// FeedVirtual.jsx: TanStack Query (cache + dedupe) + TanStack Virtual (dynamic heights)
import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';

async function fetchPage({ pageParam, signal }) {
  const res = await fetch(`/api/feed?limit=20${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);                 // a 500 must become an error, not "data"
  return res.json();
}

export function FeedVirtual() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: fetchPage,
    initialPageParam: null,
    getNextPageParam: last => last.nextCursor ?? undefined,           // undefined = no more pages
  });
  const items = data?.pages.flatMap(p => p.data) ?? [];
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: hasNextPage ? items.length + 1 : items.length,             // +1 row for the loader
    getScrollElement: () => parentRef.current,
    estimateSize: () => 360,
    overscan: 5,
  });
  const rows = virtualizer.getVirtualItems();

  useEffect(() => {
    const last = rows.at(-1);
    if (last && last.index >= items.length - 1 && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [rows, items.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div ref={parentRef} style={{ height: '100dvh', overflowY: 'auto' }}>
      <div role="feed" aria-busy={isFetchingNextPage} style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {rows.map(row => (
          <div key={row.key} data-index={row.index} ref={virtualizer.measureElement}   // measures each row's real height
               style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${row.start}px)` }}>
            {items[row.index]
              ? <Post post={items[row.index]} index={row.index} setSize={hasNextPage ? -1 : items.length} />
              : <PostSkeleton />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Post({ post, index, setSize }) {
  return (
    <article data-post-id={post.id} tabIndex={0} aria-labelledby={`t-${post.id}`} aria-posinset={index + 1} aria-setsize={setSize}>
      <h2 id={`t-${post.id}`}>{post.title}</h2>
      {/* width + height reserve the box before the image loads: no layout shift */}
      <img src={post.image} width={post.width} height={post.height} loading="lazy" decoding="async" alt={post.alt ?? ''} />
    </article>
  );
}

function PostSkeleton() {
  return <div className="post-skeleton" aria-hidden style={{ height: 360 }} />;
}
