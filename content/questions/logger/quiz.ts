import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "The logger app.db has no level of its own, and app is set to WARN. A DEBUG call on app.db arrives. What happens?",
    options: [
      "It is written, because app.db has no level to filter it",
      "It is dropped, because app.db inherits WARN from its nearest ancestor",
      "It is written to the root only",
    ],
    answer: 1,
    explain:
      "A logger without a level asks its parent, and so on up to the root, which always has one. Here the nearest ancestor with a level is app, so DEBUG is below the bar. This is why the check happens before the message is built.",
  },
  {
    q: "The async queue is full and the disk is slow. Which overflow policy is right for application logs?",
    options: [
      "Always block, so no line is ever lost",
      "Drop the newest and count the drops, unless the lines are an audit trail",
      "Grow the queue without a limit",
    ],
    answer: 1,
    explain:
      "A bounded queue forces the choice. Dropping protects the request path from a slow disk, and the counter tells you it happened. Blocking is right for audit lines that must not be lost. An unbounded queue just moves the outage to memory.",
  },
  {
    q: "A new appender is added while another thread is in the middle of a log call. Why is a copy-on-write list a good fit?",
    options: [
      "Adds are rare and log calls are constant, so each call can iterate a snapshot without a lock",
      "It makes adds faster than any other list",
      "It stops two appenders from writing the same line",
    ],
    answer: 0,
    explain:
      "Appenders change a few times at startup but are read on every call. Copying the list on each add costs little, and in return a log call never sees a list change under it, so it needs no lock and cannot throw a concurrent modification error.",
  },
];
