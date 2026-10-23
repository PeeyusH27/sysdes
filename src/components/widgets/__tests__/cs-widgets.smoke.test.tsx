// @vitest-environment jsdom
// The widgets of the CS fundamentals track render on the server with a live readout and survive every control.
import { test, expect, beforeAll, afterEach } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { CongestionWindow } from "../CongestionWindow";
import { DeadlockLab } from "../DeadlockLab";
import { IndexCostLab } from "../IndexCostLab";

const WIDGETS = { CongestionWindow, DeadlockLab, IndexCostLab };

beforeAll(() => {
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
  });

  test(`${name} survives clicking every button and moving every slider`, () => {
    const { container } = render(<Widget />);
    for (let pass = 0; pass < 3; pass++) for (const b of container.querySelectorAll("button")) act(() => fireEvent.click(b));
    for (const r of container.querySelectorAll<HTMLInputElement>('input[type="range"]')) {
      act(() => fireEvent.change(r, { target: { value: r.max } }));
      act(() => fireEvent.change(r, { target: { value: r.min } }));
    }
    expect(container.querySelector(".readout")?.textContent?.length).toBeGreaterThan(10);
  });
}

test("the deadlock lab reaches a deadlock with opposite orders and finishes with the same order", () => {
  const { container } = render(<DeadlockLab />);
  const click = (name: RegExp) => act(() => fireEvent.click([...container.querySelectorAll("button")].find((b) => name.test(b.textContent ?? ""))!));
  click(/Alternate/);
  click(/Alternate/);
  expect(container.querySelector(".readout")?.textContent).toContain("Deadlock");
  click(/Same/);
  for (let i = 0; i < 6; i++) {
    const b = [...container.querySelectorAll("button")].find((x) => /Alternate/.test(x.textContent ?? ""))!;
    if (!(b as HTMLButtonElement).disabled) act(() => fireEvent.click(b));
  }
  expect(container.querySelector(".readout")?.textContent).toContain("finished");
});
