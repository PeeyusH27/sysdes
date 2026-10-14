// Runs a trace on a reader's own input, in the browser: parse the form → validate → prepare → run, with caps on the
// input (field limits) and on the output (MAX_CUSTOM_FRAMES). Never throws: every failure becomes a short message.
import { FieldError, formatInput, parseInput } from "./input";
import { FrameLimit, MAX_CUSTOM_FRAMES, note, traceSource, Tracer } from "./trace";
import type { Frame, TraceSpec } from "./types";

export type CustomRun =
  | {
      ok: true;
      frames: Frame[];
      /** The input that actually ran, as form text (after `prepare`). */
      values: Record<string, string>;
      /** What `prepare` changed, and whether the run was cut short. */
      notes: string[];
      truncated: boolean;
    }
  | { ok: false; error: string; field?: string };

/** Hard ceiling on the input as JSON, on top of each field's own caps. */
const MAX_INPUT_CHARS = 4000;

const fail = (error: string, field?: string): CustomRun => ({ ok: false, error, field });

export function runCustom(spec: TraceSpec, values: Record<string, string>, basePreset = 0): CustomRun {
  const src = traceSource(spec);
  const fields = spec.fields ?? [];
  if (!src || !fields.length) return fail("This walkthrough can't take your own input yet.");
  const { def, labels } = src;
  const base = def.presets[basePreset]?.input ?? def.presets[0].input;

  let input: Record<string, unknown>;
  try {
    input = { ...(structuredClone(base) as Record<string, unknown>), ...parseInput(fields, values) };
  } catch (e) {
    if (e instanceof FieldError) return fail(e.message, e.field);
    return fail("That input couldn't be read.");
  }
  if (JSON.stringify(input).length > MAX_INPUT_CHARS) return fail("That input is too big for a walkthrough. Try fewer values.");
  const typed = formatInput(fields, input);

  try {
    const problem = def.validate?.(input);
    if (problem) return fail(problem);
  } catch {
    return fail("That input doesn't fit this algorithm. Try one closer to the examples.");
  }

  const notes: string[] = [];
  if (def.prepare) {
    try {
      input = def.prepare(input, (n) => notes.push(n)) as Record<string, unknown>;
    } catch {
      return fail("That input doesn't fit this algorithm. Try one closer to the examples.");
    }
  }
  const shown = formatInput(fields, input);
  if (!notes.length) {
    const changed = fields.filter((f) => shown[f.key] !== typed[f.key]);
    if (changed.length) notes.push(`Adjusted to fit the algorithm: ${changed.map((f) => `${f.label} = ${shown[f.key].replace(/\n/g, "; ")}`).join(", ")}.`);
  }

  const t = new Tracer(labels, `${def.id} › your input`, MAX_CUSTOM_FRAMES);
  let truncated = false;
  try {
    def.run(t, structuredClone(input));
  } catch (e) {
    if (e instanceof FrameLimit) truncated = true;
    else {
      console.error(`[${def.id}] custom input failed`, e);
      return fail("The walkthrough can't handle that input. Try one closer to the examples.");
    }
  }
  const frames = t.frames;
  if (frames.length < 2) return fail("That input finishes before anything happens. Try a longer one.");
  if (truncated) {
    const last = frames[frames.length - 1];
    frames.push({
      ...last,
      caption: `Stopped here: a walkthrough shows at most ${MAX_CUSTOM_FRAMES} steps. A smaller input gets to the end.`,
      views: [...last.views.filter((v) => v.kind !== "note"), note(`Stopped after ${MAX_CUSTOM_FRAMES} steps`, "bad", "limit")],
    });
    notes.push(`Long input: the walkthrough stops after ${MAX_CUSTOM_FRAMES} steps.`);
  }
  return { ok: true, frames, values: shown, notes, truncated };
}
