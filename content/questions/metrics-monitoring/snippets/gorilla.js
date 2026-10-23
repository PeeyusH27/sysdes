// Why a time series compresses so well (the ideas behind Facebook's Gorilla paper, as bit counters).
// A sample is (timestamp, value). Stored naively that is 16 bytes. But neighbours look alike:
//   - Timestamps arrive on a schedule, so the DELTA OF DELTAS is almost always 0: store that in 1 bit.
//   - Values change slowly, so XOR with the previous value leaves mostly zero bits: store only the changed middle.
// These functions count the bits an encoder would write; they do not build the bit stream.

// Bits for timestamps (seconds). First = 64 bits, second delta = 14 bits (as in the paper), then delta-of-delta buckets.
export function timestampBits(ts) {
  if (ts.length === 0) return 0;
  let bits = 64;
  if (ts.length === 1) return bits;
  let prevDelta = ts[1] - ts[0];
  bits += 14;
  for (let i = 2; i < ts.length; i++) {
    const delta = ts[i] - ts[i - 1];
    const dod = delta - prevDelta;
    prevDelta = delta;
    if (dod === 0) bits += 1;                         // '0'
    else if (dod >= -63 && dod <= 64) bits += 2 + 7;  // '10' + 7 bits
    else if (dod >= -255 && dod <= 256) bits += 3 + 9;
    else if (dod >= -2047 && dod <= 2048) bits += 4 + 12;
    else bits += 4 + 32;
  }
  return bits;
}

const buf = new DataView(new ArrayBuffer(8));
function asBits(x) {                                  // the 64 raw bits of a float
  buf.setFloat64(0, x);
  return buf.getBigUint64(0);
}
function leadingZeros(x) { let n = 0; for (let b = 63n; b >= 0n && !((x >> b) & 1n); b--) n++; return n; }
function trailingZeros(x) { let n = 0; for (let b = 0n; b < 64n && !((x >> b) & 1n); b++) n++; return n; }

// Bits for values: same value = 1 bit; else 2 control bits, plus the changed middle section
// (and 11 more bits to describe where it is, unless it fits inside the previous window).
export function valueBits(values) {
  if (values.length === 0) return 0;
  let bits = 64;
  let prev = asBits(values[0]);
  let window = null;                                  // { lead, trail } of the last written section
  for (let i = 1; i < values.length; i++) {
    const cur = asBits(values[i]);
    const x = prev ^ cur;
    prev = cur;
    if (x === 0n) { bits += 1; continue; }
    const lead = Math.min(Number(leadingZeros(x)), 31);
    const trail = Number(trailingZeros(x));
    if (window && lead >= window.lead && trail >= window.trail) {
      bits += 2 + (64 - window.lead - window.trail);  // '10' + reuse the previous window
    } else {
      window = { lead, trail };
      bits += 2 + 5 + 6 + (64 - lead - trail);        // '11' + leading zeros + length + the bits
    }
  }
  return bits;
}

export const bytesPerSample = (ts, values) => (timestampBits(ts) + valueBits(values)) / 8 / ts.length;
