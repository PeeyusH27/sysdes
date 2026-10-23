import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { arts } from "@/components/doodle/registry";
import { DOODLE_NAMES } from "@/components/doodle/names";
import * as hand from "@/components/doodle/hand";

const ALLOWED_CLASSES = new Set(["d-line", "d-thin", "d-fill", "d-warm", "d-accent", "d-hot", "d-text"]);

describe("hand-drawing helpers", () => {
  it("are deterministic and produce paths", () => {
    expect(hand.line(0, 0, 50, 10, 3)).toBe(hand.line(0, 0, 50, 10, 3));
    expect(hand.line(0, 0, 50, 10, 3)).not.toBe(hand.line(0, 0, 50, 10, 4));
    for (const d of [hand.rect(10, 10, 40, 30), hand.box(10, 10, 40, 30), hand.circle(50, 50, 20), hand.arrow(0, 0, 40, 40), hand.squiggle(0, 0, 60, 0), hand.poly([[0, 0], [10, 10], [20, 0]]), hand.hatch(0, 0, 30, 30)]) {
      expect(d).toMatch(/^M-?\d/);
      expect(d).not.toMatch(/NaN|undefined/);
    }
  });
});

describe("doodles", () => {
  it("every listed doodle is drawn", () => {
    const missing = DOODLE_NAMES.filter((n) => !arts[n]);
    expect(missing, `not drawn yet: ${missing.join(", ")}`).toEqual([]);
  });

  it("every art is listed (no orphans)", () => {
    expect(Object.keys(arts).filter((n) => !(DOODLE_NAMES as readonly string[]).includes(n))).toEqual([]);
  });

  for (const name of Object.keys(arts)) {
    describe(name, () => {
      const art = arts[name];
      const html = renderToStaticMarkup(art.draw());
      it("has a sentence for a title", () => {
        expect(art.title.length).toBeGreaterThan(24);
        expect(art.title.length).toBeLessThan(140);
        expect(art.title).toMatch(/[.!?]$/);
      });
      it("is drawn with the pen helpers and the shared classes only", () => {
        expect(html, "raw shapes look machine-made: use hand.rect / box / circle").not.toMatch(/<(rect|circle|ellipse|line|polygon|polyline)\b/);
        const classes = [...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/));
        for (const c of classes) expect(ALLOWED_CLASSES.has(c), `unknown class ${c}`).toBe(true);
        expect(html).not.toMatch(/style="/);
        expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/);
        expect(html).not.toMatch(/NaN|undefined/);
      });
      it("is a drawing, not a scribble or a wall of paths", () => {
        const paths = (html.match(/<path\b/g) ?? []).length;
        expect(paths).toBeGreaterThanOrEqual(8);
        expect(paths).toBeLessThanOrEqual(90);
        expect(html.length).toBeLessThan(30_000);
      });
      it("uses handwriting sparingly", () => {
        const texts = [...html.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
        expect(texts.length).toBeLessThanOrEqual(3);
        for (const t of texts) expect(t.length, t).toBeLessThanOrEqual(14);
      });
      it("stays on the 200 × 150 canvas", () => {
        for (const m of html.matchAll(/ d="([^"]+)"/g)) {
          for (const n of m[1].matchAll(/-?\d+(\.\d+)?/g)) expect(Math.abs(Number(n[0])), `coordinate ${n[0]}`).toBeLessThan(260);
        }
      });
    });
  }
});
