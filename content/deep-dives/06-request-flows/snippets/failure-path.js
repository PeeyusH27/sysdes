import { withTimeout } from './with-timeout.js';

// Failure path: a slow or broken recommender must not take the home page down with it
export async function recommendationsFor(userId, { recommend, popularFromCache }) {
  try {
    return await withTimeout(recommend(userId), 300);
  } catch {
    return popularFromCache();                            // degrade gracefully
  }
}
