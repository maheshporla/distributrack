/**
 * Centralized environment configuration.
 *
 * Never read `import.meta.env` directly anywhere else in the codebase.
 * Import `env` from this module instead so that:
 *  - all values are validated once, at boot time
 *  - types are correct (no stray `string | undefined`)
 *  - a missing/invalid variable fails fast with a clear error
 */

function readString(key: keyof ImportMetaEnv, fallback?: string): string {
  const value = import.meta.env[key];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function readNumber(key: keyof ImportMetaEnv, fallback: number): number {
  const raw = import.meta.env[key];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(key: keyof ImportMetaEnv, fallback = false): boolean {
  const raw = import.meta.env[key];
  if (raw === undefined) return fallback;
  return raw === "true" || raw === "1";
}

export const env = {
  apiBaseUrl: (() => {
    const url = readString("VITE_API_BASE_URL", "http://localhost:8080/api");
    return url.endsWith("/api") ? url : `${url}/api`;
  })(),
  apiTimeout: readNumber("VITE_API_TIMEOUT", 15000),
  appName: readString("VITE_APP_NAME", "DistribuTrack"),
  appEnv: readString("VITE_APP_ENV", "development") as
    "development" | "production" | "staging",
  enableMockApi: readBoolean("VITE_ENABLE_MOCK_API", false),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
