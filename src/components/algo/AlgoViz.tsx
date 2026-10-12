import { highlightLines } from "@/lib/shiki";
import { AlgoPlayer } from "./AlgoPlayer";
import type { TraceSpec } from "./types";

/** MDX: <AlgoViz trace={pairSum} />. Highlights the code on the server, then hands the frames to the client player. */
export async function AlgoViz({ trace, preset, compact, autoplay, loop }: { trace: TraceSpec; preset?: string; compact?: boolean; autoplay?: boolean; loop?: boolean }) {
  const codeHtml = compact ? "" : await highlightLines(trace.code);
  return <AlgoPlayer spec={trace} codeHtml={codeHtml} preset={preset} compact={compact} autoplay={autoplay} loop={loop} />;
}
