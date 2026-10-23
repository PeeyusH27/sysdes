// Stories for the classic low-level design questions added after the first three. One file keeps the shared index to one line.
import type { Story } from "../types";
import { story as lruCacheLld } from "./lru-cache-lld";
import { story as atm } from "./atm";
import { story as splitwise } from "./splitwise";
import { story as logger } from "./logger";
import { story as snakeAndLadder } from "./snake-and-ladder";
import { story as ticTacToe } from "./tic-tac-toe";
import { story as libraryManagement } from "./library-management";

export const lldMoreStories: Record<string, Story | undefined> = {
  "lru-cache-lld": lruCacheLld,
  "atm": atm,
  "splitwise": splitwise,
  "logger": logger,
  "snake-and-ladder": snakeAndLadder,
  "tic-tac-toe": ticTacToe,
  "library-management": libraryManagement,
};
