import { env } from "@/config/env";

export const APP_NAME = env.appName;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "distributrack_access_token",
  // TODO(backend): re-add REFRESH_TOKEN once a refresh-token endpoint exists.
  THEME: "distributrack_theme",
  SIDEBAR_COLLAPSED: "distributrack_sidebar_collapsed",
} as const;

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export const DATE_FORMAT = "dd MMM yyyy";
export const DATE_TIME_FORMAT = "dd MMM yyyy, hh:mm a";

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;
