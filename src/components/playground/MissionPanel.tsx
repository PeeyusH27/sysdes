"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CircleCheck, CircleX, Flag, RotateCcw, Wand2 } from "lucide-react";
import type { Failure, Mission } from "./missions";

export interface MissionResult {
  step: string;
  failure: Failure | null;
}

/**
 * The guided mission: a list of steps, the current scenario, and what happened when it ran. The playground owns the
 * simulation and the design; this panel only asks it to run a step or to apply a step's fix.
 */
export function MissionPanel({
  mission, passed, result, score, onRun, onShowMe, onRestart,
}: {
  mission: Mission;
  /** How many steps have been passed so far. */
  passed: number;
  result: MissionResult | null;
  /** The design's score on the full challenge, for the finish line. */
  score: number | null;
  onRun: (index: number) => void;
  onShowMe: (index: number) => void;
  onRestart: () => void;
}) {
  const total = mission.steps.length;
  const current = Math.min(passed, total - 1);
  const [picked, setPicked] = useState(current);
  const [tries, setTries] = useState<Record<string, number>>({});

  const i = Math.min(picked, total - 1);
  const step = mission.steps[i];
  const done = i < passed;
  const here = result?.step === step.id ? result : null;
  const finished = passed >= total;
  const failedHere = (tries[step.id] ?? 0) > 0;

  const restart = () => {
    setPicked(0);
    setTries({});
    onRestart();
  };

  const run = () => {
    setTries((t) => ({ ...t, [step.id]: (t[step.id] ?? 0) + (done ? 0 : 1) }));
    onRun(i);
  };

  return (
    <div className="mission">
      <ol className="mission-steps" aria-label={`${mission.slug} mission steps`}>
        {mission.steps.map((s, k) => (
          <li key={s.id}>
            <button type="button" aria-current={k === i ? "step" : undefined} data-done={k < passed || undefined} disabled={k > passed} onClick={() => setPicked(k)}>
              <span className="mission-num">{k < passed ? <CircleCheck size={14} aria-hidden /> : k + 1}</span>
              <span>{s.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mission-body">
        <h3>
          <span className="eyebrow">
            Step {i + 1} of {total}
            {done ? " · passed" : ""}
          </span>
          {step.title}
        </h3>
        <p>{step.task}</p>
        <p className="mission-scenario">
          <Flag size={13} aria-hidden /> <b>Scenario:</b> {step.scenario.label}
        </p>
        <div className="mission-actions">
          <button type="button" className="wbtn primary" onClick={run}>
            {done ? "Run it again" : "Run the scenario"}
          </button>
          {here && !here.failure && i + 1 < total && (
            <button type="button" className="wbtn primary" onClick={() => setPicked(i + 1)}>
              Next step <ArrowRight size={13} aria-hidden />
            </button>
          )}
          {!done && (
            <button type="button" className="wbtn" onClick={() => onShowMe(i)} disabled={!failedHere} title={failedHere ? "Apply the fix to the canvas (you can undo it)" : "Try the scenario first"}>
              <Wand2 size={13} aria-hidden /> Show me the fix
            </button>
          )}
          <button type="button" className="wbtn" onClick={restart}>
            <RotateCcw size={13} aria-hidden /> Restart mission
          </button>
        </div>

        <div className="mission-result" aria-live="polite">
          {here?.failure && (
            <p className="mission-fail">
              <CircleX size={16} aria-hidden /> <span>{here.failure.message}</span>
            </p>
          )}
          {here && !here.failure && (
            <div className="mission-pass">
              <p>
                <CircleCheck size={16} aria-hidden />
                <span>
                  <b>It holds.</b> {step.lesson}{" "}
                  {step.learn && (
                    <Link href={step.learn} className="link">
                      Read more
                    </Link>
                  )}
                </span>
              </p>
              {i + 1 >= total && (
                <p className="mission-done">
                  <b>Mission complete.</b>
                  {score !== null && <> Your design scores {score}% on the full challenge.</>} Keep going in{" "}
                  <Link href={`/playground/${mission.slug}`} className="link">
                    the free challenge
                  </Link>{" "}
                  to close the gaps, with your design as it is.
                </p>
              )}
            </div>
          )}
          {!here && finished && <p className="muted">Mission complete. Pick a step to run it again, or keep going in the free challenge.</p>}
        </div>
      </div>
    </div>
  );
}
