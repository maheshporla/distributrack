import { z } from "zod";

/**
 * Order validation, mirroring the backend rules:
 *   - OrderItemRequest: productId required, quantity >= 1
 *   - OrderRequest:     at least one item required
 *
 * `productId` uses RHF `valueAsNumber` (NaN for empty input), so a
 * finite check precedes the positivity check (NaN slips past min/positive
 * in Zod, hence the explicit refine).
 */
export const orderItemRowSchema = z.object({
  productId: z
    .number()
    .refine((value) => Number.isFinite(value), {
      message: "Select a product",
    })
    .int()
    .positive("Select a product"),

  quantity: z
    .number()
    .refine((value) => Number.isFinite(value), {
      message: "Quantity is required",
    })
    .int()
    .min(1, "Quantity must be greater than 0"),
});

export type OrderItemRowValues = z.infer<typeof orderItemRowSchema>;

/**
 * Full create-order payload. shopkeeperId is always sent (the backend
 * request DTO requires it); for SHOPKEEPER the caller sends their own id,
 * which the backend service ignores and replaces with the JWT principal.
 */
export const orderPayloadSchema = z.object({
  shopkeeperId: z.number().int().positive("Shopkeeper is required"),

  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, "Add at least one product to the order"),
});

export type OrderPayloadValues = z.infer<typeof orderPayloadSchema>;
