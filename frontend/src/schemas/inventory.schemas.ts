import { z } from "zod";

export const inventorySchema = z
  .object({
    productId: z
      .number()
      .int()
      .positive("Product is required"),

    quantity: z
      .number()
      .int()
      .min(0, "Quantity cannot be negative"),

    minimumStock: z
      .number()
      .int()
      .min(0, "Minimum stock cannot be negative"),

    maximumStock: z
      .number()
      .int()
      .min(1, "Maximum stock must be greater than 0"),

    warehouseLocation: z
      .string()
      .min(1, "Warehouse location is required"),

    active: z.boolean(),
  })
  .refine(
    (data) =>
      data.maximumStock >= data.minimumStock,
    {
      message:
        "Maximum stock must be greater than or equal to minimum stock",
      path: ["maximumStock"],
    },
  );

export type InventoryFormValues =
  z.infer<typeof inventorySchema>;