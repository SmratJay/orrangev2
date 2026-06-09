export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'payment_sent',
  'payment_confirmed',
  'usdc_sent',
  'usdc_received',
  'usdc_transferred',
  'fiat_sent',
  'completed',
  'cancelled',
  'expired',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'completed',
  'cancelled',
  'expired',
]);

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['accepted', 'cancelled', 'expired'],
  accepted: ['payment_sent', 'usdc_sent', 'cancelled', 'expired'],
  payment_sent: ['payment_confirmed', 'completed', 'cancelled', 'expired'],
  payment_confirmed: ['usdc_transferred', 'completed'],
  usdc_sent: ['usdc_received', 'cancelled'],
  usdc_received: ['fiat_sent', 'cancelled'],
  usdc_transferred: ['completed'],
  fiat_sent: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  expired: [],
};

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function assertTransition(
  current: string,
  next: OrderStatus
): { ok: true } | { ok: false; error: string } {
  if (!isOrderStatus(current)) {
    return { ok: false, error: `Unknown order status: ${current}` };
  }

  if (!canTransition(current, next)) {
    return { ok: false, error: `Invalid status transition: ${current} -> ${next}` };
  }

  return { ok: true };
}
