import { requestJourney } from "@content/home";
import { requestPath } from "@content/learn/02-api-load-balancing/diagrams";
import { primaryReplica } from "@content/learn/03-databases-scaling/diagrams";
import { cacheAside } from "@content/learn/04-caching/diagrams";
import { queueWithDlq } from "@content/learn/05-async-messaging/diagrams";
import { leaderReplication } from "@content/learn/06-consistency-cap/diagrams";
import { circuitBreaker } from "@content/learn/07-reliability-observability/diagrams";
import { urlShortener } from "@content/learn/08-case-url-shortener/diagrams";
import { notificationPipeline } from "@content/learn/09-case-notification-system/diagrams";
import { shardRouter } from "@content/deep-dives/02-sharding-strategies/diagrams";
import { polyglotShop } from "@content/deep-dives/03-choosing-a-data-store/diagrams";
import { connectionPooling } from "@content/deep-dives/05-connections-pooling/diagrams";
import { architecture as chatArchitecture } from "@content/questions/chat/diagrams";
import { architecture as bookingArchitecture } from "@content/questions/movie-booking/diagrams";
import { feedArchitecture } from "@content/questions/news-feed/diagrams";
import { architecture as rateLimiterArchitecture } from "@content/questions/rate-limiter/diagrams";
import type { FlowSpec } from "@/components/diagram/types";
import type { DesignDoc } from "./schema";
import { specToDesign } from "./share";

const fromSpec = (id: string, title: string, spec: FlowSpec) => ({ id, title, doc: () => specToDesign(spec) });

export const TEMPLATES: { id: string; title: string; doc: () => DesignDoc }[] = [
  fromSpec("request-journey", "Lesson: request journey", requestJourney),
  fromSpec("request-path", "Lesson: request path + LB", requestPath),
  fromSpec("primary-replica", "Lesson: primary + replicas", primaryReplica),
  fromSpec("cache-aside", "Lesson: cache-aside", cacheAside),
  fromSpec("queue-dlq", "Lesson: queue with DLQ", queueWithDlq),
  fromSpec("leader-replication", "Lesson: leader replication", leaderReplication),
  fromSpec("circuit-breaker", "Lesson: circuit breaker", circuitBreaker),
  fromSpec("url-shortener", "Case study: URL shortener", urlShortener),
  fromSpec("notifications", "Case study: notifications", notificationPipeline),
  fromSpec("shard-router", "Deep dive: shard router", shardRouter),
  fromSpec("polyglot", "Deep dive: polyglot storage", polyglotShop),
  fromSpec("pooling", "Deep dive: connection pooling", connectionPooling),
  fromSpec("q-rate-limiter", "Question: rate limiter", rateLimiterArchitecture),
  fromSpec("q-booking", "Question: ticket booking", bookingArchitecture),
  fromSpec("q-chat", "Question: chat", chatArchitecture),
  fromSpec("q-feed", "Question: news feed", feedArchitecture),
];
