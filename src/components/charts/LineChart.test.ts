import { describe, expect, it } from "vitest";
import { spreadLabels, wrapLabel } from "./LineChart";
import { MIN_FLOW_SCALE, pickOrientation } from "@/components/diagram/layout";

describe("LineChart end labels", () => {
  it("wraps a long series name onto two lines at a space", () => {
    expect(wrapLabel("Average latency")).toEqual(["Average", "latency"]);
    expect(wrapLabel("Wait for a connection")).toEqual(["Wait for a", "connection"]);
    expect(wrapLabel("p99")).toEqual(["p99"]);
    expect(wrapLabel("Unbreakablelongname")).toEqual(["Unbreakablelongname"]);
  });

  it("pushes labels that end at the same height apart, keeping their order and the plot bounds", () => {
    const ys = spreadLabels(
      [
        { want: 22, lines: 2 },
        { want: 22, lines: 1 },
      ],
      12,
      200,
    );
    // first block: 26 px tall from 12; second starts at least 3 px below it
    expect(ys[0]).toBe(25);
    expect(ys[1] - 6.5).toBeGreaterThanOrEqual(ys[0] + 13 + 3);
  });

  it("leaves labels that don't collide where they are and clamps at the bottom", () => {
    expect(spreadLabels([{ want: 50, lines: 1 }, { want: 150, lines: 1 }], 0, 300)).toEqual([50, 150]);
    const [a, b] = spreadLabels([{ want: 295, lines: 1 }, { want: 296, lines: 1 }], 0, 300);
    expect(b + 6.5).toBeLessThanOrEqual(300);
    expect(b - a).toBeGreaterThanOrEqual(16);
  });
});

describe("flow diagram orientation", () => {
  const wide = { width: 900, height: 278 };
  const tall = { width: 512, height: 498 };
  it("keeps the wide layout while it can be drawn at MIN_FLOW_SCALE or more", () => {
    expect(pickOrientation(wide, tall, 900 * MIN_FLOW_SCALE)).toBe("horizontal");
    expect(pickOrientation(wide, tall, 330)).toBe("vertical");
    // the transposed layout is only used when it is narrower
    expect(pickOrientation({ width: 500, height: 200 }, { width: 600, height: 300 }, 200)).toBe("horizontal");
  });

  it("keeps a very wide diagram wide in a desktop pane instead of a tower", () => {
    // 7 columns × 3 rows: the transposed drawing would be ~700 px tall at full size
    expect(pickOrientation({ width: 1252, height: 278 }, { width: 512, height: 694 }, 610)).toBe("horizontal");
    // on a phone it still turns (the tall drawing is scaled down to the column)
    expect(pickOrientation({ width: 1252, height: 278 }, { width: 512, height: 694 }, 300)).toBe("vertical");
  });

  it("needs a little extra room to switch back to wide (no flip-flopping at the threshold)", () => {
    const at = Math.ceil(900 * MIN_FLOW_SCALE);
    expect(pickOrientation(wide, tall, at, "vertical")).toBe("vertical");
    expect(pickOrientation(wide, tall, at + 12, "vertical")).toBe("horizontal");
  });
});
