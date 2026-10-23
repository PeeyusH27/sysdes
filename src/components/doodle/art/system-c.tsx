import { arrow, circle, line, poly, rect, squiggle } from "../hand";
import type { DoodleSet } from "../types";

/** A side-on bike: wheels at (cx ± 11, cy), about 38 px wide and 26 px tall. `cls` is the pen. */
function bike(cx: number, cy: number, seed: number, cls = "d-line") {
  return (
    <>
      <path className={cls} d={circle(cx - 11, cy, 8, seed, 0.7)} />
      <path className={cls} d={circle(cx + 11, cy, 8, seed + 1, 0.7)} />
      <path className={cls} d={poly([[cx - 11, cy], [cx - 5, cy - 15], [cx + 6, cy - 15], [cx + 11, cy]], seed + 2, 0.6)} />
      <path className={cls} d={poly([[cx - 5, cy - 15], [cx, cy], [cx + 6, cy - 15]], seed + 6, 0.6)} />
      <path className={cls} d={line(cx - 10, cy - 18, cx - 2, cy - 18, seed + 9, 0.5)} />
      <path className={cls} d={line(cx + 6, cy - 15, cx + 5, cy - 22, seed + 10, 0.4)} />
    </>
  );
}

/** An index card: a wash, an outline and a few scribbled lines. Drawn around (x, y), rotated by `tilt` degrees. */
function card(x: number, y: number, w: number, h: number, tilt: number, seed: number, hot = false) {
  return (
    <g transform={`rotate(${tilt} ${x + w / 2} ${y + h / 2})`}>
      <path className={hot ? "d-warm" : "d-fill"} d={`M${x + 2} ${y + 2}h${w}v${h}h${-w}z`} />
      <path className={hot ? "d-hot" : "d-line"} d={rect(x, y, w, h, seed)} />
      <path className="d-thin" d={line(x + 5, y + 8, x + w - 10, y + 8, seed + 5)} />
      <path className="d-thin" d={squiggle(x + 5, y + 16, x + w - 14, y + 16, 1.6, 4, seed + 6)} />
      {h > 26 && <path className="d-thin" d={line(x + 5, y + 24, x + w * 0.6, y + 24, seed + 7)} />}
    </g>
  );
}

export const systemArtsC: DoodleSet = {
  "connection-pool": {
    title: "A connection pool is a bike-share dock: four bikes shared by many riders, borrowed for a trip and brought back.",
    draw: () => (
      <>
        {/* the dock: a wash under the rail */}
        <path className="d-fill" d="M14 110h164v8h-164z" />
        <path className="d-line" d={line(10, 108, 176, 108, 1, 1.2)} />
        {[51, 93, 135].map((x, i) => (
          <path key={x} className="d-thin" d={line(x, 102, x, 116, 2 + i, 0.6)} />
        ))}
        {/* two bikes waiting in their slots */}
        {bike(30, 99, 10)}
        {bike(72, 99, 20)}
        {/* a bike coming back: arrow down into the empty slot */}
        {bike(114, 58, 30, "d-accent")}
        <path className="d-accent" d={arrow(114, 72, 114, 98, 40, 7)} />
        {/* the borrowed bike, ridden away: the hot spot, arrow up and out of its slot */}
        <path className="d-warm" d="M140 16h40v62h-40z" />
        <path className="d-line" d={circle(155, 17, 6, 50, 0.6)} />
        <path className="d-line" d={poly([[155, 23], [152, 40], [158, 47]], 51, 0.6)} />
        <path className="d-line" d={poly([[155, 29], [166, 33], [167, 38]], 52, 0.6)} />
        <path className="d-line" d={poly([[152, 40], [160, 50], [157, 56]], 53, 0.6)} />
        {bike(156, 66, 60, "d-hot")}
        <path className="d-hot" d={arrow(156, 103, 156, 82, 70, 7)} />
        {/* only four */}
        <text className="d-text" x="42" y="138" fontSize="15">
          4 bikes only
        </text>
      </>
    ),
  },

  "sql-nosql": {
    title: "SQL is a tidy spreadsheet where every row has the same columns; NoSQL is a pile of index cards, each shaped as it needs to be.",
    draw: () => (
      <>
        {/* left: the spreadsheet, header row coloured in */}
        <path className="d-fill" d="M15 32h76v16h-76z" />
        <path className="d-line" d={rect(12, 30, 76, 80, 1)} />
        <path className="d-line" d={line(12, 46, 88, 46, 2, 0.8)} />
        {[31, 50, 69].map((x, i) => (
          <path key={x} className="d-thin" d={line(x, 30, x, 110, 3 + i, 0.8)} />
        ))}
        {[62, 78, 94].map((y, i) => (
          <path key={y} className="d-thin" d={line(12, y - 0.5, 88, y, 6 + i, 0.8)} />
        ))}
        {[21, 40, 59, 78].map((x, i) => (
          <path key={x} className="d-thin" d={line(x - 4, 39, x + 4, 39, 20 + i, 0.4)} />
        ))}
        <path className="d-thin" d={line(16, 54, 26, 54, 30, 0.4)} />
        <path className="d-thin" d={line(35, 70, 45, 70, 31, 0.4)} />
        <path className="d-thin" d={line(54, 86, 64, 86, 32, 0.4)} />
        <path className="d-thin" d={line(73, 54, 83, 54, 33, 0.4)} />
        <path className="d-thin" d={line(16, 102, 26, 102, 34, 0.4)} />
        <path className="d-thin" d={line(54, 70, 64, 70, 35, 0.4)} />
        {/* the thin dashed divider */}
        {[16, 32, 48, 64, 80, 96, 112].map((y, i) => (
          <path key={y} className="d-thin" d={line(100, y, 100, y + 8, 40 + i, 0.4)} />
        ))}
        {/* right: three loose cards of different sizes; the one pulled out is hot */}
        {card(108, 16, 56, 36, -4, 50)}
        {card(110, 96, 62, 26, 3, 60)}
        {card(128, 57, 46, 31, 5, 70, true)}
        <path className="d-hot" d={arrow(177, 76, 191, 70, 80, 6)} />
        <text className="d-text" x="24" y="136" fontSize="15">
          tables
        </text>
        <text className="d-text" x="112" y="140" fontSize="15">
          documents
        </text>
      </>
    ),
  },
};
