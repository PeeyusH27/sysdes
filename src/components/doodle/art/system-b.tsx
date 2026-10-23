import { arrow, box, circle, ellipse, line, poly, rect } from "../hand";
import type { DoodleSet } from "../types";

/** Points along an elliptical arc (degrees, screen coordinates: 0 is east, 90 is south, so growing angles run clockwise). */
function arcPts(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

/** A seed counter, so every stroke in a drawing gets its own seed. */
function seeder(base: number) {
  let n = base;
  return () => (n += 4);
}

export const systemArtsB: DoodleSet = {
  pubsub: {
    title: "Pub/sub is a radio tower: the publisher broadcasts once and every listener tuned in hears it.",
    draw: () => {
      const s = seeder(100);
      return (
        <>
          {/* the tower: the publisher */}
          <path className="d-warm" d="M40 64L28 130h34z" />
          <path className="d-hot" d={line(38, 60, 22, 128, s())} />
          <path className="d-hot" d={line(38, 60, 54, 128, s())} />
          <path className="d-hot" d={line(14, 128, 62, 128, s())} />
          <path className="d-thin" d={poly([[29, 100], [47, 100], [32, 84], [43, 84]], s(), 0.6)} />
          <path className="d-hot" d={circle(38, 52, 4, s(), 0.6)} />
          {/* three sound waves, fanning out */}
          <path className="d-accent" d={poly(arcPts(38, 52, 22, 22, -45, 45, 5), s(), 0.5)} />
          <path className="d-accent" d={poly(arcPts(38, 52, 42, 42, -45, 45, 6), s(), 0.5)} />
          <path className="d-accent" d={poly(arcPts(38, 52, 62, 62, -42, 42, 7), s(), 0.5)} />
          {/* listener 1: a little radio */}
          <path className="d-fill" d="M130 22h46v26h-46z" />
          <path className="d-line" d={box(128, 20, 46, 26, 5, s())} />
          <path className="d-line" d={circle(143, 33, 6, s(), 0.6)} />
          <path className="d-thin" d={line(156, 28, 166, 28, s())} />
          <path className="d-thin" d={line(156, 35, 166, 35, s())} />
          <path className="d-thin" d={line(164, 20, 174, 11, s())} />
          {/* listener 2: a phone */}
          <path className="d-fill" d="M144 60h24v40h-24z" />
          <path className="d-line" d={box(142, 58, 24, 40, 5, s())} />
          <path className="d-thin" d={line(148, 68, 160, 68, s())} />
          <path className="d-thin" d={line(148, 76, 158, 76, s())} />
          <path className="d-thin" d={line(152, 91, 156, 91, s())} />
          {/* listener 3: a speaker */}
          <path className="d-fill" d="M132 108h40v26h-40z" />
          <path className="d-line" d={box(130, 106, 40, 26, 4, s())} />
          <path className="d-line" d={circle(150, 121, 8, s(), 0.6)} />
          <path className="d-thin" d={circle(150, 121, 3, s(), 0.4)} />
        </>
      );
    },
  },

  idempotency: {
    title: "Idempotency is a PAID stamp on a receipt: stamping it twice still leaves it paid once.",
    draw: () => {
      const s = seeder(200);
      return (
        <>
          {/* the receipt */}
          <path className="d-fill" d="M22 88h160v48h-160z" />
          <path className="d-line" d={rect(20, 86, 160, 46, s())} />
          <path className="d-thin" d={line(28, 97, 88, 97, s())} />
          {/* the stamp mark already on it */}
          <g transform="rotate(-6 138 112)">
            <path className="d-warm" d="M108 100h62v28h-62z" />
            <path className="d-hot" d={box(106, 98, 62, 28, 6, s())} />
            <text className="d-text" x="119" y="118" fontSize="16">
              PAID
            </text>
          </g>
          {/* the second stamp that changes nothing, crossed out */}
          <path className="d-thin" d={box(30, 106, 54, 20, 5, s(), 0.6)} />
          <path className="d-thin" d={line(30, 106, 84, 126, s())} />
          <path className="d-thin" d={line(84, 106, 30, 126, s())} />
          <text className="d-text" x="20" y="76" fontSize="13">
            x2 = still 1
          </text>
          {/* the rubber stamp, lifted */}
          <path className="d-fill" d="M112 68h50v14h-50z" />
          <path className="d-line" d={box(110, 66, 50, 14, 4, s())} />
          <path className="d-line" d={line(125, 66, 129, 40, s())} />
          <path className="d-line" d={line(145, 66, 141, 40, s())} />
          <path className="d-line" d={box(119, 20, 32, 20, 8, s())} />
          <path className="d-thin" d={line(172, 38, 172, 60, s())} />
          <path className="d-thin" d={line(167, 54, 172, 61, s())} />
          <path className="d-thin" d={line(177, 54, 172, 61, s())} />
        </>
      );
    },
  },

  "consistent-hash": {
    title: "Consistent hashing is a clock face of servers: each key walks clockwise to the next server it meets.",
    draw: () => {
      const s = seeder(300);
      const C: [number, number] = [100, 76];
      const onRing = (deg: number): [number, number] => {
        const a = (deg * Math.PI) / 180;
        return [C[0] + Math.cos(a) * 50, C[1] + Math.sin(a) * 38];
      };
      const keyAt = (deg: number): [number, number] => {
        const a = (deg * Math.PI) / 180;
        return [C[0] + Math.cos(a) * 74, C[1] + Math.sin(a) * 58];
      };
      /** The path a key takes, clockwise, from its triangle to the server just ahead. */
      const hop = (keyDeg: number, serverDeg: number): [number, number][] => {
        const pts: [number, number][] = [];
        const a0 = keyDeg + 8;
        const a1 = serverDeg - 10;
        for (let i = 0; i <= 5; i++) {
          const t = i / 5;
          const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
          pts.push([C[0] + Math.cos(a) * (72 - 20 * t), C[1] + Math.sin(a) * (56 - 16 * t)]);
        }
        return pts;
      };
      const keys: { deg: number; to: number; hot: boolean }[] = [
        { deg: -52, to: 0, hot: false },
        { deg: 50, to: 90, hot: true },
        { deg: 222, to: 270, hot: false },
      ];
      return (
        <>
          <path className="d-fill" d="M56 54h90v46h-90z" />
          <path className="d-line" d={ellipse(C[0], C[1], 50, 38, s(), 1)} />
          {/* clock hands */}
          <path className="d-thin" d={line(100, 76, 100, 56, s())} />
          <path className="d-thin" d={line(100, 76, 114, 84, s())} />
          {/* four servers on the ring */}
          {[-90, 0, 90, 180].map((deg) => {
            const [x, y] = onRing(deg);
            return (
              <g key={deg}>
                <path className="d-warm" d={`M${x - 5} ${y - 4}h11v11h-11z`} />
                <path className="d-line" d={circle(x, y, 6, s(), 0.3)} />
              </g>
            );
          })}
          {/* three keys, each hopping clockwise to the next server */}
          {keys.map((k) => {
            const [x, y] = keyAt(k.deg);
            const pts = hop(k.deg, k.to);
            const cls = k.hot ? "d-hot" : "d-line";
            const tri: [number, number][] = [[x, y - 8], [x - 7.5, y + 6], [x + 7.5, y + 6]];
            return (
              <g key={k.deg}>
                {k.hot ? <path className="d-warm" d={`M${x - 6} ${y - 5}h13v12h-13z`} /> : null}
                <path className={cls} d={poly(tri, s(), 0.6, true)} />
                <path className={k.hot ? "d-hot" : "d-thin"} d={poly(pts.slice(0, -1), s(), 0.6)} />
                <path
                  className={k.hot ? "d-hot" : "d-thin"}
                  d={arrow(pts[pts.length - 2][0], pts[pts.length - 2][1], pts[pts.length - 1][0], pts[pts.length - 1][1], s(), 6)}
                />
              </g>
            );
          })}
        </>
      );
    },
  },

  "bloom-filter": {
    title: "A Bloom filter is a bouncer with a bit array: he can say 'definitely not' or 'maybe', never a sure yes.",
    draw: () => {
      const s = seeder(400);
      const X0 = 84;
      const W = 13;
      const Y = 86;
      const set = [1, 4, 6];
      return (
        <>
          {/* the bouncer, holding a clipboard */}
          <path className="d-fill" d="M52 62h22v28h-22z" />
          <path className="d-line" d={circle(34, 44, 9, s(), 0.8)} />
          <path className="d-thin" d={line(29, 43, 39, 43, s())} />
          <path className="d-line" d={line(34, 53, 34, 94, s())} />
          <path className="d-line" d={line(34, 94, 24, 126, s())} />
          <path className="d-line" d={line(34, 94, 44, 126, s())} />
          <path className="d-line" d={line(34, 64, 20, 80, s())} />
          <path className="d-line" d={line(34, 64, 54, 72, s())} />
          <path className="d-line" d={box(52, 60, 22, 28, 3, s())} />
          <path className="d-thin" d={line(57, 68, 69, 68, s())} />
          <path className="d-thin" d={line(57, 75, 69, 75, s())} />
          <path className="d-thin" d={line(57, 82, 65, 82, s())} />
          <path className="d-thin" d={line(14, 128, 60, 128, s())} />
          <text className="d-text" x="92" y="60" fontSize="15">
            maybe?
          </text>
          {/* the bit array: 8 cells, three of them set */}
          {set.map((i) => (
            <path key={i} className="d-warm" d={`M${X0 + i * W + 1} ${Y + 1}h${W}v18h-${W}z`} />
          ))}
          <path className="d-line" d={rect(X0, Y, W * 8, 18, s())} />
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} className="d-thin" d={line(X0 + (i + 1) * W, Y, X0 + (i + 1) * W, Y + 18, s(), 0.6)} />
          ))}
          {set.map((i) => (
            <path key={i} className="d-hot" d={box(X0 + i * W + 2, Y + 3, W - 4, 12, 2, s(), 0.4)} />
          ))}
          <path className="d-thin" d={arrow(76, 76, X0 + 1 * W + 6, Y - 3, s(), 6)} />
        </>
      );
    },
  },

  index: {
    title: "A database index is a book's edge tabs: jump straight to the section instead of reading every page.",
    draw: () => {
      const s = seeder(500);
      return (
        <>
          {/* the open book */}
          <path className="d-fill" d="M18 38l72 6v78l-72-6z" />
          <path className="d-fill" d="M94 44l68-6v78l-68 6z" />
          <path className="d-line" d={poly([[16, 34], [90, 42], [90, 118], [16, 110], [16, 34]], s(), 1)} />
          <path className="d-line" d={poly([[92, 42], [160, 34], [160, 110], [92, 118]], s(), 1)} />
          <path className="d-line" d={line(91, 42, 91, 118, s(), 0.6)} />
          {/* page lines */}
          <path className="d-thin" d={line(26, 52, 78, 56, s())} />
          <path className="d-thin" d={line(26, 62, 70, 65, s())} />
          <path className="d-thin" d={line(26, 72, 78, 76, s())} />
          <path className="d-thin" d={line(26, 82, 64, 85, s())} />
          <path className="d-thin" d={line(26, 92, 76, 96, s())} />
          <path className="d-thin" d={line(102, 54, 148, 50, s())} />
          <path className="d-thin" d={line(102, 64, 140, 61, s())} />
          <path className="d-thin" d={line(102, 74, 148, 71, s())} />
          <path className="d-accent" d={line(102, 86, 136, 84, s())} />
          <path className="d-thin" d={line(102, 96, 144, 93, s())} />
          {/* three edge tabs */}
          <path className="d-fill" d="M162 44h12v14h-12z" />
          <path className="d-line" d={poly([[160, 44], [173, 44], [173, 58], [160, 58]], s(), 0.6)} />
          <path className="d-warm" d="M162 66h12v14h-12z" />
          <path className="d-line" d={poly([[160, 66], [173, 66], [173, 80], [160, 80]], s(), 0.6)} />
          <path className="d-fill" d="M162 88h12v14h-12z" />
          <path className="d-line" d={poly([[160, 88], [173, 88], [173, 102], [160, 102]], s(), 0.6)} />
          {/* the jump from the tab to the line it points at */}
          <path className="d-accent" d={poly([[156, 70], [150, 62], [142, 64], [138, 72]], s(), 0.5)} />
          <path className="d-accent" d={arrow(142, 66, 137, 79, s(), 6)} />
          {/* the magnifier over the tab */}
          <path className="d-warm" d="M162 62h18v18h-18z" />
          <path className="d-hot" d={circle(170, 73, 12, s(), 0.7)} />
          <path className="d-hot" d={line(179, 82, 188, 94, s())} />
        </>
      );
    },
  },

  backoff: {
    title: "Backoff is a staircase where each retry waits about twice as long as the last, so the server gets room to recover.",
    draw: () => {
      const s = seeder(600);
      const tops = [112, 96, 68, 30];
      const xs = [22, 56, 90, 124];
      return (
        <>
          {xs.map((x, i) => (
            <path key={i} className={i === 3 ? "d-warm" : "d-fill"} d={`M${x + 2} ${tops[i] + 2}h32v${126 - tops[i]}h-32z`} />
          ))}
          {xs.map((x, i) => (
            <path key={i} className={i === 3 ? "d-hot" : "d-line"} d={rect(x, tops[i], 32, 128 - tops[i], s())} />
          ))}
          {/* a ball hopping up the steps */}
          <path className="d-thin" d={poly([[38, 108], [44, 94], [54, 88], [64, 91]], s(), 0.5)} />
          <path className="d-thin" d={arrow(60, 89, 67, 93, s(), 5)} />
          <path className="d-thin" d={poly([[72, 92], [76, 76], [86, 66], [96, 63]], s(), 0.5)} />
          <path className="d-thin" d={arrow(90, 64, 98, 62, s(), 5)} />
          <path className="d-fill" d="M102 56h14v14h-14z" />
          <path className="d-line" d={circle(106, 60, 7, s(), 0.6)} />
          {/* the clock that keeps waiting */}
          <path className="d-line" d={circle(38, 44, 12, s(), 0.7)} />
          <path className="d-thin" d={line(38, 44, 38, 36, s())} />
          <path className="d-thin" d={line(38, 44, 44, 47, s())} />
          <text className="d-text" x="164" y="82" fontSize="16">
            x2
          </text>
          <path className="d-thin" d={arrow(172, 108, 172, 90, s(), 6)} />
        </>
      );
    },
  },

  monitoring: {
    title: "Monitoring is a doctor listening to a heartbeat: the dashboard shows the pulse and the spike tells you something is wrong.",
    draw: () => {
      const s = seeder(700);
      return (
        <>
          {/* the dashboard screen */}
          <path className="d-fill" d="M17 21h122v80h-122z" />
          <path className="d-line" d={box(14, 18, 122, 80, 8, s())} />
          <path className="d-line" d={line(75, 99, 75, 114, s())} />
          <path className="d-line" d={line(50, 115, 100, 115, s(), 1)} />
          {/* the pulse, with one spike */}
          <path className="d-warm" d="M70 22h22v42h-22z" />
          <path className="d-accent" d={poly([[24, 48], [52, 48], [57, 41], [62, 48], [72, 48]], s(), 0.5)} />
          <path className="d-hot" d={poly([[72, 48], [78, 22], [85, 62], [90, 48]], s(), 0.5)} />
          <path className="d-accent" d={poly([[90, 48], [124, 48]], s(), 0.5)} />
          {/* two gauges */}
          <path className="d-line" d={circle(46, 82, 9, s(), 0.6)} />
          <path className="d-thin" d={line(46, 82, 51, 76, s())} />
          <path className="d-line" d={circle(100, 82, 9, s(), 0.6)} />
          <path className="d-thin" d={line(100, 82, 94, 77, s())} />
          {/* the stethoscope */}
          <path className="d-line" d={poly([[150, 20], [151, 40], [156, 56], [164, 64]], s(), 0.6)} />
          <path className="d-line" d={poly([[180, 20], [179, 40], [174, 56], [164, 64]], s(), 0.6)} />
          <path className="d-line" d={line(164, 64, 164, 82, s())} />
          <path className="d-fill" d="M156 86h18v18h-18z" />
          <path className="d-line" d={circle(164, 94, 10, s(), 0.6)} />
          <path className="d-thin" d={circle(164, 94, 4, s(), 0.4)} />
        </>
      );
    },
  },

  "api-gateway": {
    title: "An API gateway is a doorman at the gate: it checks every ticket and counts the rate before anyone reaches the services.",
    draw: () => {
      const s = seeder(800);
      return (
        <>
          {/* three small buildings behind the gate */}
          <path className="d-fill" d="M28 22h30v34h-30z" />
          <path className="d-fill" d="M86 14h34v42h-34z" />
          <path className="d-fill" d="M144 26h30v30h-30z" />
          <path className="d-line" d={rect(26, 20, 30, 34, s())} />
          <path className="d-line" d={rect(84, 12, 34, 42, s())} />
          <path className="d-line" d={rect(142, 24, 30, 30, s())} />
          <path className="d-thin" d={line(32, 32, 40, 32, s())} />
          <path className="d-thin" d={line(32, 42, 40, 42, s())} />
          <path className="d-thin" d={line(92, 24, 102, 24, s())} />
          <path className="d-thin" d={line(92, 34, 102, 34, s())} />
          <path className="d-thin" d={line(92, 44, 102, 44, s())} />
          <path className="d-thin" d={line(148, 34, 156, 34, s())} />
          {/* the gate arch */}
          <path className="d-line" d={rect(44, 78, 10, 52, s())} />
          <path className="d-line" d={rect(146, 78, 10, 52, s())} />
          <path className="d-line" d={poly([[42, 80], [60, 68], [100, 62], [140, 68], [158, 80]], s(), 0.8)} />
          <text className="d-text" x="86" y="78" fontSize="12">
            API
          </text>
          <path className="d-thin" d={line(20, 131, 180, 131, s())} />
          {/* the doorman */}
          <path className="d-warm" d="M80 82h40v50h-40z" />
          <path className="d-hot" d={circle(100, 93, 8, s(), 0.5)} />
          <path className="d-hot" d={line(91, 85, 109, 85, s(), 0.6)} />
          <path className="d-hot" d={line(100, 101, 100, 119, s())} />
          <path className="d-hot" d={line(100, 119, 92, 130, s())} />
          <path className="d-hot" d={line(100, 119, 108, 130, s())} />
          <path className="d-hot" d={line(100, 106, 84, 98, s())} />
          <path className="d-hot" d={line(100, 106, 118, 108, s())} />
          {/* the ticket he checks */}
          <path className="d-fill" d="M120 100h16v12h-16z" />
          <path className="d-line" d={rect(119, 99, 16, 12, s(), 0.8)} />
          <path className="d-thin" d={line(123, 105, 131, 105, s())} />
          {/* the rate-limit counter */}
          <path className="d-fill" d="M162 100h26v18h-26z" />
          <path className="d-line" d={box(160, 98, 28, 20, 4, s())} />
          <text className="d-text" x="165" y="112" fontSize="12">
            3/5
          </text>
        </>
      );
    },
  },

  cap: {
    title: "CAP is a triangle where you can only hold two corners at once: consistency, availability, partition tolerance, pick two.",
    draw: () => {
      const s = seeder(900);
      return (
        <>
          <path className="d-fill" d="M102 44L47 120h106z" />
          <path className="d-warm" d="M106 46L152 112h-20z" />
          <path className="d-line" d={poly([[100, 38], [40, 122], [160, 122]], s(), 1.4)} />
          <path className="d-hot" d={line(100, 38, 160, 122, s(), 1.4)} />
          <text className="d-text" x="94" y="30" fontSize="16">
            C
          </text>
          <text className="d-text" x="20" y="136" fontSize="16">
            A
          </text>
          <text className="d-text" x="166" y="136" fontSize="16">
            P
          </text>
          {/* the "pick 2" tag */}
          <path className="d-warm" d="M154 30h30v14h-30z" />
          <path className="d-line" d={poly([[184, 28], [153, 28], [145, 36], [153, 44], [184, 44]], s(), 0.6)} />
          <path className="d-thin" d={circle(152, 36, 2, s(), 0.3)} />
          <path className="d-line" d={poly([[162, 33], [165, 30], [169, 30], [172, 33], [172, 36], [162, 43], [173, 43]], s(), 0.4)} />
          <path className="d-thin" d={arrow(150, 48, 130, 72, s(), 6)} />
        </>
      );
    },
  },

  microservices: {
    title: "Microservices break one big block into small blocks that talk over thin wires, so each can change on its own.",
    draw: () => {
      const s = seeder(1000);
      // top-left corner, width and height of the five small blocks
      const blocks: [number, number][] = [[112, 22], [150, 22], [131, 62], [112, 102], [150, 102]];
      return (
        <>
          {/* the big monolith, labelled by lines */}
          <path className="d-fill" d="M16 36h58v80h-58z" />
          <path className="d-line" d={box(14, 32, 58, 80, 8, s())} />
          <path className="d-thin" d={line(22, 48, 62, 48, s())} />
          <path className="d-thin" d={line(22, 60, 54, 60, s())} />
          <path className="d-thin" d={line(22, 72, 62, 72, s())} />
          <path className="d-thin" d={line(22, 84, 48, 84, s())} />
          <path className="d-thin" d={line(22, 96, 58, 96, s())} />
          <path className="d-line" d={arrow(80, 72, 102, 72, s(), 8)} />
          {/* the wires between the small blocks */}
          <path className="d-hot" d={line(138, 33, 150, 33, s(), 0.6)} />
          <path className="d-hot" d={line(125, 44, 137, 62, s(), 0.6)} />
          <path className="d-hot" d={line(163, 44, 151, 62, s(), 0.6)} />
          <path className="d-hot" d={line(137, 84, 125, 102, s(), 0.6)} />
          <path className="d-hot" d={line(151, 84, 163, 102, s(), 0.6)} />
          <path className="d-hot" d={line(138, 113, 150, 113, s(), 0.6)} />
          {/* five small blocks */}
          {blocks.map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <path className="d-fill" d={`M${x + 2} ${y + 2}h26v22h-26z`} />
              <path className="d-line" d={box(x, y, 26, 22, 4, s())} />
            </g>
          ))}
        </>
      );
    },
  },
};
