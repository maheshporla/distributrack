/**
 * Warehouse types — mirror the Spring Boot backend DTOs exactly.
 *
 * Backend reference:
 *   - WarehouseController: /api/warehouses (CRUD + active + search +
 *     city/state), returns WarehouseResponse directly (no envelope)
 *   - WarehouseRequest:    warehouseName, address, city, state, pincode,
 *     contactPerson, phone, latitude, longitude, active
 *   - WarehouseResponse:   request fields + id, createdAt, updatedAt
 */

/** Matches WarehouseResponse.java. */
export interface Warehouse {
  id: number;
  warehouseName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  phone: string;
  latitude: number;
  longitude: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Matches WarehouseRequest.java. */
export interface WarehousePayload {
  warehouseName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  phone: string;
  latitude: number;
  longitude: number;
  active: boolean;
}
