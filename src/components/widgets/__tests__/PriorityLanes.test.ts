import { describe, expect, test } from "vitest";
import { CAMPAIGN, initPL, launchCampaign, oldestOtpAge, otpWaitEstimate, queued, setMode, stepPL, type PLState } from "../PriorityLanes";

const run = (s: PLState, ms: number) => {
  let out = s;
  for (let t = 0; t < ms; t += 1000) out = stepPL(out, 1000);
  return out;
};

describe("PriorityLanes simulation", () => {
  test("quiet system: OTP codes go out almost immediately in both layouts", () => {
    for (const mode of ["lanes", "shared"] as const) {
      const s = run(initPL(mode), 20_000);
      expect(s.sent.otp, mode).toBeGreaterThanOrEqual(38);
      expect(Math.max(...s.otpLat), mode).toBeLessThan(400);
    }
  });

  test("separate lanes: a 1M campaign doesn't slow OTP down", () => {
    let s = launchCampaign(run(initPL("lanes"), 5_000));
    s = run(s, 60_000);
    expect(Math.max(...s.otpLat)).toBeLessThan(400);
    expect(otpWaitEstimate(s)).toBeLessThan(1);
    expect(queued(s.q.mkt)).toBeGreaterThan(CAMPAIGN - 60 * 160);
  });

  test("one shared queue: OTP codes wait behind the whole campaign", () => {
    let s = launchCampaign(run(initPL("shared"), 5_000));
    s = run(s, 60_000);
    expect(oldestOtpAge(s)).toBeGreaterThan(55_000); // stuck since launch
    expect(otpWaitEstimate(s)).toBeGreaterThan(4_000); // ~1M ÷ 200/s
    // nothing sent after the launch can have been delivered
    expect(s.otpLat.every((l) => l < 400)).toBe(true);
  });

  test("switching layouts keeps every waiting message, in arrival order", () => {
    let s = launchCampaign(run(initPL("lanes"), 3_000));
    s = run(s, 2_000);
    const before = queued(s.q.otp) + queued(s.q.mkt);
    const shared = setMode(s, "shared");
    expect(queued(shared.q.shared)).toBe(before);
    expect(shared.q.shared.map((g) => g.enq)).toEqual([...shared.q.shared.map((g) => g.enq)].sort((a, b) => a - b));
    const back = setMode(shared, "lanes");
    expect(queued(back.q.otp) + queued(back.q.mkt)).toBe(before);
  });
});
