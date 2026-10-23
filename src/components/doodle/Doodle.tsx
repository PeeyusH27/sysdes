import type { CSSProperties } from "react";
import { arts } from "./registry";
import type { DoodleName } from "./names";

/**
 * A hand-drawn illustration for an idea. Decorative by default (aria-hidden), or an image with its title as the
 * accessible name when `label` is set. Colours come from the site's tokens, so it follows light and dark mode.
 *
 *   <Doodle name="cache" />                       in a lesson, beside the words
 *   <Doodle name="queue" size={120} caption />    with its one-line caption under it
 */
export function Doodle({ name, size = 160, caption = false, label = false, className = "" }: { name: DoodleName; size?: number; caption?: boolean; label?: boolean; className?: string }) {
  const art = arts[name];
  if (!art) return null;
  return (
    <figure className={`doodle ${className}`.trim()} style={{ "--doodle-size": `${size}px` } as CSSProperties}>
      <svg viewBox="0 0 200 150" role={label ? "img" : undefined} aria-label={label ? art.title : undefined} aria-hidden={label ? undefined : true} focusable="false">
        {art.draw()}
      </svg>
      {caption && <figcaption>{art.title}</figcaption>}
    </figure>
  );
}
