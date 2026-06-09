import { z } from 'zod';
import { isValidUPI, isValidEthereumAddress, sanitizeInput } from '@/lib/security';

// Maximum order limits
const MAX_FIAT_AMOUNT = 1000000; // ₹10,00,000 max per order
const MAX_USDC_AMOUNT = 10000; // 10,000 USDC max per order

// Custom validators
const ethereumAddressSchema = z.string().refine(
  (val) => isValidEthereumAddress(val),
  { message: 'Invalid Ethereum address format' }
);

const upiIdSchema = z.string().refine(
  (val) => isValidUPI(val),
  { message: 'Invalid UPI ID format (expected: username@upi)' }
);

const safeStringSchema = z.string().transform((val) => sanitizeInput(val));

export const createOrderSchema = z.object({
  type: z.enum(['onramp', 'offramp']),
  fiatAmount: z.coerce.number()
    .positive('Amount must be positive')
    .max(MAX_FIAT_AMOUNT, `Maximum ₹${MAX_FIAT_AMOUNT.toLocaleString()} per order`),
  usdcAmount: z.coerce.number()
    .positive('Amount must be positive')
    .max(MAX_USDC_AMOUNT, `Maximum ${MAX_USDC_AMOUNT.toLocaleString()} USDC per order`),
  userWalletAddress: ethereumAddressSchema.optional().nullable(),
});

export const acceptOrderSchema = z.object({
  upiId: upiIdSchema.optional(),
});

export const submitPaymentSchema = z.object({
  paymentReference: safeStringSchema.pipe(
    z.string().min(1, 'Payment reference required').max(100, 'Reference too long')
  ),
});

export const completeOrderSchema = z.object({
  orderId: z.string().uuid('Invalid order ID format'),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format'),
  paymentReference: safeStringSchema.pipe(
    z.string().min(1).max(100)
  ).optional(),
});

// Off-ramp validation schemas
export const submitUsdcSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format'),
});

export const confirmFiatSchema = z.object({
  confirmed: z.boolean(),
  notes: safeStringSchema.pipe(
    z.string().max(500, 'Notes too long')
  ).optional(),
});

// Admin schemas
export const sendFiatSchema = z.object({
  paymentReference: safeStringSchema.pipe(
    z.string().max(100)
  ).optional(),
}).or(z.object({})); // Allow empty body

export const disputeSchema = z.object({
  reason: safeStringSchema.pipe(
    z.string().min(10, 'Please provide more details').max(1000, 'Description too long')
  ),
  evidence: z.array(z.string().url()).max(5, 'Maximum 5 attachments').optional(),
});
