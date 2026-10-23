// Types for the congestion-window widget (src/components/widgets/CongestionWindow.tsx) that reuses the snippet.
export function cwndSeries(opts?: { rounds?: number; initial?: number; ssthresh?: number; loss?: { round: number; kind: "dupack" | "timeout" } | null }): number[];
export function throughputMbps(segments: number, rttMs?: number, mss?: number): number;
