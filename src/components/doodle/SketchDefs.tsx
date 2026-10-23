/**
 * The SVG filter behind the hand-drawn look: a gentle, fixed wobble (the same on every load, so nothing flickers).
 * Referenced from CSS as url(#sk-wobble). Mounted once in the layout, invisible.
 */
export function SketchDefs() {
  return (
    <svg width="0" height="0" aria-hidden focusable="false" style={{ position: "absolute" }}>
      <defs>
        <filter id="sk-wobble" x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
