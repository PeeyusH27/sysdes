import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "100K hosts each report 100 metrics every 10 seconds. How many samples per second, and how much a day raw at 16 bytes each?",
    options: ["100K samples/s; about 140 GB a day", "1M samples/s; about 1.4 TB a day", "10M samples/s; about 14 TB a day"],
    answer: 1,
    explain:
      "100K x 100 = 10M series, and one sample per series every 10 seconds is 1M samples a second. At 16 bytes (8 for the timestamp, 8 for the value) that is 16 MB/s, or 1.38 TB a day. Delta-of-delta timestamps and XOR-compressed values cut it to roughly 1.4 bytes a sample.",
  },
  {
    q: "Your dashboard shows the p99 latency of a service over 30 days, built from 1-minute rollups. Why can't you just average the per-minute p99 values?",
    options: [
      "Averages are slow to compute",
      "The average of percentiles is not the percentile of the combined data; keep a histogram per bucket and add the histograms",
      "Percentiles cannot be stored",
    ],
    answer: 1,
    explain:
      "A p99 from a quiet minute and a p99 from a busy minute should not count equally. Store counts per latency bucket (a histogram) in every rollup. Histograms add exactly, so any window's p99 can be computed correctly from them.",
  },
  {
    q: "A CPU spike lasts 20 seconds and the rule is 'average above 90% for 5 minutes'. What happens, and why is that the design you want?",
    options: [
      "It fires after 20 seconds, to be safe",
      "The rule goes pending, then back to inactive: nobody is paged, because short blips are noise",
      "It fires after 5 minutes regardless",
    ],
    answer: 1,
    explain:
      "The for-duration turns a rule into a small state machine: inactive, pending, firing. A blip never reaches firing. The cost is detection delay (up to the for-duration), which you tune per alert: short for outages, longer for capacity warnings.",
  },
];
