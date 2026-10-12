import { z } from "zod";

/** How the runner turns JSON test values into what the function receives, and its return value back into JSON. */
export const IoType = z.enum(["value", "list", "tree", "list-cycle", "list[]", "node-val"]);
export type IoType = z.infer<typeof IoType>;

/**
 * exact: deep equality.  unordered: the top-level array may be in any order.
 * deep-unordered: arrays at every level may be in any order (subsets, groups, triplets).
 * float: numbers equal within 1e-5.
 */
export const Compare = z.enum(["exact", "unordered", "deep-unordered", "float"]);
export type Compare = z.infer<typeof Compare>;

export const Difficulty = z.enum(["Easy", "Medium", "Hard"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const FnTest = z.object({
  args: z.array(z.unknown()),
  expected: z.unknown(),
  explain: z.string().optional(),
});
export type FnTest = z.infer<typeof FnTest>;

export const DesignTest = z.object({
  ops: z.array(z.string()).min(1),
  args: z.array(z.array(z.unknown())),
  expected: z.array(z.unknown()),
  explain: z.string().optional(),
});
export type DesignTest = z.infer<typeof DesignTest>;

const base = {
  title: z.string().min(3),
  difficulty: Difficulty,
  /** Pattern slugs. The first one is the primary pattern (where the problem is listed first). */
  patterns: z.array(z.string()).min(1),
  /** Cheat sheet topic ids. */
  js: z.array(z.string()).default([]),
  /** Order within the primary pattern. */
  order: z.number().int().positive(),
  /** One sentence for lists and search. */
  summary: z.string().min(10),
  compare: Compare.default("exact"),
  /** JS source of `(result, args, expected) => true | "reason"` for problems with many valid answers. */
  validate: z.string().optional(),
  samples: z.number().int().positive().default(3),
  hints: z.array(z.string()).min(1),
  complexity: z.object({ time: z.string(), space: z.string() }),
  timeoutMs: z.number().int().positive().optional(),
};

export const FunctionProblem = z.object({
  ...base,
  kind: z.literal("function").default("function"),
  fn: z.string().regex(/^[A-Za-z_$][\w$]*$/),
  params: z.array(z.string()),
  /** JSDoc types for the generated starter, e.g. { params: ["number[]", "number"], returns: "number[]" }. */
  types: z.object({ params: z.array(z.string()), returns: z.string() }),
  io: z.object({ args: z.array(IoType.nullable()).optional(), returns: IoType.optional() }).optional(),
  /** Compare this argument after the call instead of the return value (in-place problems). */
  inPlace: z.number().int().min(0).optional(),
  tests: z.array(FnTest).min(4),
});

export const DesignProblem = z.object({
  ...base,
  kind: z.literal("design"),
  className: z.string().regex(/^[A-Z][\w$]*$/),
  tests: z.array(DesignTest).min(3),
});

export const ProblemMeta = z.union([DesignProblem, FunctionProblem]);
export type ProblemMeta = z.infer<typeof ProblemMeta>;
export type FunctionProblemMeta = z.infer<typeof FunctionProblem>;
export type DesignProblemMeta = z.infer<typeof DesignProblem>;

/** What the browser runner and the tests need: everything except the markdown. */
export type RunnableProblem = ProblemMeta & { slug: string };
