import type { SequenceSpec } from "@/components/diagram/types";

export const lossRecovery: SequenceSpec = {
  id: "loss-recovery",
  title: "Two ways TCP notices a lost segment",
  description: "With later segments still arriving, duplicate ACKs trigger a fast retransmit. With nothing arriving, the sender waits for its retransmission timeout, which is much slower.",
  actors: [
    { id: "sender", label: "Sender", kind: "client" },
    { id: "receiver", label: "Receiver", kind: "service" },
  ],
  items: [
    {
      alt: [
        {
          when: "Fast retransmit",
          items: [
            { from: "sender", to: "receiver", label: "segment 1", type: "call" },
            { from: "receiver", to: "sender", label: "ACK 2 (next expected)", type: "reply" },
            { from: "sender", to: "receiver", label: "segment 2 (lost)", type: "call" },
            { from: "sender", to: "receiver", label: "segments 3, 4, 5", type: "call" },
            { from: "receiver", to: "sender", label: "ACK 2, ACK 2, ACK 2 (duplicates)", type: "reply" },
            { note: "Three duplicate ACKs: segment 2 is gone, retransmit now", over: ["sender", "receiver"] },
            { from: "sender", to: "receiver", label: "segment 2 again", type: "call" },
            { from: "receiver", to: "sender", label: "ACK 6", type: "reply" },
          ],
        },
        {
          when: "Timeout",
          items: [
            { from: "sender", to: "receiver", label: "segment 7 (the last one, lost)", type: "call" },
            { note: "No later segments, so no duplicate ACKs. The sender waits for its RTO.", over: ["sender", "receiver"] },
            { from: "sender", to: "receiver", label: "segment 7 again, after the RTO", type: "call" },
            { from: "receiver", to: "sender", label: "ACK 8", type: "reply" },
          ],
        },
      ],
    },
  ],
};
