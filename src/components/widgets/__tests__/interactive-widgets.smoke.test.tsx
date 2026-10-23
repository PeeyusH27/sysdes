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
import { ParkingLotSim } from "../ParkingLotSim";
import { ElevatorSim } from "../ElevatorSim";
import { VendingMachineSim } from "../VendingMachineSim";
import { LeaderboardRace } from "../LeaderboardRace";
import { PaymentFlowSim } from "../PaymentFlowSim";
import { RideMatchSim } from "../RideMatchSim";
import { HashingLab } from "../HashingLab";
import { TwoPointersLab } from "../TwoPointersLab";
import { SlidingWindowLab } from "../SlidingWindowLab";
import { PrefixSumLab } from "../PrefixSumLab";
import { BinarySearchLab } from "../BinarySearchLab";
import { StackLab } from "../StackLab";
import { IntervalsLab } from "../IntervalsLab";
import { FastSlowLab } from "../FastSlowLab";
import { ListReversalLab } from "../ListReversalLab";
import { TreeDfsLab } from "../TreeDfsLab";
import { TreeBfsLab } from "../TreeBfsLab";
import { TrieLab } from "../TrieLab";
import { HeapLab } from "../HeapLab";
import { GraphTraversalLab } from "../GraphTraversalLab";
import { TopoSortLab } from "../TopoSortLab";
import { UnionFindLab } from "../UnionFindLab";
import { ShortestPathLab } from "../ShortestPathLab";
import { BacktrackingLab } from "../BacktrackingLab";
import { GreedyLab } from "../GreedyLab";
import { Dp1dLab } from "../Dp1dLab";
import { Dp2dLab } from "../Dp2dLab";
import { BitLab } from "../BitLab";
import { DesignLab } from "../DesignLab";
import { MatrixLab } from "../MatrixLab";
import { Base62Playground } from "../Base62Playground";
import { CapacityCalculator } from "../CapacityCalculator";
import { ChatSim } from "../ChatSim";
import { FanoutCalc } from "../FanoutCalc";
import { HandshakeTimeline } from "../HandshakeTimeline";
import { HashRing } from "../HashRing";
import { InterviewTimer } from "../InterviewTimer";
import { LatencyHitRatio } from "../LatencyHitRatio";
import { LoadBalancerSim } from "../LoadBalancerSim";
import { PatternComparator } from "../PatternComparator";
import { PoolSim } from "../PoolSim";
import { PriorityLanes } from "../PriorityLanes";
import { RaftElection } from "../RaftElection";
import { ReplicationLag } from "../ReplicationLag";
import { TraceWaterfall } from "../TraceWaterfall";
import { VirtualListViz } from "../VirtualListViz";

const WIDGETS = { TokenBucketViz, FixedVsSliding, QuorumPlayground, PollingRace, QueueSim, SeatRace, DebounceViz, LRUViz, CircuitBreakerSim, AvailabilityCalc, RetryStorm, KafkaPartitions, ParkingLotSim, ElevatorSim, VendingMachineSim, LeaderboardRace, PaymentFlowSim, RideMatchSim, HashingLab, TwoPointersLab, SlidingWindowLab, PrefixSumLab, BinarySearchLab, StackLab, IntervalsLab, FastSlowLab, ListReversalLab, TreeDfsLab, TreeBfsLab, TrieLab, HeapLab, GraphTraversalLab, TopoSortLab, UnionFindLab, ShortestPathLab, BacktrackingLab, GreedyLab, Dp1dLab, Dp2dLab, BitLab, DesignLab, MatrixLab };

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
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.assign(globalThis, { IntersectionObserver: IO });
  if (!("ResizeObserver" in globalThis)) Object.assign(globalThis, { ResizeObserver: RO });
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

// Older widgets (some without an svg or a readout): they must render on the server and survive every button and slider.
const MORE_WIDGETS = { Base62Playground, CapacityCalculator, ChatSim, FanoutCalc, HandshakeTimeline, HashRing, InterviewTimer, LatencyHitRatio, LoadBalancerSim, PatternComparator, PoolSim, PriorityLanes, RaftElection, ReplicationLag, TraceWaterfall, VirtualListViz };
for (const [name, Widget] of Object.entries(MORE_WIDGETS)) {
  test(`${name} renders on the server`, () => {
    expect(renderToString(<Widget />).length).toBeGreaterThan(0);
  });

  test(`${name} survives clicking every button`, () => {
    const { container } = render(<Widget />);
    for (const b of container.querySelectorAll("button")) act(() => fireEvent.click(b));
    for (const b of container.querySelectorAll("button")) act(() => fireEvent.click(b));
    for (const r of container.querySelectorAll<HTMLInputElement>('input[type="range"]')) act(() => fireEvent.change(r, { target: { value: r.max } }));
    expect(container.querySelector(".widget, section, figure")).not.toBeNull();
  });
}
