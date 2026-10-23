import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Why skip fan-out on write for celebrities?",
    options: ["Privacy rules", "10M writes per post would delay delivery and flood the cache", "Celebrity posts can't be cached"],
    answer: 1,
    explain:
      "Fan-out cost grows with follower count. Writing one post id into 10M feeds takes minutes and hammers Redis. So celebrity posts are stored once and merged in at read time.",
  },
  {
    q: "Which cursor prevents duplicated and skipped items when new posts keep arriving at the top?",
    options: ["A list offset (skip N)", "A page number", "A score (timestamp) cursor"],
    answer: 2,
    explain:
      "With an offset, every new post shifts the list, so the next page repeats items. A score cursor asks for posts older than the last one you saw, and new posts at the top can't disturb that.",
  },
  {
    q: "What happens to the cached feeds of users inactive for 30 days?",
    options: ["They are kept and updated forever", "They are skipped during fan-out and rebuilt on login", "They are deleted along with the account"],
    answer: 1,
    explain:
      "Fan-out to people who never read wastes writes and memory. Workers skip them, and on their next login the feed is rebuilt once by pulling from the people they follow.",
  },
];
