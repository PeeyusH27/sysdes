import type { ReactElement } from "react";

/**
 * One doodle: a function returning SVG children for a 200 × 150 canvas (the wrapper adds the <svg>). Draw with the
 * helpers in ./hand.ts and the classes below, and nothing else, so every doodle looks like the same person drew it:
 *   d-line    the pen: stroke only, in the text colour
 *   d-thin    a thinner pen for details
 *   d-fill    a light wash of the accent colour (fills; pair with d-line on the same or another path)
 *   d-warm    a light wash of the warm colour (use for one hot spot per drawing: the thing the idea is about)
 *   d-accent  a stroke in the accent colour
 *   d-hot     a stroke in the warm colour
 *   d-text    handwriting (use for 1 to 3 short words at most, font-size 11 to 16)
 */
export interface DoodleArt {
  /** What it shows, for screen readers and as the caption: a sentence. */
  title: string;
  draw: () => ReactElement;
}

export type DoodleSet = Record<string, DoodleArt>;
