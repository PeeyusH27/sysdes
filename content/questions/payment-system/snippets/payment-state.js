// The payment state machine. Every write goes through these functions, so an illegal move
// (succeeded → failed, refunded → succeeded) is impossible, not just unlikely.
export const TRANSITIONS = {
  created: ['processing', 'canceled'],
  processing: ['succeeded', 'failed', 'requires_action', 'unknown'], // unknown = the PSP call timed out
  requires_action: ['processing', 'succeeded', 'failed', 'canceled'], // e.g. 3-D Secure
  unknown: ['succeeded', 'failed', 'requires_action'], // settled by a webhook or a status query
  succeeded: ['partially_refunded', 'refunded'],
  partially_refunded: ['partially_refunded', 'refunded'],
  failed: [],
  canceled: [],
  refunded: [],
};

export const canTransition = (from, to) => (TRANSITIONS[from] ?? []).includes(to);

/** For our own code paths: an illegal move is a bug, so it throws. */
export function transition(payment, to) {
  if (!canTransition(payment.status, to)) throw new Error(`Illegal transition ${payment.status} → ${to} for ${payment.id}`);
  return { ...payment, status: to, version: (payment.version ?? 0) + 1 };
}

/**
 * For PSP webhooks, which arrive late, twice, or out of order: apply only legal forward moves
 * and ignore the rest (they are still recorded, and still answered with 200).
 */
export function applyEvent(payment, to) {
  if (payment.status === to) return { payment, applied: false, reason: `already ${to}` };
  if (!canTransition(payment.status, to)) return { payment, applied: false, reason: `${payment.status} → ${to} is not a forward move` };
  return { payment: transition(payment, to), applied: true };
}

/** Reserve a refund. The SQL version is one conditional UPDATE (see the page), so two refunds can't race. */
export function applyRefund(payment, amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Refund amount must be a positive integer in minor units');
  if (!['succeeded', 'partially_refunded'].includes(payment.status)) throw new Error(`Can't refund a ${payment.status} payment`);
  const refunded = (payment.refunded ?? 0) + amount;
  if (refunded > payment.amount) throw new Error(`Refund of ${amount} exceeds the refundable ${payment.amount - (payment.refunded ?? 0)}`);
  const next = transition(payment, refunded === payment.amount ? 'refunded' : 'partially_refunded');
  return { ...next, refunded };
}
