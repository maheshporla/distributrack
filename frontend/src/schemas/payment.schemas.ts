import { z } from "zod";

/**
 * Payment recording validation, mirroring the backend rules:
 *   - PaymentRequest: orderId required, amount > 0 (DecimalMin 0.01),
 *     paymentMethod required (not blank)
 *   - Service-level: order must be DELIVERED, amount may not exceed the
 *     order total (no overpayment), one payment per order
 *
 * `valueAsNumber` select fields yield NaN for the empty placeholder, so
 * a finite check precedes the positivity check.
 */
export const paymentPayloadSchema = z.object({
  orderId: z
    .number()
    .refine((value) => Number.isFinite(value), {
      message: "Select an order",
    })
    .int()
    .positive("Select an order"),

  amount: z
    .number()
    .refine((value) => Number.isFinite(value), {
      message: "Amount is required",
    })
    .positive("Amount must be greater than zero"),

  paymentMethod: z
    .string()
    .trim()
    .min(1, "Select a payment method"),
});

export type PaymentPayloadValues = z.infer<typeof paymentPayloadSchema>;
