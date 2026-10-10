// @vitest-environment jsdom
import { test, expect, beforeAll, afterEach } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { AvailabilityCalc } from "../AvailabilityCalc";
import { CircuitBreakerSim } from "../CircuitBreakerSim";
import { DebounceViz } from "../DebounceViz";
import { FixedVsSliding } from "../FixedVsSliding";
import { KafkaPartitions } from "../KafkaPartitions";
import { LRUViz } from "../LRUViz";
import { PollingRace } from "../PollingRace";
import { QueueSim } from "../QueueSim";
import { QuorumPlayground } from "../QuorumPlayground";
import { RetryStorm } from "../RetryStorm";
import { SeatRace } from "../SeatRace";
import { TokenBucketViz } from "../TokenBucketViz";

const WIDGETS = { TokenBucketViz, FixedVsSliding, QuorumPlayground, PollingRace, QueueSim, SeatRace, DebounceViz, LRUViz, CircuitBreakerSim, AvailabilityCalc, RetryStorm, KafkaPartitions };

beforeAll(() => {
  // jsdom lacks these browser APIs; widgets only need them to exist.
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.assign(globalThis, { IntersectionObserver: IO });
  if (!window.matchMedia)
    window.matchMedia = (q: string) =>
      ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as unknown as MediaQueryList;
});
afterEach(cleanup);

for (const [name, Widget] of Object.entries(WIDGETS)) {
  test(`${name} renders on the server with a live readout`, () => {
    const html = renderToString(<Widget />);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("<svg");
  });

  test(`${name} survives clicking every button`, () => {
    const { container } = render(<Widget />);
    const buttons = [...container.querySelectorAll("button")];
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) act(() => fireEvent.click(b));
    // and again after state changed (new buttons may have appeared)
    for (const b of container.querySelectorAll("button")) act(() => fireEvent.click(b));
    for (const r of container.querySelectorAll<HTMLInputElement>('input[type="range"]')) act(() => fireEvent.change(r, { target: { value: r.max } }));
    expect(container.querySelector(".readout")).not.toBeNull();
  });
}

test("DebounceViz records real typing", () => {
  const { container } = render(<DebounceViz />);
  const input = container.querySelector<HTMLInputElement>('input[type="text"]')!;
  for (const v of ["s", "sy", "sys"]) act(() => fireEvent.change(input, { target: { value: v } }));
  expect(container.textContent).toContain("Keystrokes3");
});
