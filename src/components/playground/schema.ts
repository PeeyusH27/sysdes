import { z } from "zod";
import { NODE_KINDS } from "@/components/diagram/types";

export const NodeDataSchema = z.object({
  kind: z.enum(NODE_KINDS),
  label: z.string().min(1).max(40),
  replicas: z.number().int().min(1).max(100).optional(),
  perInstanceQps: z.number().positive().max(10_000_000).optional(),
  latencyMs: z.number().min(0).max(60_000).optional(),
  hitRatio: z.number().min(0).max(1).optional(),
  qps: z.number().min(0).max(10_000_000).optional(),
  readRatio: z.number().min(0).max(1).optional(),
  role: z.enum(["dlq"]).optional(),
});

export const DesignDoc = z.object({
  version: z.literal(1),
  title: z.string().max(120),
  nodes: z
    .array(z.object({ id: z.string().max(64), position: z.object({ x: z.number(), y: z.number() }), data: NodeDataSchema }))
    .max(200),
  edges: z
    .array(
      z.object({
        id: z.string().max(140),
        source: z.string().max(64),
        target: z.string().max(64),
        data: z
          .object({
            protocol: z.string().max(20).optional(),
            async: z.boolean().optional(),
            weight: z.number().min(0).max(1).optional(),
            label: z.string().max(40).optional(),
          })
          .optional(),
      }),
    )
    .max(400),
});
export type DesignDoc = z.infer<typeof DesignDoc>;

/** Future schema versions migrate here; imports and share links always pass through parse + migrate. */
export const migrate = (doc: DesignDoc): DesignDoc => doc;
