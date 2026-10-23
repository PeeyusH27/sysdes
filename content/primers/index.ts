import { primer as cache } from "./cache";
import { primer as loadBalancer } from "./load-balancer";
import { primer as replication } from "./replication";
import { primer as sharding } from "./sharding";
import { primer as consistentHashing } from "./consistent-hashing";
import { primer as queue } from "./queue";
import { primer as cdn } from "./cdn";
import { primer as dbIndex } from "./db-index";
import { primer as rateLimiter } from "./rate-limiter";
import { primer as cap } from "./cap";
import { primer as circuitBreaker } from "./circuit-breaker";
import { primer as idempotency } from "./idempotency";
import { primer as realtime } from "./realtime";
import { primer as pubSub } from "./pub-sub";
import { primer as apiGateway } from "./api-gateway";
import { primer as bloomFilter } from "./bloom-filter";
import { primer as connectionPool } from "./connection-pool";
import { primer as sqlNosql } from "./sql-nosql";
import { PRIMER_IDS, type Primer, type PrimerId } from "./types";

export { PRIMER_IDS };
export type { Primer, PrimerId };

const all: Record<PrimerId, Primer | undefined> = {
  "cache": cache,
  "load-balancer": loadBalancer,
  "replication": replication,
  "sharding": sharding,
  "consistent-hashing": consistentHashing,
  "queue": queue,
  "cdn": cdn,
  "db-index": dbIndex,
  "rate-limiter": rateLimiter,
  "cap": cap,
  "circuit-breaker": circuitBreaker,
  "idempotency": idempotency,
  "realtime": realtime,
  "pub-sub": pubSub,
  "api-gateway": apiGateway,
  "bloom-filter": bloomFilter,
  "connection-pool": connectionPool,
  "sql-nosql": sqlNosql,
};

export const getPrimer = (id: string): Primer | undefined => all[id as PrimerId];
export const primers = (): Primer[] => PRIMER_IDS.flatMap((id) => (all[id] ? [all[id]!] : []));
