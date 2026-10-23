"use client";
import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Clapperboard, RotateCcw } from "lucide-react";
import type { SayIt } from "@content/extras";
import type { Story } from "@content/stories";
import { Doodle } from "@/components/doodle/Doodle";
import { SceneView } from "./scenes";

const TAG_LABEL = { pain: "The problem", idea: "The idea", sum: "Do the sum", choose: "Choose", fix: "The fix", catch: "The catch", skip: "When to skip it" } as const;

/**
 * The walkthrough, in two parts. "Understand it" teaches the topic from zero, step by step, each step with a real
 * example (`story.learn`). Then the animated part: one picture and one short line per step, a question now and then,
 * and the 30-second answer to end on. Arrow keys and the big buttons move through it; the written lesson is a tab away.
 */
export interface StoryProgress {
  step: number;
  picked: Record<number, number>;
  skipped: Record<number, boolean>;
}
export const START: StoryProgress = { step: 0, picked: {}, skipped: {} };

export function StoryPlayer({ story, say, title, onRead, progress, onProgress }: { story: Story; say?: SayIt; title: string; onRead?: () => void; progress: StoryProgress; onProgress: (p: StoryProgress) => void }) {
  const learn = story.learn ?? [];
  const L = learn.length;
  const total = L + story.steps.length + (say ? 1 : 0);
  const { step: i, picked, skipped } = progress;
  const setI = (step: number) => onProgress({ ...progress, step });
  const setPicked = (f: (m: Record<number, number>) => Record<number, number>) => onProgress({ ...progress, picked: f(picked) });
  const setSkipped = (f: (m: Record<number, boolean>) => Record<number, boolean>) => onProgress({ ...progress, skipped: f(skipped) });
  const box = useRef<HTMLElement>(null);
  const lesson = i < L ? learn[i] : undefined;
  const step = lesson ? undefined : story.steps[i - L];
  const part = L === 0 ? undefined : lesson ? 1 : 2;
  const last = i === total - 1;
  const go = (n: number) => setI(Math.max(0, Math.min(total - 1, n)));

  useEffect(() => {
    // keep the top of the player in view when a long step swaps in on a phone
    const r = box.current?.getBoundingClientRect();
    if (r && r.top < 0) box.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [i]);

  const partStart = i < L ? 0 : L;
  const partTotal = i < L ? L : total - L;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === "ArrowRight") go(i + 1);
    else if (e.key === "ArrowLeft") go(i - 1);
  };

  const p = step?.predict;
  const answered = p ? picked[i] : undefined;
  const locked = !!p && answered === undefined && !skipped[i];

  return (
    <section ref={box} className="story" aria-label={`${title}: walkthrough`} onKeyDown={onKey}>
      <div className="story-top">
        <p className="eyebrow">{part === 1 ? "Part 1 · Understand it" : part === 2 ? "Part 2 · See it run" : "Walkthrough"}</p>
        <p className="story-count" aria-live="polite">
          Step {i - partStart + 1} of {partTotal}
        </p>
      </div>
      <div className="story-bar" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={i + 1} aria-label="Progress">
        <span style={{ width: `${((i + 1) / total) * 100}%` }} />
        {L > 0 && <i className="story-bar-split" style={{ left: `${(L / total) * 100}%` }} />}
      </div>

      {lesson ? (
        <div className="story-step story-step--learn" key={i}>
          <div className="story-stage" data-kind="learn">
            <p className="story-eg-label">Real example</p>
            {lesson.doodle && <Doodle name={lesson.doodle} size={170} />}
            <p className="story-eg-title">{lesson.eg}</p>
            <p className="story-eg">{lesson.example}</p>
          </div>
          <div className="story-words">
            <p className="story-tag" data-tag="learn">
              Understand it
            </p>
            <h2 className="story-head">{lesson.head}</h2>
            <p className="story-body">{lesson.body}</p>
          </div>
        </div>
      ) : step ? (
        <div className="story-step" key={i}>
          <div className="story-stage" data-kind={step.scene.kind} data-locked={locked || undefined}>
            <SceneView scene={step.scene} />
          </div>
          <div className="story-words">
            <p className="story-tag" data-tag={step.tag}>
              {TAG_LABEL[step.tag]}
            </p>
            <h2 className="story-head">{step.head}</h2>
            <p className="story-line">{step.line}</p>
            {p && (
              <div className="story-predict">
                <p className="story-q">{p.q}</p>
                <div className="story-opts" role="group" aria-label="Pick an answer">
                  {p.options.map((o, k) => (
                    <button
                      key={o}
                      type="button"
                      disabled={answered !== undefined}
                      data-state={answered === undefined ? undefined : k === p.answer ? "right" : k === answered ? "wrong" : "dim"}
                      onClick={() => setPicked((s) => ({ ...s, [i]: k }))}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                {locked && (
                  <button type="button" className="story-skip" onClick={() => setSkipped((m) => ({ ...m, [i]: true }))}>
                    Just show me
                  </button>
                )}
                {answered !== undefined && (
                  <p className="story-why" role="status">
                    {answered === p.answer ? "Yes. " : "Not quite. "}
                    {p.why}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        say && (
          <div className="story-step" key="say">
            <div className="story-stage" data-kind="say">
              <ul className="st-numbers">
                {say.numbers.map((n, k) => (
                  <li key={n.label} style={{ ["--i" as string]: k }}>
                    <b>{n.value}</b>
                    <span>{n.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="story-words">
              <p className="story-tag" data-tag="idea">
                Say it in 30 seconds
              </p>
              <p className="story-say">&ldquo;{say.answer}&rdquo;</p>
              <p className="story-mention">
                <b>Bring it up first:</b> {say.mention}
              </p>
            </div>
          </div>
        )
      )}

      <div className="story-nav">
        <button type="button" className="btn" onClick={() => go(i - 1)} disabled={i === 0}>
          <ArrowLeft size={16} aria-hidden /> Back
        </button>
        <ol className="story-dots" aria-label="Steps">
          {Array.from({ length: total }, (_, k) => (
            <li key={k} data-part-start={L > 0 && k === L ? "" : undefined}>
              <button type="button" aria-label={`Step ${k + 1}`} aria-current={k === i ? "step" : undefined} data-done={k < i || undefined} onClick={() => go(k)} />
            </li>
          ))}
        </ol>
        {last ? (
          <button type="button" className="btn btn-primary" onClick={() => go(0)}>
            <RotateCcw size={16} aria-hidden /> Replay
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => go(i + 1)}>
            {L > 0 && i === L - 1 ? (
              <>
                Now watch it run <Clapperboard size={16} aria-hidden />
              </>
            ) : (
              <>
                Next <ArrowRight size={16} aria-hidden />
              </>
            )}
          </button>
        )}
      </div>
      {last && onRead && (
        <p className="story-end">
          <Check size={15} aria-hidden /> That is the idea.{" "}
          <button type="button" className="link" onClick={onRead}>
            <BookOpen size={14} aria-hidden /> Read the full lesson
          </button>
        </p>
      )}
    </section>
  );
}
