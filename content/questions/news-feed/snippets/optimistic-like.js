// Pure cache update for useLike.js: mark one post as liked inside TanStack's infinite-query data
// ({ pages: [{ posts, nextCursor }], pageParams }). Returns new objects; never mutates the cache.
export const likeInFeed = (data, postId) => data && {
  ...data,
  pages: data.pages.map(p => ({
    ...p,
    posts: p.posts.map(x => (x.id === postId && !x.liked ? { ...x, liked: true, likes: x.likes + 1 } : x)),   // a double tap counts once
  })),
};
