import { arrow, box, circle, ellipse, line, poly, rect, squiggle } from "../hand";
import type { DoodleSet } from "../types";

/** A stick figure: head at (x, y), about 38 px tall. `cls` is the pen (d-line, or d-hot for the hot spot). */
function person(x: number, y: number, seed: number, cls = "d-line") {
  return (
    <>
      <path className={cls} d={circle(x, y, 6, seed)} />
      <path className={cls} d={line(x, y + 6, x, y + 24, seed + 1)} />
      <path className={cls} d={line(x - 8, y + 15, x + 8, y + 15, seed + 2)} />
      <path className={cls} d={line(x, y + 24, x - 6, y + 38, seed + 3)} />
      <path className={cls} d={line(x, y + 24, x + 6, y + 38, seed + 4)} />
    </>
  );
}

/** A filing cabinet with three drawers and handles. */
function cabinet(x: number, y: number, w: number, h: number, seed: number) {
  const dh = h / 3;
  const hx = x + w / 2;
  return (
    <>
      <path className="d-fill" d={`M${x + 2} ${y + 2}h${w}v${h}h${-w}z`} />
      <path className="d-line" d={rect(x, y, w, h, seed)} />
      <path className="d-line" d={line(x, y + dh, x + w, y + dh, seed + 5)} />
      <path className="d-line" d={line(x, y + dh * 2, x + w, y + dh * 2, seed + 6)} />
      <path className="d-thin" d={line(hx - 6, y + dh / 2 + 2, hx + 6, y + dh / 2 + 2, seed + 7)} />
      <path className="d-thin" d={line(hx - 6, y + dh * 1.5 + 2, hx + 6, y + dh * 1.5 + 2, seed + 8)} />
      <path className="d-thin" d={line(hx - 6, y + dh * 2.5 + 2, hx + 6, y + dh * 2.5 + 2, seed + 9)} />
    </>
  );
}

/** A shop: a box with a pointed awning. */
function shop(x: number, y: number, seed: number, hot = false) {
  return (
    <>
      {hot && <path className="d-warm" d={`M${x + 2} ${y - 6}h24v24h-24z`} />}
      <path className={hot ? "d-hot" : "d-line"} d={rect(x, y, 22, 16, seed)} />
      <path className={hot ? "d-hot" : "d-line"} d={poly([[x - 4, y], [x + 11, y - 9], [x + 26, y]], seed + 5)} />
      <path className="d-thin" d={line(x + 8, y + 16, x + 8, y + 8, seed + 9)} />
    </>
  );
}

/** A small car seen from the side. */
function car(x: number, y: number, seed: number) {
  return (
    <>
      <path className="d-line" d={rect(x, y, 30, 12, seed)} />
      <path className="d-thin" d={poly([[x + 6, y], [x + 10, y - 6], [x + 22, y - 6], [x + 25, y]], seed + 5)} />
      <path className="d-line" d={circle(x + 7, y + 14, 3, seed + 6, 0.5)} />
      <path className="d-line" d={circle(x + 23, y + 14, 3, seed + 7, 0.5)} />
    </>
  );
}

/**
 * Reference drawing for the others: a cache as a desk with sticky notes. Note the recipe, which every doodle follows:
 *  1. a wash (d-fill / d-warm) under the main shapes, drawn slightly off from the outline so it looks coloured in
 *  2. the outline in d-line, using the hand.ts helpers (never raw rect/circle elements)
 *  3. one hot spot in the warm colour for the thing the idea is about
 *  4. details in d-thin, and at most a word or two of handwriting
 */
export const systemArtsA: DoodleSet = {
  cache: {
    title: "A cache is sticky notes on your monitor: the answers you need most, within arm's reach.",
    draw: () => (
      <>
        {/* the monitor */}
        <path className="d-fill" d="M22 22h96v68H22z" />
        <path className="d-line" d={box(20, 20, 100, 70, 8, 1)} />
        <path className="d-line" d={line(70, 91, 70, 108, 2)} />
        <path className="d-line" d={line(48, 110, 94, 110, 3, 1)} />
        {/* the screen: a slow trip to the database, a long way off */}
        <path className="d-thin" d={squiggle(32, 44, 108, 44, 3, 5, 4)} />
        <path className="d-thin" d={squiggle(32, 58, 90, 58, 3, 4, 5)} />
        <path className="d-thin" d={squiggle(32, 72, 100, 72, 3, 5, 6)} />
        {/* sticky notes stuck to the side of the monitor: the answers we already know */}
        <g transform="rotate(-6 150 40)">
          <path className="d-warm" d="M132 22h38v38h-38z" />
          <path className="d-line" d={rect(130, 20, 38, 38, 7)} />
          <path className="d-thin" d={line(136, 32, 160, 32, 8)} />
          <path className="d-thin" d={line(136, 42, 154, 42, 9)} />
        </g>
        <g transform="rotate(5 150 92)">
          <path className="d-warm" d="M134 70h38v38h-38z" />
          <path className="d-line" d={rect(132, 68, 38, 38, 10)} />
          <path className="d-thin" d={line(138, 80, 162, 80, 11)} />
          <path className="d-thin" d={line(138, 90, 156, 90, 12)} />
        </g>
        <path className="d-hot" d={arrow(128, 56, 120, 50, 13, 6)} />
        <text className="d-text" x="136" y="128" fontSize="15">
          instant!
        </text>
      </>
    ),
  },

  "load-balancer": {
    title: "A load balancer is a traffic cop at a junction, waving each incoming car into one of three lanes.",
    draw: () => (
      <>
        {/* the road, coloured in */}
        <path className="d-fill" d="M98 20h92v112H98z" />
        <path className="d-warm" d="M30 44h42v70H30z" />
        {/* lane dividers */}
        <path className="d-thin" d={line(142, 55, 190, 55, 1)} />
        <path className="d-thin" d={line(142, 98, 190, 98, 2)} />
        {/* the cop: hat, raised arm, whistle hand */}
        <path className="d-hot" d={circle(52, 52, 7, 3)} />
        <path className="d-hot" d={line(44, 46, 60, 46, 4)} />
        <path className="d-hot" d={line(52, 59, 52, 88, 5)} />
        <path className="d-hot" d={line(52, 68, 84, 70, 6)} />
        <path className="d-hot" d={line(52, 68, 40, 80, 7)} />
        <path className="d-hot" d={line(52, 88, 43, 112, 8)} />
        <path className="d-hot" d={line(52, 88, 62, 112, 9)} />
        {/* one arrow per lane */}
        <path className="d-line" d={arrow(92, 72, 138, 30, 10, 8)} />
        <path className="d-line" d={arrow(92, 76, 138, 76, 11, 8)} />
        <path className="d-line" d={arrow(92, 80, 138, 122, 12, 8)} />
        {/* a car in each lane */}
        {car(150, 24, 20)}
        {car(150, 70, 30)}
        {car(150, 114, 40)}
      </>
    ),
  },

  queue: {
    title: "A queue is a line at a ticket window: people wait in order and are served one at a time.",
    draw: () => (
      <>
        {/* the booth */}
        <path className="d-fill" d="M144 42h42v66h-42z" />
        <path className="d-line" d={rect(142, 40, 42, 66, 1)} />
        <path className="d-line" d={rect(150, 52, 26, 22, 2)} />
        <path className="d-thin" d={line(146, 78, 180, 78, 3)} />
        <path className="d-thin" d={line(142, 40, 163, 28, 4)} />
        <path className="d-thin" d={line(184, 40, 163, 28, 5)} />
        {/* the ground */}
        <path className="d-thin" d={line(14, 106, 190, 106, 6, 1)} />
        {/* the person at the window is being served */}
        <path className="d-warm" d="M110 70h28v38h-28z" />
        {person(124, 70, 10, "d-hot")}
        {/* waiting in line */}
        {person(88, 70, 20)}
        {person(52, 70, 30)}
        {/* the line moves one place at a time */}
        <path className="d-line" d={arrow(34, 124, 112, 124, 40, 9)} />
        <text className="d-text" x="36" y="40" fontSize="14">
          next, please
        </text>
      </>
    ),
  },

  "circuit-breaker": {
    title: "A circuit breaker is a fuse box that flips its switch off when too much current surges in, cutting the wire to protect what is behind it.",
    draw: () => (
      <>
        {/* the fuse box */}
        <path className="d-fill" d="M82 22h50v84H82z" />
        <path className="d-line" d={rect(80, 20, 50, 84, 1)} />
        <path className="d-thin" d={line(86, 28, 124, 28, 2)} />
        <path className="d-thin" d={line(86, 96, 124, 96, 3)} />
        {/* the tripped switch: lever down at OFF */}
        <path className="d-warm" d="M97 36h18v50H97z" />
        <path className="d-hot" d={box(95, 34, 20, 50, 5, 4)} />
        <path className="d-hot" d={line(105, 44, 105, 72, 5)} />
        <path className="d-hot" d={circle(105, 74, 5, 6)} />
        {/* the cable going in, with a spark */}
        <path className="d-line" d={line(12, 54, 80, 54, 7)} />
        <path className="d-hot" d={poly([[46, 26], [40, 42], [52, 42], [43, 60]], 8, 0.6)} />
        {/* the cable going out is cut */}
        <path className="d-line" d={line(130, 72, 150, 72, 9)} />
        <path className="d-line" d={line(168, 72, 190, 72, 10)} />
        <path className="d-thin" d={line(146, 64, 154, 80, 11)} />
        <path className="d-thin" d={line(164, 64, 172, 80, 12)} />
        <text className="d-text" x="86" y="126" fontSize="14">
          tripped!
        </text>
      </>
    ),
  },

  cdn: {
    title: "A CDN is shops spread around the globe: you walk to the nearest one instead of travelling to the factory.",
    draw: () => (
      <>
        {/* the globe */}
        <path className="d-fill" d="M62 78a30 30 0 1 0 60 0a30 30 0 1 0 -60 0z" />
        <path className="d-line" d={circle(90, 74, 30, 1)} />
        <path className="d-thin" d={ellipse(90, 74, 13, 30, 2, 0.8)} />
        <path className="d-thin" d={line(60, 74, 120, 74, 3)} />
        {/* paths out to the shops */}
        <path className="d-thin" d={line(70, 52, 44, 36, 4)} />
        <path className="d-thin" d={line(110, 52, 134, 36, 5)} />
        <path className="d-thin" d={line(112, 92, 132, 104, 6)} />
        {/* far shops */}
        {shop(22, 22, 10)}
        {shop(134, 16, 20)}
        {/* the nearest shop, with a shopper beside it */}
        {shop(134, 104, 30, true)}
        {person(180, 98, 40)}
      </>
    ),
  },

  database: {
    title: "A database is a filing cabinet: everything lives in labelled drawers, and you pull out the folder you need.",
    draw: () => (
      <>
        {/* the cabinet */}
        <path className="d-fill" d="M68 20h68v112H68z" />
        <path className="d-line" d={rect(66, 18, 68, 28, 1)} />
        <path className="d-line" d={rect(66, 100, 68, 30, 2)} />
        <path className="d-thin" d={line(70, 46, 70, 70, 3)} />
        <path className="d-thin" d={line(130, 46, 130, 70, 4)} />
        {/* the middle drawer, pulled open */}
        <path className="d-line" d={rect(60, 70, 80, 28, 5)} />
        {/* a folder sticking up out of it */}
        <path className="d-warm" d="M88 52h30v20H88z" />
        <path className="d-hot" d={poly([[86, 71], [86, 54], [94, 54], [97, 49], [110, 49], [112, 54], [118, 54], [118, 71]], 6, 0.8)} />
        <path className="d-thin" d={line(122, 58, 122, 70, 7)} />
        <path className="d-thin" d={line(92, 62, 112, 62, 8)} />
        {/* handles and labels */}
        <path className="d-thin" d={line(94, 36, 106, 36, 9)} />
        <path className="d-thin" d={line(94, 90, 106, 90, 10)} />
        <path className="d-thin" d={line(94, 120, 106, 120, 11)} />
        <path className="d-thin" d={rect(92, 22, 16, 8, 12)} />
        <path className="d-thin" d={rect(92, 104, 16, 8, 13)} />
      </>
    ),
  },

  replica: {
    title: "A replica is a copy machine for a database: every change to the original cabinet is duplicated into a second one.",
    draw: () => (
      <>
        {cabinet(10, 48, 32, 72, 1)}
        {cabinet(158, 48, 32, 72, 20)}
        {/* the copy machine */}
        <path className="d-fill" d="M74 82h54v36H74z" />
        <path className="d-line" d={rect(72, 80, 54, 36, 40)} />
        <path className="d-line" d={poly([[72, 80], [80, 66], [118, 66], [126, 80]], 41)} />
        <path className="d-thin" d={line(80, 100, 118, 100, 42)} />
        <path className="d-thin" d={circle(114, 90, 2.5, 43, 0.4)} />
        <text className="d-text" x="82" y="56" fontSize="14">
          copy
        </text>
        {/* original in, copy out */}
        <path className="d-line" d={arrow(46, 96, 69, 96, 50, 7)} />
        <path className="d-warm" d="M130 88h24v18h-24z" />
        <path className="d-hot" d={arrow(128, 96, 155, 96, 51, 8)} />
      </>
    ),
  },

  shard: {
    title: "Sharding splits one overflowing cabinet into three narrower ones, each holding only one slice of the alphabet.",
    draw: () => (
      <>
        {cabinet(20, 26, 36, 84, 1)}
        {cabinet(82, 26, 36, 84, 20)}
        {cabinet(144, 26, 36, 84, 40)}
        {/* the cuts */}
        <path className="d-warm" d="M60 20h18v98H60z" />
        <path className="d-warm" d="M122 20h18v98h-18z" />
        <path className="d-hot" d={squiggle(69, 18, 69, 118, 2.5, 6, 60)} />
        <path className="d-hot" d={squiggle(131, 18, 131, 118, 2.5, 6, 61)} />
        <text className="d-text" x="38" y="132" fontSize="14" textAnchor="middle">
          A-H
        </text>
        <text className="d-text" x="100" y="132" fontSize="14" textAnchor="middle">
          I-P
        </text>
        <text className="d-text" x="162" y="132" fontSize="14" textAnchor="middle">
          Q-Z
        </text>
      </>
    ),
  },

  "rate-limiter": {
    title: "A rate limiter is a ticket gate with a counter: only a few people get through each second and the rest wait their turn.",
    draw: () => (
      <>
        <path className="d-thin" d={line(12, 106, 190, 106, 1, 1)} />
        {/* the gate post and its counter */}
        <path className="d-fill" d="M112 48h16v58h-16z" />
        <path className="d-line" d={rect(110, 46, 16, 60, 2)} />
        <path className="d-warm" d="M100 14h40v26h-40z" />
        <path className="d-hot" d={box(98, 12, 40, 26, 5, 3)} />
        <path className="d-thin" d={line(118, 38, 118, 46, 7)} />
        <text className="d-text" x="118" y="31" fontSize="15" textAnchor="middle">
          3/s
        </text>
        {/* the turnstile arms: one is the stop bar, across the way of the queue */}
        <path className="d-line" d={line(110, 76, 80, 76, 4)} />
        <path className="d-line" d={line(80, 82, 110, 82, 5)} />
        <path className="d-line" d={line(80, 76, 80, 82, 6)} />
        <path className="d-thin" d={line(88, 76, 92, 82, 10)} />
        <path className="d-thin" d={line(98, 76, 102, 82, 11)} />
        <path className="d-line" d={line(126, 76, 142, 66, 8)} />
        <path className="d-line" d={line(126, 76, 142, 88, 9)} />
        {/* two wait behind the bar, one has gone through */}
        {person(32, 68, 10)}
        {person(60, 68, 20)}
        {person(164, 68, 30)}
        <path className="d-line" d={arrow(134, 124, 178, 124, 40, 8)} />
      </>
    ),
  },

  websocket: {
    title: "A websocket is a tin-can phone: one tight string stays connected so both ends can talk at any moment.",
    draw: () => (
      <>
        {/* the left can, open end on the left */}
        <path className="d-fill" d="M22 64h34v30H22z" />
        <path className="d-line" d={line(22, 62, 54, 62, 1)} />
        <path className="d-line" d={line(22, 92, 54, 92, 2)} />
        <path className="d-line" d={line(54, 62, 54, 92, 3)} />
        <path className="d-line" d={ellipse(22, 77, 6, 15, 4)} />
        <path className="d-thin" d={line(34, 63, 34, 91, 5)} />
        {/* the right can, open end on the right */}
        <path className="d-fill" d="M146 64h34v30h-34z" />
        <path className="d-line" d={line(146, 62, 180, 62, 6)} />
        <path className="d-line" d={line(146, 92, 180, 92, 7)} />
        <path className="d-line" d={line(146, 62, 146, 92, 8)} />
        <path className="d-line" d={ellipse(180, 77, 6, 15, 9)} />
        <path className="d-thin" d={line(166, 63, 166, 91, 10)} />
        {/* the taut string */}
        <path className="d-warm" d="M56 74h88v6H56z" />
        <path className="d-hot" d={line(54, 77, 146, 77, 11, 0.8)} />
        {/* talk both ways */}
        <path className="d-line" d={arrow(70, 66, 130, 66, 12, 7)} />
        <path className="d-line" d={arrow(130, 88, 70, 88, 13, 7)} />
        {/* a speech bubble above each can */}
        <path className="d-line" d={box(20, 14, 38, 26, 8, 14)} />
        <path className="d-line" d={poly([[32, 40], [36, 50], [42, 40]], 15, 0.5)} />
        <path className="d-thin" d={line(27, 24, 50, 24, 16)} />
        <path className="d-thin" d={line(27, 32, 42, 32, 17)} />
        <path className="d-line" d={box(142, 14, 38, 26, 8, 18)} />
        <path className="d-line" d={poly([[158, 40], [164, 50], [168, 40]], 19, 0.5)} />
        <path className="d-thin" d={line(149, 24, 172, 24, 20)} />
        <path className="d-thin" d={line(149, 32, 164, 32, 21)} />
      </>
    ),
  },
};
