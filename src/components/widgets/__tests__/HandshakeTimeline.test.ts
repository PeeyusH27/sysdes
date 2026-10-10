import { describe, expect, test } from "vitest";
import { coldRtts, handshake } from "../HandshakeTimeline";

describe("handshake round trips", () => {
  test("cold HTTPS: DNS + TCP + TLS + request", () => {
    expect(handshake("tls13", 50, false).coldRttCount).toBe(4); // ~4 RTT, as the lesson says
    expect(handshake("tls12", 50, false).coldRttCount).toBe(5); // TLS 1.2 costs one more
    expect(handshake("h3", 50, false).coldRttCount).toBe(3); // QUIC folds transport + TLS into one
  });

  test("totals in ms scale with RTT; keep-alive is a single RTT", () => {
    const h = handshake("tls13", 80);
    expect(h.coldMs).toBe(320);
    expect(h.warmMs).toBe(80);
    expect(handshake("tls12", 100).coldMs).toBe(500);
  });

  test("a cached DNS answer removes one RTT", () => {
    expect(handshake("tls13", 50, true).coldMs).toBe(150);
    expect(coldRtts("h3", true).map((p) => p.id)).toEqual(["quic", "req"]);
  });

  test("phases are contiguous and end at the total", () => {
    for (const proto of ["tls12", "tls13", "h3"] as const) {
      const h = handshake(proto, 37);
      h.cold.forEach((p, i) => {
        expect(p.end - p.start).toBe(p.rtts * 37);
        if (i > 0) expect(p.start).toBe(h.cold[i - 1].end);
      });
      expect(h.cold.at(-1)!.end).toBe(h.coldMs);
    }
  });
});
