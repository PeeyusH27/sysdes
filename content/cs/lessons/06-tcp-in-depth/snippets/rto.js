// How long should the sender wait for an ACK before retransmitting? (RFC 6298)
// Track a smoothed round-trip time and how much it varies; wait the smoothed time plus 4 variations.
export function makeRto({ minMs = 200 } = {}) {
  let srtt = null;
  let rttvar = 0;
  return function sample(rttMs) {
    if (srtt === null) {
      srtt = rttMs;
      rttvar = rttMs / 2;
    } else {
      rttvar = 0.75 * rttvar + 0.25 * Math.abs(srtt - rttMs);
      srtt = 0.875 * srtt + 0.125 * rttMs;
    }
    return { srtt, rttvar, rto: Math.max(minMs, srtt + 4 * rttvar) };
  };
}
