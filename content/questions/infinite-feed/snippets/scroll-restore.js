// @display-only: needs a browser (document, sessionStorage, CSS.escape)
// scroll-restore.js: remember the first visible post and its offset (for non-virtualized lists;
// with a virtualizer, store the index and call virtualizer.scrollToIndex on return)
// Call saveAnchor('feed') before navigating away (link click or pagehide), restoreAnchor('feed') after the cached list renders.
export function saveAnchor(key) {
  const el = [...document.querySelectorAll('[data-post-id]')].find(n => n.getBoundingClientRect().bottom > 0);
  if (el) sessionStorage.setItem(key, JSON.stringify({ id: el.dataset.postId, top: el.getBoundingClientRect().top }));
}
export function restoreAnchor(key) {
  const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null');
  const el = saved && document.querySelector(`[data-post-id="${CSS.escape(saved.id)}"]`);
  if (el) window.scrollBy(0, el.getBoundingClientRect().top - saved.top);   // same post, same offset, even if heights changed above it
}
