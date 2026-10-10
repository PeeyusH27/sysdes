// Simple, explainable scoring. Engagement decays with age (HN-style gravity), boosted by affinity.
export function score(post, viewer, now = Date.now()) {
  const ageHours = (now - post.createdAt) / 3_600_000;
  const engagement = post.likes + 2 * post.comments + 3 * post.shares;
  const affinity = viewer.affinity[post.authorId] ?? 1;           // 1–3, from past interactions
  return (affinity * (engagement + 1)) / Math.pow(ageHours + 2, 1.5);
}

// Rank a candidate set (e.g. the newest 300 from getFeed), not the whole history. Returns a new array.
export const rank = (posts, viewer, now = Date.now()) =>
  posts
    .map(post => ({ post, s: score(post, viewer, now) }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.post);
