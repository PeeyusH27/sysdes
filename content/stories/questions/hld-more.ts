// Stories for the second batch of high-level design questions. Kept in one file so the shared index needs a single line.
import type { Story } from "../types";
import { story as webCrawler } from "./web-crawler";
import { story as videoStreaming } from "./video-streaming";
import { story as fileStorage } from "./file-storage";
import { story as keyValueStore } from "./key-value-store";
import { story as uniqueIdGenerator } from "./unique-id-generator";
import { story as collaborativeEditor } from "./collaborative-editor";
import { story as proximityService } from "./proximity-service";
import { story as distributedCache } from "./distributed-cache";
import { story as metricsMonitoring } from "./metrics-monitoring";
// @@import@@

export const hldMoreStories: Record<string, Story | undefined> = {
  "web-crawler": webCrawler,
  "video-streaming": videoStreaming,
  "file-storage": fileStorage,
  "key-value-store": keyValueStore,
  "unique-id-generator": uniqueIdGenerator,
  "collaborative-editor": collaborativeEditor,
  "proximity-service": proximityService,
  "distributed-cache": distributedCache,
  "metrics-monitoring": metricsMonitoring,
  // @@next@@
};
