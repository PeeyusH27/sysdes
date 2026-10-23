import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Why cut a video into 4-second segments at several qualities instead of encoding one file per quality?",
    options: [
      "Segments compress better than whole files",
      "The player can switch quality at any segment boundary, and each segment is an independent task that can run in parallel and be retried",
      "Browsers cannot play files larger than 10 MB",
    ],
    answer: 1,
    explain:
      "Short, aligned segments are what make adaptive bitrate possible and what make transcoding parallel: a 10 minute video becomes 750 small tasks (150 segments x 5 qualities), and a dead worker just means one task runs again.",
  },
  {
    q: "A viewer's bandwidth measures 4 Mbps. The ladder is 0.4, 0.8, 1.2, 2.5 and 5 Mbps. Which quality does the player pick with an 80% safety margin?",
    options: ["1080p (5 Mbps)", "720p (2.5 Mbps)", "480p (1.2 Mbps)"],
    answer: 1,
    explain:
      "80% of 4 Mbps is 3.2 Mbps. 720p at 2.5 Mbps fits; 1080p at 5 Mbps does not. The margin absorbs fluctuations so the buffer does not drain mid-segment.",
  },
  {
    q: "Peak load is 5M concurrent streams at 2.5 Mbps. What serves it?",
    options: [
      "A large fleet of origin servers in one data center",
      "A CDN: about 12.5 Tbps leaves the edge and only about 5% (0.6 Tbps) reaches the origin",
      "Peer-to-peer between viewers only",
    ],
    answer: 1,
    explain:
      "5M x 2.5 Mbps is 12.5 Tbps, far beyond any single site. Segments never change, so they cache well: at a 95% hit rate the origin sees about 0.6 Tbps. The CDN is the playback system, not an add-on.",
  },
];
