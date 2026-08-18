/**
 * Staff / customer account payloads — mirror the Spring Boot backend DTOs.
 *
 * Backend reference:
 *   - UserController: /api/users (GET list w/ role+search, GET /{id},
 *     POST create, PUT /{id}, DELETE /{id} soft-disable)
 *   - CreateUserRequest: { fullName, email, password, phone, role }
 *   - UpdateUserRequest: { fullName, phone, role, enabled }
 *   - UserResponse:      { id, fullName, email, phone, role, enabled,
 *                          createdAt }  (see UserProfile in auth.types.ts)
 *
 * Role matrix (UserServiceImpl, authoritative):
 *   - SUPER_ADMIN may create/manage any role
 *   - OWNER may manage OWNER/MANAGER/SALESMAN/DELIVERY_BOY/SHOPKEEPER
 *   - MANAGER may manage MANAGER/SALESMAN/DELIVERY_BOY/SHOPKEEPER
 *   - Nobody but a SUPER_ADMIN can create a SUPER_ADMIN
 */

import type { RoleName } from "@/types/auth.types";

/** Matches CreateUserRequest.java. */
export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: RoleName;
}

/** Matches UpdateUserRequest.java (password is optional — omit to keep current). */
export interface UpdateUserPayload {
  fullName: string;
  phone: string;
  role: RoleName;
  enabled: boolean;
  password?: string;
}
