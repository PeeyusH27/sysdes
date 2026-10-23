import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Why does the frontier keep one queue per host instead of one big FIFO queue?",
    options: [
      "So each host's pages are stored together on disk",
      "So the crawler can enforce a delay per host and still keep every worker busy with other hosts",
      "Because a single queue cannot hold more than a million URLs",
    ],
    answer: 1,
    explain:
      "A single FIFO would hand 5,000 URLs of one site to 200 workers at once. Per-host queues plus a heap of 'ready at' times enforce the gap per site. At a 10 s gap, 386 pages a second needs at least 3,860 hosts in play, which is easy on the open web.",
  },
  {
    q: "You must remember 5 billion URLs and can tolerate wrongly skipping about 1 in 100 new ones. What fits?",
    options: [
      "A hash set of 8-byte URL hashes in memory: about 40 GB",
      "A Bloom filter at 1%: about 6 GB, with no false negatives",
      "Ask the database 'SELECT 1 WHERE url = ?' for every extracted link",
    ],
    answer: 1,
    explain:
      "A Bloom filter needs about 9.6 bits per URL at 1%, so roughly 6 GB, against 40 GB for exact 8-byte hashes. A 'no' is always right, so nothing seen is crawled twice. The price is a few new pages lost, which a crawl of the open web can afford.",
  },
  {
    q: "A calendar page links to 'next month' forever and every page looks different. What stops the crawl from falling in?",
    options: [
      "Content fingerprints, because the pages are identical",
      "A per-host URL budget and a maximum depth",
      "Nothing needs to: the Bloom filter already skips them",
    ],
    answer: 1,
    explain:
      "Each calendar URL is new, and each page differs, so neither the URL filter nor the fingerprint catches it. Only a limit does: a budget of queued URLs per host and a depth cap. Turn a trap from infinite into bounded, and flag the host for review.",
  },
];
