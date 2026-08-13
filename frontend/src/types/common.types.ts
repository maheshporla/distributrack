/**
 * Shape returned by the Spring Boot backend for a single-resource response.
 * Keep this aligned with the backend's global `ApiResponse<T>` wrapper.
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * Shape returned for paginated list endpoints (mirrors Spring's Page<T>).
 */
export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/**
 * Normalized error shape produced by the Axios error interceptor.
 * Every thrown error from the service layer conforms to this.
 */
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  path?: string;
}

/**
 * Standard query params accepted by paginated list endpoints.
 */
export interface PaginationParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export type SortDirection = "asc" | "desc";

export interface SelectOption<TValue = string> {
  label: string;
  value: TValue;
}

/**
 * Generic async state used by hooks/stores that fetch data.
 */
export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export type ID = string | number;
