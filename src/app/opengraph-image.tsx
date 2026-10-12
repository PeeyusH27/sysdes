import { ogCard, ogSize } from "@/lib/og";

export const alt = "DSA & System Design";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ eyebrow: "Learn it, then practise it", title: "DSA patterns and system design, interview-ready", summary: "Step-by-step algorithm animations, an in-browser JavaScript editor, animated system diagrams and a graded HLD playground." });
}
