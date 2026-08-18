import { z } from "zod";

export const productSchema = z.object({
  productName: z
    .string()
    .trim()
    .min(1, "Product name is required"),

  description: z
    .string()
    .optional(),

  category: z
    .string()
    .trim()
    .min(1, "Category is required"),

  brand: z
    .string()
    .optional(),

  sku: z
    .string()
    .trim()
    .min(1, "SKU is required"),

  price: z
    .number({
      message: "Price is required",
    })
    .positive("Price must be greater than 0"),

  stockQuantity: z
    .number({
      message: "Stock quantity is required",
    })
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),

  unit: z
    .string()
    .trim()
    .min(1, "Unit is required"),

  imageUrl: z
    .string()
    .optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;