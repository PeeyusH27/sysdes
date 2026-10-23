import { arrow, box, circle, ellipse, line, poly, rect, squiggle } from "../hand";
import type { DoodleSet } from "../types";

/** A curved arrow: a quadratic curve through the control point, with an open head along its end tangent. */
function curveArrow(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, seed = 1, head = 7): string {
  const j = (n: number) => Math.round((n + Math.sin(seed * 12.9898 + n) * 0.8) * 10) / 10;
  const a = Math.atan2(y2 - cy, x2 - cx);
  const h = (da: number) => `M${x2} ${y2}L${Math.round((x2 - Math.cos(a + da) * head) * 10) / 10} ${Math.round((y2 - Math.sin(a + da) * head) * 10) / 10}`;
  return `M${x1} ${y1}Q${j(cx)} ${j(cy)} ${x2} ${y2}${h(0.5)}${h(-0.5)}`;
}

/** A wash for a circle, a hair off-centre so it looks coloured in. */
const disc = (cx: number, cy: number, r: number) => `M${cx - r + 2} ${cy + 2}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;

export const lldArts: DoodleSet = {
  "state-machine": {
    title: "A state machine is a vending machine: it is always in one state, and each event moves it to the next.",
    draw: () => (
      <>
        {/* the vending machine */}
        <path className="d-fill" d="M14 22h54v94h-54z" />
        <path className="d-line" d={box(12, 20, 54, 94, 6, 1)} />
        <path className="d-line" d={rect(18, 28, 32, 48, 2)} />
        <path className="d-thin" d={circle(26, 38, 4, 3)} />
        <path className="d-thin" d={circle(40, 38, 4, 4)} />
        <path className="d-thin" d={rect(22, 50, 8, 9, 5)} />
        <path className="d-thin" d={rect(36, 50, 8, 9, 6)} />
        <path className="d-thin" d={rect(22, 64, 8, 8, 7)} />
        <path className="d-thin" d={rect(36, 64, 8, 8, 8)} />
        <path className="d-thin" d={circle(58, 34, 2, 9, 0.5)} />
        <path className="d-thin" d={circle(58, 44, 2, 10, 0.5)} />
        <path className="d-thin" d={line(54, 58, 62, 58, 11, 0.5)} />
        <path className="d-line" d={box(20, 88, 32, 16, 3, 12)} />
        <path className="d-line" d={line(20, 114, 17, 124, 13)} />
        <path className="d-line" d={line(58, 114, 61, 124, 14)} />
        {/* the three states */}
        <path className="d-fill" d={disc(96, 40, 17)} />
        <path className="d-line" d={circle(96, 40, 17, 15)} />
        <path className="d-warm" d={disc(162, 40, 17)} />
        <path className="d-hot" d={circle(162, 40, 17, 16)} />
        <path className="d-fill" d={disc(129, 108, 17)} />
        <path className="d-line" d={circle(129, 108, 17, 17)} />
        {/* the transitions */}
        <path className="d-line" d={curveArrow(109, 26, 129, 8, 149, 26, 1)} />
        <path className="d-line" d={curveArrow(160, 57, 166, 86, 142, 96, 2)} />
        <path className="d-line" d={curveArrow(116, 97, 92, 90, 97, 58, 3)} />
        <text className="d-text" x="96" y="44" fontSize="12" textAnchor="middle">
          idle
        </text>
        <text className="d-text" x="162" y="44" fontSize="12" textAnchor="middle">
          paid
        </text>
        <text className="d-text" x="129" y="112" fontSize="12" textAnchor="middle">
          vend
        </text>
      </>
    ),
  },

  strategy: {
    title: "The strategy pattern is a game console with swappable cartridges: same device, different behaviour plugged in.",
    draw: () => (
      <>
        {/* the console */}
        <path className="d-fill" d="M16 58h84v56h-84z" />
        <path className="d-line" d={box(14, 56, 84, 56, 10, 1)} />
        <path className="d-line" d={rect(24, 70, 36, 28, 2)} />
        <path className="d-thin" d={line(30, 80, 52, 80, 3)} />
        <path className="d-thin" d={line(30, 88, 44, 88, 4)} />
        <path className="d-thin" d={line(72, 84, 86, 84, 5)} />
        <path className="d-thin" d={line(79, 77, 79, 91, 6)} />
        <path className="d-thin" d={circle(82, 100, 3, 7, 0.4)} />
        {/* the slot, with the cartridge halfway in */}
        <path className="d-warm" d="M42 22h30v36h-30z" />
        <path className="d-hot" d={poly([[40, 56], [40, 24], [48, 20], [70, 20], [70, 56]], 8, 0.8)} />
        <path className="d-hot" d={rect(47, 28, 16, 10, 9, 0.6)} />
        <path className="d-hot" d={line(47, 46, 63, 46, 10)} />
        <path className="d-line" d={line(34, 56, 78, 56, 11, 0.6)} />
        {/* the spare cartridges */}
        <path className="d-fill" d="M114 76h22v36h-22z" />
        <path className="d-line" d={poly([[112, 112], [112, 74], [136, 74], [136, 112]], 12, 0.8)} />
        <path className="d-thin" d={circle(124, 90, 5, 13, 0.5)} />
        <path className="d-thin" d={line(117, 104, 131, 104, 14, 0.5)} />
        <path className="d-fill" d="M140 76h22v36h-22z" />
        <path className="d-line" d={poly([[138, 112], [138, 80], [144, 74], [162, 74], [162, 112]], 15, 0.8)} />
        <path className="d-thin" d={poly([[150, 82], [157, 96], [143, 96]], 16, 0.5, true)} />
        <path className="d-fill" d="M166 76h22v36h-22z" />
        <path className="d-line" d={poly([[164, 112], [164, 74], [188, 74], [188, 112]], 17, 0.8)} />
        <path className="d-thin" d={rect(171, 82, 12, 12, 18, 0.4)} />
        <path className="d-thin" d={line(169, 104, 183, 104, 19, 0.5)} />
        {/* swap it */}
        <path className="d-hot" d={curveArrow(150, 66, 128, 16, 80, 30, 4, 7)} />
      </>
    ),
  },

  observer: {
    title: "The observer pattern is a bell that rings once while everyone listening hears it, without the bell knowing who they are.",
    draw: () => (
      <>
        {/* the bell */}
        <path className="d-warm" d="M82 70C90 62 88 34 102 34C116 34 114 62 122 70Q102 76 82 70z" />
        <path className="d-hot" d="M80 68C88 60 86 32 100 32C114 32 112 60 120 68Q100 74 80 68z" />
        <path className="d-hot" d={circle(100, 28, 3, 1, 0.4)} />
        <path className="d-hot" d={circle(100, 78, 4, 2, 0.4)} />
        <path className="d-line" d={line(100, 12, 100, 25, 3)} />
        <path className="d-line" d={line(90, 12, 110, 12, 4)} />
        {/* sound arcs */}
        <path className="d-thin" d="M72 44Q63 56 72 68" />
        <path className="d-thin" d="M64 38Q50 56 64 74" />
        <path className="d-thin" d="M128 44Q137 56 128 68" />
        <path className="d-thin" d="M136 38Q150 56 136 74" />
        {/* thin lines to the listeners */}
        <path className="d-thin" d={line(97, 83, 38, 95, 5)} />
        <path className="d-thin" d={line(100, 83, 100, 94, 6)} />
        <path className="d-thin" d={line(103, 83, 162, 95, 7)} />
        {/* left listener, hand cupped to the ear */}
        <path className="d-line" d={circle(34, 101, 6, 8, 0.5)} />
        <path className="d-line" d={line(34, 107, 34, 124, 9)} />
        <path className="d-line" d={poly([[27, 138], [34, 124], [41, 138]], 10)} />
        <path className="d-line" d={poly([[34, 112], [44, 107]], 11)} />
        <path className="d-line" d="M45 100Q51 104 46 110" />
        <path className="d-line" d={line(34, 112, 27, 120, 12)} />
        {/* middle listener */}
        <path className="d-line" d={circle(100, 101, 6, 13, 0.5)} />
        <path className="d-line" d={line(100, 107, 100, 124, 14)} />
        <path className="d-line" d={poly([[93, 138], [100, 124], [107, 138]], 15)} />
        <path className="d-line" d={poly([[100, 112], [110, 107]], 16)} />
        <path className="d-line" d="M111 100Q117 104 112 110" />
        <path className="d-line" d={line(100, 112, 93, 120, 17)} />
        {/* right listener */}
        <path className="d-line" d={circle(166, 101, 6, 18, 0.5)} />
        <path className="d-line" d={line(166, 107, 166, 124, 19)} />
        <path className="d-line" d={poly([[159, 138], [166, 124], [173, 138]], 20)} />
        <path className="d-line" d={poly([[166, 112], [156, 107]], 21)} />
        <path className="d-line" d="M155 100Q149 104 154 110" />
        <path className="d-line" d={line(166, 112, 173, 120, 22)} />
      </>
    ),
  },

  decorator: {
    title: "The decorator pattern is nested gift wrap: each layer adds something around the same gift without changing it.",
    draw: () => (
      <>
        {/* outermost layer: the hot spot, washed as a frame */}
        <path className="d-warm" d="M24 32h156v20h-156z" />
        <path className="d-warm" d="M24 114h156v22h-156z" />
        <path className="d-warm" d="M24 52h26v62h-26z" />
        <path className="d-warm" d="M152 52h28v62h-28z" />
        <path className="d-hot" d={box(22, 30, 156, 106, 10, 1)} />
        {/* ribbon on the outermost layer */}
        <path className="d-hot" d={line(93, 31, 93, 50, 2)} />
        <path className="d-hot" d={line(107, 31, 107, 50, 3)} />
        <path className="d-hot" d={line(93, 116, 93, 135, 4)} />
        <path className="d-hot" d={line(107, 116, 107, 135, 5)} />
        <path className="d-hot" d={line(23, 76, 48, 76, 6)} />
        <path className="d-hot" d={line(23, 90, 48, 90, 7)} />
        <path className="d-hot" d={line(152, 76, 177, 76, 8)} />
        <path className="d-hot" d={line(152, 90, 177, 90, 9)} />
        <g transform="rotate(-12 90 22)">
          <path className="d-hot" d={ellipse(88, 22, 11, 6, 10, 0.6)} />
        </g>
        <g transform="rotate(12 112 22)">
          <path className="d-hot" d={ellipse(112, 22, 11, 6, 11, 0.6)} />
        </g>
        <path className="d-hot" d={circle(100, 27, 3, 12, 0.4)} />
        {/* middle layer */}
        <path className="d-line" d={box(48, 50, 104, 66, 8, 13)} />
        <path className="d-thin" d={line(56, 58, 78, 58, 14)} />
        <path className="d-thin" d={line(122, 108, 144, 108, 15)} />
        {/* the gift itself */}
        <path className="d-fill" d="M80 72h44v30h-44z" />
        <path className="d-line" d={rect(78, 70, 44, 30, 16)} />
        <path className="d-line" d={line(76, 78, 124, 78, 17, 0.8)} />
        <path className="d-thin" d={line(100, 70, 100, 100, 18)} />
        <path className="d-thin" d={poly([[100, 70], [94, 64], [100, 62]], 19, 0.4)} />
        <path className="d-thin" d={poly([[100, 70], [106, 64], [100, 62]], 20, 0.4)} />
      </>
    ),
  },

  undo: {
    title: "Undo is a rewind arrow over what you typed: every change is remembered so you can step back one at a time.",
    draw: () => (
      <>
        {/* the page */}
        <path className="d-fill" d="M18 48h104v72h-104z" />
        <path className="d-line" d={box(16, 46, 104, 74, 5, 1)} />
        <path className="d-thin" d={squiggle(28, 68, 104, 68, 3, 6, 2)} />
        <path className="d-thin" d={squiggle(28, 84, 92, 84, 3, 5, 3)} />
        <path className="d-thin" d={squiggle(28, 100, 60, 100, 3, 3, 4)} />
        {/* the big rewind arrow looping back over it */}
        <path className="d-warm" d="M30 42C42 14 98 14 110 42z" />
        <path className="d-hot" d={curveArrow(112, 40, 70, -12, 28, 42, 5, 9)} />
        <path className="d-hot" d={line(60, 20, 60, 30, 6, 0.5)} />
        {/* the key */}
        <path className="d-fill" d="M138 90h46v30h-46z" />
        <path className="d-line" d={box(136, 86, 48, 32, 7, 7)} />
        <path className="d-thin" d={line(142, 124, 180, 124, 8, 0.6)} />
        <text className="d-text" x="160" y="107" fontSize="14" textAnchor="middle">
          ctrl z
        </text>
      </>
    ),
  },

  factory: {
    title: "A factory method is a factory with a conveyor belt: you order a product and it decides which shape comes out.",
    draw: () => (
      <>
        {/* the building and its sawtooth roof */}
        <path className="d-fill" d="M14 64h90v58h-90z" />
        <path className="d-line" d={rect(12, 62, 90, 58, 1)} />
        <path className="d-line" d={poly([[12, 62], [12, 44], [34, 62], [34, 44], [56, 62], [56, 44], [78, 62]], 2, 0.8)} />
        <path className="d-line" d={rect(82, 28, 14, 34, 3)} />
        <path className="d-thin" d={squiggle(89, 24, 85, 10, 3, 2, 4)} />
        <path className="d-thin" d={squiggle(95, 22, 100, 12, 3, 2, 5)} />
        <path className="d-thin" d={rect(20, 78, 12, 12, 6, 0.6)} />
        <path className="d-thin" d={rect(38, 78, 12, 12, 7, 0.6)} />
        <path className="d-thin" d={poly([[58, 120], [58, 90], [64, 84], [92, 84], [98, 90], [98, 120]], 8, 0.6)} />
        {/* the belt */}
        <path className="d-fill" d="M62 124h128v10h-128z" />
        <path className="d-line" d={rect(60, 122, 130, 10, 9)} />
        <path className="d-thin" d={circle(68, 127, 3, 10, 0.4)} />
        <path className="d-thin" d={circle(182, 127, 3, 11, 0.4)} />
        <path className="d-thin" d={line(94, 127, 108, 127, 12, 0.4)} />
        <path className="d-thin" d={line(138, 127, 152, 127, 13, 0.4)} />
        {/* the box coming out of the door: the hot spot */}
        <path className="d-warm" d="M72 104h22v18h-22z" />
        <path className="d-hot" d={rect(70, 102, 22, 20, 14)} />
        {/* the others already on the belt */}
        <path className="d-fill" d="M118 106l12-18 12 18z" />
        <path className="d-line" d={poly([[116, 120], [130, 94], [144, 120]], 15, 0.8, true)} />
        <path className="d-fill" d={disc(168, 108, 12)} />
        <path className="d-line" d={circle(168, 108, 12, 16)} />
        <path className="d-hot" d={arrow(104, 112, 114, 112, 17, 5)} />
      </>
    ),
  },

  solid: {
    title: "SOLID is a tidy tower of blocks: each principle is one sturdy layer, and the whole design stays level.",
    draw: () => (
      <>
        {/* five blocks, sturdier towards the bottom */}
        <path className="d-fill" d="M64 24h52v20h-52z" />
        <path className="d-line" d={box(62, 22, 52, 20, 4, 1)} />
        <path className="d-fill" d="M56 46h64v20h-64z" />
        <path className="d-line" d={box(54, 44, 64, 20, 4, 2)} />
        <path className="d-warm" d="M50 68h72v20h-72z" />
        <path className="d-hot" d={box(48, 66, 76, 20, 4, 3)} />
        <path className="d-fill" d="M44 90h84v20h-84z" />
        <path className="d-line" d={box(42, 88, 88, 20, 4, 4)} />
        <path className="d-fill" d="M38 112h96v20h-96z" />
        <path className="d-line" d={box(36, 110, 100, 20, 4, 5)} />
        <text className="d-text" x="88" y="38" fontSize="16" textAnchor="middle">
          S
        </text>
        <text className="d-text" x="86" y="60" fontSize="16" textAnchor="middle">
          O
        </text>
        <text className="d-text" x="86" y="126" fontSize="16" textAnchor="middle">
          D
        </text>
        {/* the level / ruler on the side */}
        <path className="d-line" d={line(162, 22, 162, 130, 6)} />
        <path className="d-thin" d={line(152, 22, 162, 22, 7, 0.4)} />
        <path className="d-thin" d={line(156, 44, 162, 44, 8, 0.4)} />
        <path className="d-thin" d={line(152, 66, 162, 66, 9, 0.4)} />
        <path className="d-thin" d={line(156, 88, 162, 88, 10, 0.4)} />
        <path className="d-thin" d={line(152, 110, 162, 110, 11, 0.4)} />
        <path className="d-thin" d={line(156, 130, 162, 130, 12, 0.4)} />
        <path className="d-hot" d={arrow(146, 76, 128, 76, 13, 5)} />
      </>
    ),
  },

  singleton: {
    title: "A singleton is one throne: everybody who asks for it is pointed at the same single chair.",
    draw: () => (
      <>
        {/* the throne */}
        <path className="d-warm" d="M128 36h44v46h-44z" />
        <path className="d-warm" d="M120 84h60v14h-60z" />
        <path className="d-hot" d={poly([[126, 82], [126, 38], [134, 32], [164, 32], [172, 38], [172, 82]], 1, 0.8)} />
        <path className="d-hot" d={box(118, 82, 62, 14, 4, 2)} />
        <path className="d-hot" d={box(114, 66, 10, 32, 3, 3)} />
        <path className="d-hot" d={box(174, 66, 10, 32, 3, 4)} />
        <path className="d-hot" d={line(124, 97, 122, 120, 5)} />
        <path className="d-hot" d={line(174, 97, 176, 120, 6)} />
        <path className="d-thin" d={line(138, 48, 138, 74, 7, 0.6)} />
        <path className="d-thin" d={line(160, 48, 160, 74, 8, 0.6)} />
        {/* the crown */}
        <path className="d-line" d={poly([[136, 26], [134, 12], [142, 19], [149, 10], [156, 19], [164, 12], [162, 26]], 9, 0.6)} />
        <path className="d-line" d={line(135, 26, 163, 26, 10, 0.5)} />
        {/* three people in a line, all pointing at it */}
        <path className="d-line" d={circle(26, 22, 5, 11, 0.5)} />
        <path className="d-line" d={line(26, 27, 26, 44, 12)} />
        <path className="d-line" d={poly([[20, 56], [26, 44], [32, 56]], 13)} />
        <path className="d-line" d={line(26, 32, 40, 30, 14)} />
        <path className="d-line" d={circle(26, 66, 5, 15, 0.5)} />
        <path className="d-line" d={line(26, 71, 26, 88, 16)} />
        <path className="d-line" d={poly([[20, 100], [26, 88], [32, 100]], 17)} />
        <path className="d-line" d={line(26, 76, 40, 76, 18)} />
        <path className="d-line" d={circle(26, 108, 5, 19, 0.5)} />
        <path className="d-line" d={line(26, 113, 26, 130, 20)} />
        <path className="d-line" d={poly([[20, 140], [26, 130], [32, 140]], 21)} />
        <path className="d-line" d={line(26, 118, 40, 120, 22)} />
        <path className="d-thin" d={arrow(46, 30, 108, 60, 23, 7)} />
        <path className="d-thin" d={arrow(46, 76, 108, 80, 24, 7)} />
        <path className="d-thin" d={arrow(46, 120, 108, 98, 25, 7)} />
        <text className="d-text" x="148" y="136" fontSize="13" textAnchor="middle">
          only one
        </text>
      </>
    ),
  },
};
