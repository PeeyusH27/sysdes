// Feed.jsx: feed semantics, reserved media space, retry and end states
import { useInfiniteFeed } from './useInfiniteFeed.js';

export function Feed() {
  const { items, status, loadMore, sentinel } = useInfiniteFeed('/api/feed');
  return (
    <>
      <div role="feed" aria-busy={status === 'loading'} aria-label="Latest posts">
        {items.map((post, i) => (
          <article key={post.id} data-post-id={post.id} tabIndex={0} aria-labelledby={`t-${post.id}`}
                   aria-posinset={i + 1} aria-setsize={status === 'done' ? items.length : -1}>
            <h2 id={`t-${post.id}`}>{post.title}</h2>
            <img src={post.image} width={post.width} height={post.height} loading="lazy" decoding="async" alt={post.alt ?? ''} />
          </article>
        ))}
      </div>
      {status === 'error' && <button onClick={loadMore}>Couldn’t load more posts. Retry</button>}
      {status === 'done'
        ? <p role="status">You’re all caught up.</p>
        // key: a fresh observer after every page. If a short page leaves the sentinel on screen,
        // observe() reports it again; a long-lived observer would wait for a change that never comes.
        : <div key={items.length} ref={sentinel} aria-hidden style={{ height: 1 }} />}
    </>
  );
}
