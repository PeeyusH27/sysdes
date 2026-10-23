import type { Story } from "./types";
import { story as learnRequirementsEstimation } from "./learn/requirements-estimation";
import { story as learnApiLoadBalancing } from "./learn/api-load-balancing";
import { story as learnDatabasesScaling } from "./learn/databases-scaling";
import { story as learnCaching } from "./learn/caching";
import { story as learnAsyncMessaging } from "./learn/async-messaging";
import { story as learnConsistencyCap } from "./learn/consistency-cap";
import { story as learnReliabilityObservability } from "./learn/reliability-observability";
import { story as learnCaseUrlShortener } from "./learn/case-url-shortener";
import { story as learnCaseNotificationSystem } from "./learn/case-notification-system";
import { story as learnInterviewPlaybook } from "./learn/interview-playbook";
import { story as deepDivesCachingTechniques } from "./deep-dives/caching-techniques";
import { story as deepDivesShardingStrategies } from "./deep-dives/sharding-strategies";
import { story as deepDivesChoosingADataStore } from "./deep-dives/choosing-a-data-store";
import { story as deepDivesPollingSseWebsockets } from "./deep-dives/polling-sse-websockets";
import { story as deepDivesConnectionsPooling } from "./deep-dives/connections-pooling";
import { story as deepDivesRequestFlows } from "./deep-dives/request-flows";
import { story as questionsParkingLot } from "./questions/parking-lot";
import { story as questionsElevator } from "./questions/elevator";
import { story as questionsVendingMachine } from "./questions/vending-machine";
import { story as questionsRateLimiter } from "./questions/rate-limiter";
import { story as questionsMovieBooking } from "./questions/movie-booking";
import { story as questionsLeaderboard } from "./questions/leaderboard";
import { story as questionsPaymentSystem } from "./questions/payment-system";
import { story as questionsTypeahead } from "./questions/typeahead";
import { story as questionsInfiniteFeed } from "./questions/infinite-feed";
import { story as questionsChat } from "./questions/chat";
import { story as questionsNewsFeed } from "./questions/news-feed";
import { story as questionsRideSharing } from "./questions/ride-sharing";
import { story as patternsHashing } from "./patterns/hashing";
import { story as patternsTwoPointers } from "./patterns/two-pointers";
import { story as patternsSlidingWindow } from "./patterns/sliding-window";
import { story as patternsPrefixSum } from "./patterns/prefix-sum";
import { story as patternsBinarySearch } from "./patterns/binary-search";
import { story as patternsStack } from "./patterns/stack";
import { story as patternsIntervals } from "./patterns/intervals";
import { story as patternsFastSlowPointers } from "./patterns/fast-slow-pointers";
import { story as patternsLinkedListReversal } from "./patterns/linked-list-reversal";
import { story as patternsTreeDfs } from "./patterns/tree-dfs";
import { story as patternsTreeBfs } from "./patterns/tree-bfs";
import { story as patternsTrie } from "./patterns/trie";
import { story as patternsHeaps } from "./patterns/heaps";
import { story as patternsGraphTraversal } from "./patterns/graph-traversal";
import { story as patternsTopologicalSort } from "./patterns/topological-sort";
import { story as patternsUnionFind } from "./patterns/union-find";
import { story as patternsShortestPaths } from "./patterns/shortest-paths";
import { story as patternsBacktracking } from "./patterns/backtracking";
import { story as patternsGreedy } from "./patterns/greedy";
import { story as patternsDp1d } from "./patterns/dp-1d";
import { story as patternsDp2d } from "./patterns/dp-2d";
import { story as patternsBitManipulation } from "./patterns/bit-manipulation";
import { story as lldThinkingInObjects } from "./lld/thinking-in-objects";
import { story as lldSolid } from "./lld/solid";
import { story as lldStrategyDecorator } from "./lld/strategy-decorator";
import { story as lldStateObserver } from "./lld/state-observer";
import { story as lldCreationAndCommands } from "./lld/creation-and-commands";
import { story as lldLldPlaybook } from "./lld/lld-playbook";

export type { Scene, Story, StoryStep, LearnStep, StepTag, Tone, Predict } from "./types";
export type StorySection = "learn" | "deep-dives" | "questions" | "patterns" | "lld";
const all: Record<StorySection, Record<string, Story | undefined>> = {
  "learn": { "requirements-estimation": learnRequirementsEstimation, "api-load-balancing": learnApiLoadBalancing, "databases-scaling": learnDatabasesScaling, "caching": learnCaching, "async-messaging": learnAsyncMessaging, "consistency-cap": learnConsistencyCap, "reliability-observability": learnReliabilityObservability, "case-url-shortener": learnCaseUrlShortener, "case-notification-system": learnCaseNotificationSystem, "interview-playbook": learnInterviewPlaybook },
  "deep-dives": { "caching-techniques": deepDivesCachingTechniques, "sharding-strategies": deepDivesShardingStrategies, "choosing-a-data-store": deepDivesChoosingADataStore, "polling-sse-websockets": deepDivesPollingSseWebsockets, "connections-pooling": deepDivesConnectionsPooling, "request-flows": deepDivesRequestFlows },
  "questions": { "parking-lot": questionsParkingLot, "elevator": questionsElevator, "vending-machine": questionsVendingMachine, "rate-limiter": questionsRateLimiter, "movie-booking": questionsMovieBooking, "leaderboard": questionsLeaderboard, "payment-system": questionsPaymentSystem, "typeahead": questionsTypeahead, "infinite-feed": questionsInfiniteFeed, "chat": questionsChat, "news-feed": questionsNewsFeed, "ride-sharing": questionsRideSharing },
  "patterns": { "hashing": patternsHashing, "two-pointers": patternsTwoPointers, "sliding-window": patternsSlidingWindow, "prefix-sum": patternsPrefixSum, "binary-search": patternsBinarySearch, "stack": patternsStack, "intervals": patternsIntervals, "fast-slow-pointers": patternsFastSlowPointers, "linked-list-reversal": patternsLinkedListReversal, "tree-dfs": patternsTreeDfs, "tree-bfs": patternsTreeBfs, "trie": patternsTrie, "heaps": patternsHeaps, "graph-traversal": patternsGraphTraversal, "topological-sort": patternsTopologicalSort, "union-find": patternsUnionFind, "shortest-paths": patternsShortestPaths, "backtracking": patternsBacktracking, "greedy": patternsGreedy, "dp-1d": patternsDp1d, "dp-2d": patternsDp2d, "bit-manipulation": patternsBitManipulation },
  "lld": { "thinking-in-objects": lldThinkingInObjects, "solid": lldSolid, "strategy-decorator": lldStrategyDecorator, "state-observer": lldStateObserver, "creation-and-commands": lldCreationAndCommands, "lld-playbook": lldLldPlaybook },
};

export const getStory = (section: string, slug: string): Story | undefined => all[section as StorySection]?.[slug];
export const allStories = all;
