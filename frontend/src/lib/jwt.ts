/**
 * Lightweight JWT payload decoding.
 *
 * This intentionally does NOT verify the token's signature — that is,
 * and must remain, the backend's job. Decoding here is purely so the
 * client can read non-sensitive claims (email, expiry) already issued
 * by a trusted server, without adding a dependency or making a network
 * call to a /me endpoint that doesn't exist yet.
 */

/** Standard claims present in every token issued by JwtService.java. */
export interface DecodedAccessToken {
  /** Subject — the user's email, per JwtService#generateToken. */
  sub: string;
  /** Issued-at, epoch seconds. */
  iat: number;
  /** Expiry, epoch seconds. */
  exp: number;
}

/**
 * Decodes a JWT's payload segment without verifying its signature.
 *
 * @param token - A compact JWT string (`header.payload.signature`).
 * @returns The decoded payload, or `null` if the token is malformed.
 */
export function decodeJwt(token: string): DecodedAccessToken | null {
  const segments = token.split(".");
  const payloadSegment = segments[1];
  if (segments.length !== 3 || !payloadSegment) {
    return null;
  }

  try {
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binary = atob(padded);
    const percentEncoded = Array.from(
      binary,
      (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`,
    ).join("");

    const json = decodeURIComponent(percentEncoded);
    const parsed: unknown = JSON.parse(json);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "sub" in parsed &&
      "exp" in parsed
    ) {
      return parsed as DecodedAccessToken;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks whether a JWT is expired (or unparsable), based on its `exp`
 * claim alone. Used to avoid restoring a session from a stale token on
 * app load.
 *
 * @param token - A compact JWT string.
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJwt(token);
  if (!decoded) return true;
  return Date.now() >= decoded.exp * 1000;
}
