"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { motionOk, useReader } from "./Reader";

/**
 * The pinned visual pane of a detail page, from 1080 px wide (src/app/reader.css).
 *
 * Every section's visuals stay where the MDX put them: a `.sec-stage` right after the `.sec-body` it belongs to
 * (src/lib/mdx/rehype-section-cards.mjs). Below 1080 px that is the layout. From 1080 px the text column holds only the
 * words, and this component shows ONE stage at a time, laid over the pane with `position: fixed`:
 * - The text unit (a section, or a `###` row with its own visuals) that crosses the reading line owns the pane. Text
 *   without visuals keeps the most recent visual ("From 03 · …"), or the next one before any ("Up next · …").
 * - Keyboard focus wins: a focused text block or control keeps its visual in the pane.
 * - The visual is scaled to fit the pane (laid out a little wider, then scaled), never below MIN_SCALE; if it is still
 *   too tall the pane scrolls, with a fade and a "Scroll for more" hint. A row whose visuals don't fit stacked is
 *   paged one visual at a time.
 * - Hidden stages stay mounted (widget state survives) but are `hidden` and `inert`, so they are out of the tab order
 *   and the accessibility tree, and paused (their in-view gate goes false).
 * Without JS the stages stay inline under their text (a <noscript> style in DocLayout).
 */

const WIDE = "(min-width: 1080px)";
/** The reading line, as a fraction of the viewport height (the same line the reader bar uses for the current section). */
const LINE = 0.3;
/** Never shrink a visual more than this; scroll instead. */
const MIN_SCALE = 0.8;
/** A row's visuals are paged when stacking them would need a scale below this. */
const PAGE_BELOW = 0.85;
const SWITCH_DELAY = 110;
const FADE_MS = 180;
/** Gap between the pane and the bottom of the viewport. */
const BOTTOM_GAP = 10;

interface Unit {
  body: HTMLElement;
  stage: HTMLElement | null;
  fit: HTMLElement | null;
  card: HTMLElement;
  n: string;
  title: string;
  sub: string;
  first: boolean;
}

interface Head {
  n: string;
  title: string;
  sub: string;
  relation: "here" | "from" | "next";
  page: number;
  pages: number;
}

interface Fit {
  key: string;
  s: number;
  L: number;
  h: number;
  paged: boolean;
}

export function StagePane() {
  const r = useReader();
  const pathname = usePathname();
  const paneRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const engine = useRef<{
    update: () => void;
    page: (delta: number) => void;
    reveal: () => void;
    more: () => void;
  } | null>(null);
  const [head, setHead] = useState<Head | null>(null);
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const pane = paneRef.current;
    const slot = bodyRef.current;
    const root = pane?.closest<HTMLElement>(".reader");
    if (!pane || !slot || !root) return;
    const mq = window.matchMedia(WIDE);

    let units: Unit[] = [];
    let active = -1;
    let shownRelation: Head["relation"] = "here";
    let timer = 0;
    let raf = 0;
    let fitH = 0;
    let fitW = 0;
    let settleUntil = 0;
    let fitting = false;
    let lastH = 0;
    let alive = false;
    const written = new Map<string, string>();
    /** Write a style only when it changes: this runs on every scroll frame. */
    const set = (el: HTMLElement, prop: string, value: string) => {
      const k = `${el === root ? "r" : "p"}${prop}`;
      if (written.get(k) === value) return;
      written.set(k, value);
      if (prop.startsWith("--")) el.style.setProperty(prop, value);
      else el.style.setProperty(prop, value || null);
    };
    const fits = new WeakMap<HTMLElement, Fit>();
    const pages = new WeakMap<HTMLElement, number>();
    const ro = new ResizeObserver(() => onContentResize());

    const kidsOf = (u: Unit) => [...(u.fit?.children ?? [])] as HTMLElement[];

    function collect() {
      units = [...root!.querySelectorAll<HTMLElement>(".prose .sec-body")].map((body) => {
        const card = body.closest<HTMLElement>(".sec-card")!;
        const next = body.nextElementSibling as HTMLElement | null;
        const stage = next?.classList.contains("sec-stage") ? next : null;
        const first = card.querySelector(".sec-body") === body;
        const h3 = body.firstElementChild?.tagName === "H3" ? (body.firstElementChild.textContent?.trim() ?? "") : "";
        return {
          body,
          stage,
          fit: stage?.querySelector<HTMLElement>(":scope > .sec-fit") ?? null,
          card,
          n: card.querySelector(".sec-n")?.textContent?.trim() ?? "",
          title: card.dataset.title ?? "",
          sub: first ? "" : h3,
          first,
        };
      });
    }

    /** Where the pane's stage area is on screen right now, and how much room a visual gets once the pane is pinned. */
    function place() {
      const bar = root!.querySelector<HTMLElement>(".reader-bar");
      const stick = bar ? Math.round((parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight + 8) : 116;
      set(root!, "--stick-top", `${stick}px`);
      const p = pane!.getBoundingClientRect();
      // Before the hero has scrolled away the pane starts lower: keep it inside the viewport anyway.
      const visible = Math.max(120, Math.round(window.innerHeight - Math.max(p.top, stick) - BOTTOM_GAP));
      const full = Math.round(window.innerHeight - stick - BOTTOM_GAP);
      set(pane!, "height", p.top > stick + 1 ? `${visible}px` : "");
      const s = slot!.getBoundingClientRect();
      const chrome = pane!.offsetHeight - slot!.clientHeight;
      set(root!, "--pane-x", `${Math.round(s.left)}px`);
      set(root!, "--pane-y", `${Math.round(s.top)}px`);
      set(root!, "--pane-w", `${Math.round(s.width)}px`);
      set(root!, "--pane-h", `${Math.max(0, Math.round(Math.min(s.height, window.innerHeight - BOTTOM_GAP - s.top)))}px`);
      const stage = units[active]?.stage;
      const pad = stage ? padX(stage) : 0;
      return {
        W: Math.round(s.width) - pad,
        H: full - chrome - (stage ? padY(stage) : 0),
      };
    }
    const padX = (el: HTMLElement) => {
      const cs = getComputedStyle(el);
      return (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    };
    const padY = (el: HTMLElement) => {
      const cs = getComputedStyle(el);
      return (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    };

    /** Where a unit's text starts: a card's first unit owns the card's head too. */
    const top = (u: Unit) => (u.first ? u.card : u.body).getBoundingClientRect().top;

    /** The unit whose text crosses the reading line (only units in cards that are showing). */
    function reading(): number {
      const line = window.innerHeight * LINE;
      let at = -1;
      let firstShown = -1;
      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        if (!u.body.offsetParent) continue;
        if (firstShown < 0) firstShown = i;
        if (top(u) <= line) at = i;
        else break;
      }
      return at < 0 ? firstShown : at;
    }

    /** A focused text block or control (keyboard, or an editor) keeps its visual in the pane. */
    function focused(): number {
      const a = document.activeElement as HTMLElement | null;
      if (!a || a === document.body || !root!.contains(a)) return -1;
      const typing =
        a.isContentEditable ||
        !!a.closest(".cm-editor") ||
        a.matches("textarea, select, input:not([type=range],[type=button],[type=checkbox],[type=radio],[type=submit])");
      if (!typing && !a.matches(":focus-visible")) return -1;
      const stage = a.closest(".sec-stage");
      if (stage) return units.findIndex((u) => u.stage === stage);
      const body = a.closest(".sec-body");
      if (body) {
        const i = units.findIndex((u) => u.body === body);
        return i >= 0 && units[i].stage ? i : -1;
      }
      return -1;
    }

    function owner(): { i: number; relation: Head["relation"] } {
      const f = focused();
      if (f >= 0) return { i: f, relation: "here" };
      const at = reading();
      if (at < 0) return { i: -1, relation: "here" };
      if (units[at].stage) {
        const ahead = top(units[at]) > window.innerHeight * LINE;
        return { i: at, relation: ahead ? "next" : "here" };
      }
      for (let j = at - 1; j >= 0; j--) if (units[j].stage) return { i: j, relation: "from" };
      for (let j = at + 1; j < units.length; j++) if (units[j].stage) return { i: j, relation: "next" };
      return { i: -1, relation: "here" };
    }

    function publish() {
      const u = units[active];
      if (!u) {
        setHead(null);
        return;
      }
      const kids = kidsOf(u);
      const fit = u.stage ? fits.get(u.stage) : undefined;
      const paged = !!fit?.paged && kids.length > 1;
      setHead({
        n: u.n,
        title: u.title,
        sub: u.sub,
        relation: shownRelation,
        page: paged ? (pages.get(u.stage!) ?? 0) : 0,
        pages: paged ? kids.length : 1,
      });
    }

    function checkScroll() {
      const st = units[active]?.stage;
      setScrolls(!!st && st.scrollHeight - st.clientHeight - st.scrollTop > 6);
      if (!st) return;
      // A pane that scrolls must be reachable by keyboard even when it holds nothing focusable (a long code block).
      if (st.scrollHeight > st.clientHeight + 2) {
        st.setAttribute("tabindex", "0");
        st.setAttribute("role", "region");
        st.setAttribute("aria-label", `Visual for ${units[active].title}, scrolls`);
      } else unregion(st);
    }
    const unregion = (st: HTMLElement) => {
      st.removeAttribute("tabindex");
      st.removeAttribute("role");
      st.removeAttribute("aria-label");
    };

    /** Show only page `p` of a stage's visuals (all of them when p < 0). */
    function showPage(u: Unit, p: number) {
      kidsOf(u).forEach((k, i) => {
        const off = p >= 0 && i !== p;
        k.toggleAttribute("data-pane-off", off);
        k.inert = off;
      });
    }

    /** Lay the visual out at width L and measure it. Wider layouts are usually shorter, so they scale better. */
    function measure(fitEl: HTMLElement, L: number) {
      fitEl.style.width = `${L}px`;
      const h = fitEl.offsetHeight;
      let over = 0;
      for (const sc of fitEl.querySelectorAll<HTMLElement>(".flow-scroll, .av-scroll, .algo-stage")) {
        // Only real scroll boxes count: an overflow-visible box (e.g. a pointer label hanging past the last array cell) doesn't scroll.
        if (!/auto|scroll/.test(getComputedStyle(sc).overflowX)) continue;
        over = Math.max(over, sc.scrollWidth - sc.clientWidth);
      }
      return { h, w: L + over };
    }

    /**
     * Pick a layout width L and a scale s = W / L or less so the visual fits W × H. Laying a visual out wider and scaling
     * it down makes reflowing widgets shorter and lets a drawing with a minimum width fit without a sideways scroll; a
     * drawing with a fixed aspect just scales. Never below MIN_SCALE: if nothing fits, use MIN_SCALE with the layout
     * that leaves the least to scroll.
     */
    function solve(fitEl: HTMLElement, W: number, H: number) {
      let best = { s: 0, L: W, h: 0 };
      let least = { s: MIN_SCALE, L: Math.round(W / MIN_SCALE), h: Infinity };
      const ks = [1, 0.95, 0.9, 0.85, MIN_SCALE];
      for (let i = 0; i < ks.length; i++) {
        const k = ks[i];
        const L = Math.round(W / k);
        const m = measure(fitEl, L);
        const over = m.w - L;
        // A drawing wider than the column: also try exactly the width it needs.
        if (i === 0 && over > 1 && W / m.w > MIN_SCALE) ks.splice(1, 0, W / m.w);
        if (over > 1) continue;
        const s = Math.min(k, H / m.h);
        if (s > best.s + 0.005) best = { s, L, h: m.h };
        if (k === 1 && s >= 1) break;
        if (m.h < least.h - 1) least = { s: MIN_SCALE, L, h: m.h };
      }
      if (best.s >= MIN_SCALE) return { ...best, fits: true };
      if (least.h < Infinity) return { ...least, fits: false };
      return { s: MIN_SCALE, L: least.L, h: measure(fitEl, least.L).h, fits: false };
    }

    function apply(fitEl: HTMLElement, f: { s: number; L: number; h: number }) {
      fitEl.style.width = `${f.L}px`;
      const scaled = f.s < 0.999;
      fitEl.style.transform = scaled ? `scale(${f.s.toFixed(4)})` : "";
      fitEl.style.marginBottom = scaled ? `${-Math.round(f.h * (1 - f.s))}px` : "";
      // A drawing that hit the height limit is narrower than the pane: centre it.
      const spare = Math.floor((fitW - f.L * f.s) / 2);
      fitEl.style.marginLeft = scaled && spare > 1 ? `${spare}px` : "";
      lastH = f.h;
    }

    function fitActive(force = false) {
      const u = units[active];
      if (!u?.stage || !u.fit) return;
      const { W, H } = place();
      if (W <= 0 || H <= 0) return;
      fitW = W;
      fitH = H;
      const key = `${W}x${H}`;
      const cached = fits.get(u.stage);
      fitting = true;
      if (!force && cached && cached.key === key) {
        if (cached.paged) showPage(u, pages.get(u.stage) ?? 0);
        apply(u.fit, cached);
        // Same size as last time: done. Otherwise refit below.
        if (Math.abs(u.fit.offsetHeight - cached.h) <= 4) {
          fitting = false;
          checkScroll();
          return;
        }
      }
      u.fit.style.transform = "";
      u.fit.style.marginBottom = "";
      u.fit.style.marginLeft = "";
      const kids = kidsOf(u);
      showPage(u, -1);
      let f = solve(u.fit, W, H);
      let paged = false;
      if (kids.length > 1 && (!f.fits || f.s < PAGE_BELOW)) {
        paged = true;
        const p = Math.min(pages.get(u.stage) ?? 0, kids.length - 1);
        pages.set(u.stage, p);
        showPage(u, p);
        f = solve(u.fit, W, H);
      }
      apply(u.fit, f);
      fits.set(u.stage, { key, s: f.s, L: f.L, h: f.h, paged });
      fitting = false;
      checkScroll();
    }

    function recheck(i: number) {
      const u = units[i];
      if (!alive || active !== i || !u?.fit) return;
      const wide = [...u.fit.querySelectorAll<HTMLElement>(".flow-scroll, .av-scroll, .algo-stage")].some((el) => el.scrollWidth > el.clientWidth + 1);
      if (wide || Math.abs(u.fit.offsetHeight - lastH) > 6) fitActive(true);
    }

    function onContentResize() {
      if (fitting || active < 0) return;
      const fitEl = units[active]?.fit;
      if (!fitEl) return;
      const h = fitEl.offsetHeight;
      if (Math.abs(h - lastH) <= 6) return;
      // While a visual is settling (fonts, client-only parts) it is refitted; later growth (an opened log, a longer
      // list) just makes the pane scroll, so the visual doesn't jump in size while someone is using it.
      if (performance.now() < settleUntil) fitActive(true);
      else {
        lastH = h;
        const f = fits.get(units[active].stage!);
        if (f) fitEl.style.marginBottom = f.s < 0.999 ? `${-Math.round(h * (1 - f.s))}px` : "";
        checkScroll();
      }
    }

    function show(i: number, relation: Head["relation"]) {
      shownRelation = relation;
      if (i === active) {
        publish();
        return;
      }
      const prev = units[active];
      active = i;
      for (const u of units) u.body.toggleAttribute("data-pane-owner", false);
      if (prev?.stage) {
        const st = prev.stage;
        st.inert = true;
        unregion(st);
        if (prev.fit) ro.unobserve(prev.fit);
        st.removeEventListener("scroll", checkScroll);
        const gone = () => {
          if (units[active]?.stage === st) return;
          st.hidden = true;
          st.removeAttribute("data-leaving");
        };
        if (motionOk()) {
          st.setAttribute("data-leaving", "");
          window.setTimeout(gone, FADE_MS);
        } else gone();
      }
      const u = units[i];
      if (u?.stage) {
        const st = u.stage;
        st.removeAttribute("data-leaving");
        st.hidden = false;
        st.inert = false;
        st.scrollTop = 0;
        u.body.setAttribute("data-pane-owner", "");
        settleUntil = performance.now() + 1500;
        fitActive();
        if (u.fit) ro.observe(u.fit);
        // Widgets that adapt with a ResizeObserver re-render a moment later: check the fit again once they have.
        for (const ms of [350, 1100]) window.setTimeout(() => recheck(i), ms);
        st.addEventListener("scroll", checkScroll, { passive: true });
      } else setScrolls(false);
      publish();
    }

    function update() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        place();
        // The pane grows once the hero scrolls away, so whether the shown visual still scrolls can change mid-page.
        checkScroll();
        const o = owner();
        if (o.i === active) {
          if (o.relation !== shownRelation) {
            shownRelation = o.relation;
            publish();
          }
          return;
        }
        window.clearTimeout(timer);
        // The first visual appears at once; later switches wait for the scroll to settle a moment.
        if (active < 0) show(o.i, o.relation);
        else
          timer = window.setTimeout(() => {
            const now = owner();
            show(now.i, now.relation);
          }, SWITCH_DELAY);
      });
    }

    function onResize() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { W, H } = place();
        if (W !== fitW || H !== fitH) fitActive(true);
        update();
      });
    }

    // Keyboard focus switches at once, so the next Tab can go into the visual that just appeared.
    function onFocusIn(e: FocusEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest?.(".sec-body, .sec-stage")) return;
      const f = focused();
      if (f < 0 || f === active) return;
      window.clearTimeout(timer);
      show(f, "here");
    }

    function enable() {
      alive = true;
      collect();
      if (!units.some((u) => u.stage)) return;
      root!.setAttribute("data-pane", "");
      for (const u of units) {
        if (!u.stage) continue;
        u.stage.hidden = true;
        u.stage.inert = true;
        // A focused text block brings its visual into the pane, so keyboard users can tab straight into it.
        u.body.setAttribute("tabindex", "0");
        u.body.setAttribute("data-has-stage", "");
      }
      active = -1;
      update();
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", onResize);
      root!.addEventListener("focusin", onFocusIn);
      document.fonts?.ready.then(() => alive && active >= 0 && fitActive(true));
    }

    function disable() {
      alive = false;
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", onResize);
      root!.removeEventListener("focusin", onFocusIn);
      root!.removeAttribute("data-pane");
      pane!.style.height = "";
      written.clear();
      for (const u of units) {
        u.body.removeAttribute("tabindex");
        u.body.removeAttribute("data-has-stage");
        u.body.removeAttribute("data-pane-owner");
        if (!u.stage) continue;
        u.stage.hidden = false;
        u.stage.inert = false;
        u.stage.removeAttribute("data-leaving");
        unregion(u.stage);
        u.stage.removeEventListener("scroll", checkScroll);
        if (u.fit) {
          u.fit.style.width = "";
          u.fit.style.transform = "";
          u.fit.style.marginBottom = "";
          u.fit.style.marginLeft = "";
          showPage(u, -1);
        }
      }
      active = -1;
      setHead(null);
      setScrolls(false);
    }

    engine.current = {
      update,
      page: (delta) => {
        const u = units[active];
        if (!u?.stage) return;
        const n = kidsOf(u).length;
        pages.set(u.stage, ((pages.get(u.stage) ?? 0) + delta + n) % n);
        u.stage.scrollTop = 0;
        settleUntil = performance.now() + 800;
        fitActive(true);
        publish();
      },
      reveal: () => {
        const u = units[active];
        if (!u) return;
        (u.first ? u.card : u.body).scrollIntoView({
          behavior: motionOk() ? "smooth" : "auto",
          block: "start",
        });
      },
      more: () => {
        const st = units[active]?.stage;
        st?.scrollBy({
          top: st.clientHeight * 0.7,
          behavior: motionOk() ? "smooth" : "auto",
        });
      },
    };

    const onMq = () => (mq.matches ? enable() : disable());
    if (mq.matches) enable();
    mq.addEventListener("change", onMq);
    return () => {
      mq.removeEventListener("change", onMq);
      disable();
      engine.current = null;
    };
  }, [pathname]);

  // Cards mode and section jumps change what is on screen without always scrolling.
  const mode = r?.mode;
  const current = r?.active;
  useEffect(() => {
    engine.current?.update();
  }, [mode, current]);

  const relation = head?.relation === "from" ? "From" : head?.relation === "next" ? "Up next" : "";
  return (
    <>
      <aside ref={paneRef} className="pane no-print" aria-label="Visuals for the section you are reading" data-empty={!head || undefined}>
        <div className="pane-head">
          {head ? (
            <button type="button" className="pane-title" onClick={() => engine.current?.reveal()} title="Go to this section's text">
              <span className="pane-n">{head.n}</span>
              {relation && <span className="pane-rel">{relation}</span>}
              <span className="pane-name">
                {head.title}
                {head.sub && <span className="pane-sub"> · {head.sub}</span>}
              </span>
            </button>
          ) : (
            <span className="pane-title pane-title-idle">Visuals</span>
          )}
          {head && head.pages > 1 && (
            <div className="pane-pager" role="group" aria-label="Visuals in this section">
              <button type="button" className="icon-btn" aria-label="Previous visual" onClick={() => engine.current?.page(-1)}>
                <ChevronLeft size={16} aria-hidden />
              </button>
              <span className="pane-count">
                Visual {head.page + 1} of {head.pages}
              </span>
              <button type="button" className="icon-btn" aria-label="Next visual" onClick={() => engine.current?.page(1)}>
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
          )}
        </div>
        <div ref={bodyRef} className="pane-body">
          <p className="pane-empty">The diagram or simulator for what you are reading appears here.</p>
        </div>
      </aside>
      {/* Outside the aside: the pane is a stacking context under the fixed stage, and the hint must sit above it. */}
      <button type="button" className="pane-more no-print" hidden={!scrolls} onClick={() => engine.current?.more()} tabIndex={-1} aria-hidden>
        <span className="pane-more-chip">
          Scroll for more <ChevronDown size={14} aria-hidden />
        </span>
      </button>
    </>
  );
}
