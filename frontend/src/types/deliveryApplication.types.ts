/**
 * Delivery partner application — mirrors the backend UserResponse DTO
 * for pending DELIVERY_BOY registrations.
 */
export interface DeliveryApplication {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  role: "DELIVERY_BOY";
  enabled: boolean;
  createdAt: string;
}
