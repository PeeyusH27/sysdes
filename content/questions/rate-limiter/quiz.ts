import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Why run the token bucket as one Lua script instead of GET, then SET?",
    options: ["Lua is faster to write", "It makes the read-modify-write atomic across all app servers", "It avoids needing a TTL"],
    answer: 1,
    explain: "Redis runs a script to completion before any other command. With separate GET and SET, two servers can read the same token count and both spend the last token.",
  },
  {
    q: "With a fixed window of 100 per minute, how many requests can get through in a few seconds around the window edge?",
    options: ["100", "Up to 200", "Up to 150"],
    answer: 1,
    explain: "A client can send 100 in the last second of one window and 100 in the first second of the next. A sliding window counter or a token bucket closes that gap.",
  },
  {
    q: "Redis is unreachable. What should the login endpoint do?",
    options: ["Fail open and allow every attempt", "Fail closed with 503 and Retry-After", "Wait until Redis comes back"],
    answer: 1,
    explain: "An outage is exactly when attackers would brute-force passwords. Normal endpoints fail open with a local bucket; login, OTP and payments fail closed. Never block waiting on the limiter.",
  },
];
