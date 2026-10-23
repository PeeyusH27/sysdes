"use client";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Clapperboard } from "lucide-react";
import type { SayIt } from "@content/extras";
import type { Story } from "@content/stories";
import { START, StoryPlayer, type StoryProgress } from "./StoryPlayer";

type View = "story" | "read";
const KEY = "sds-view";

/**
 * A page with a story opens on the walkthrough; "Full lesson" shows the written page instead. The choice sticks, and a
 * link to a section (#why-it-matters) always opens the lesson. The page frame (`.doc`) carries `data-view`, and
 * src/app/story.css shows or hides the two halves from it, so both stay in the HTML.
 */
export function StoryShell({ story, say, title }: { story: Story; say?: SayIt; title: string }) {
  const [view, setView] = useState<View>("story");
  // Kept here, not in the player, so switching to the lesson and back keeps your place.
  const [progress, setProgress] = useState<StoryProgress>(START);
  const root = useRef<HTMLDivElement>(null);

  const apply = (v: View, remember = true) => {
    setView(v);
    root.current?.closest(".doc")?.setAttribute("data-view", v);
    if (!remember) return;
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* private mode: it just resets next visit */
    }
  };

  useEffect(() => {
    let v: View = "story";
    try {
      if (localStorage.getItem(KEY) === "read") v = "read";
    } catch {
      /* default */
    }
    if (window.location.hash.length > 1) v = "read";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(v);
    root.current?.closest(".doc")?.setAttribute("data-view", v);
  }, []);

  return (
    <div ref={root} className="story-shell">
      <div className="view-tabs seg" role="group" aria-label="How to read this page">
        <button type="button" aria-pressed={view === "story"} onClick={() => apply("story")}>
          <Clapperboard size={15} aria-hidden /> Walkthrough
        </button>
        <button type="button" aria-pressed={view === "read"} onClick={() => apply("read")}>
          <BookOpen size={15} aria-hidden /> Full lesson
        </button>
      </div>
      <div className="story-panel">
        {/* Not mounted in the written view, so its diagrams are not animating out of sight. */}
        {view === "story" && <StoryPlayer story={story} say={say} title={title} onRead={() => apply("read")} progress={progress} onProgress={setProgress} />}
      </div>
    </div>
  );
}
