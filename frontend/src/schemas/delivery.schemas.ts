import { z } from "zod";

/**
 * Delivery assignment validation, mirroring the backend rules:
 *   - DeliveryRequest: orderId required, deliveryBoyId required,
 *     deliveryAddress required (not blank), vehicleNumber optional
 *
 * `valueAsNumber` select fields yield NaN for the empty placeholder, so
 * a finite check precedes the positivity check (NaN slips past min/positive
 * in Zod, hence the explicit refine).
 */
export const deliveryPayloadSchema = z.object({
  orderId: z
    .number()
    .refine((value) => Number.isFinite(value), {
      message: "Select an order",
    })
    .int()
    .positive("Select an order"),

  deliveryBoyId: z
    .number()
    .refine((value) => Number.isFinite(value), {
      message: "Select a delivery boy",
    })
    .int()
    .positive("Select a delivery boy"),

  deliveryAddress: z
    .string()
    .trim()
    .min(5, "Delivery address is required"),

  vehicleNumber: z.string().trim().optional(),
});

export type DeliveryPayloadValues = z.infer<typeof deliveryPayloadSchema>;
