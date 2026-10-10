import { ogCard, ogSize } from "@/lib/og";

export const alt = "System Design Suite";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ eyebrow: "Learn it, then practise it", title: "System design, from scratch to interview-ready", summary: "Animated diagrams, simulators, detailed JavaScript answers and a drag-and-drop HLD playground." });
}
