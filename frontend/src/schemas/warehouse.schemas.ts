import { z } from "zod";

/**
 * Mirrors the validation in WarehouseRequest.java:
 *   - pincode: exactly 6 digits
 *   - phone:   exactly 10 digits
 *   - latitude:  -90..90
 *   - longitude: -180..180
 *
 * Lat/lng inputs use RHF `valueAsNumber`, which yields NaN for empty
 * input, so a finite check comes before the range checks (NaN silently
 * passes min/max in Zod, hence the explicit refine).
 */
export const warehouseSchema = z.object({
  warehouseName: z
    .string()
    .trim()
    .min(1, "Warehouse name is required")
    .max(100, "Warehouse name cannot exceed 100 characters"),

  address: z
    .string()
    .trim()
    .min(1, "Address is required")
    .max(255, "Address cannot exceed 255 characters"),

  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(100, "City cannot exceed 100 characters"),

  state: z
    .string()
    .trim()
    .min(1, "State is required")
    .max(100, "State cannot exceed 100 characters"),

  pincode: z
    .string()
    .regex(/^[0-9]{6}$/, "Pincode must contain exactly 6 digits"),

  contactPerson: z
    .string()
    .trim()
    .min(1, "Contact person is required")
    .max(100, "Contact person cannot exceed 100 characters"),

  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone must contain exactly 10 digits"),

  latitude: z
    .number()
    .refine((value) => Number.isFinite(value), {
      message: "Latitude is required",
    })
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),

  longitude: z
    .number()
    .refine((value) => Number.isFinite(value), {
      message: "Longitude is required",
    })
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),

  active: z.boolean(),
});

export type WarehouseFormValues = z.infer<typeof warehouseSchema>;
