import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Why paginate the feed with a cursor instead of page numbers?",
    options: ["Shorter URLs", "Pages stay correct when new posts arrive at the top", "Browsers cache cursors better"],
    answer: 1,
    explain: "With ?page=2, five new posts shift every item down five places, so the next page repeats five posts. ?cursor=<last id> asks for posts older than the last one you have, and that never moves.",
  },
  {
    q: "What does virtualization keep small?",
    options: ["The number of mounted DOM nodes", "The JSON payload size", "The number of API requests"],
    answer: 0,
    explain: "Only the rows near the screen exist in the DOM: about 20 instead of 10,000. The data is still in memory and still fetched page by page.",
  },
  {
    q: "What does aria-setsize=\"-1\" on a feed article mean?",
    options: ["The post failed to load", "The total number of posts is unknown (more may load)", "The post is hidden from screen readers"],
    answer: 1,
    explain: "-1 tells screen readers the total is unknown. When the last page arrives, switch to the real count, so they hear 'article 212 of 212'.",
  },
];
