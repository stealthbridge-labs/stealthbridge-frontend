/**
 * Shape check for smart-account-kit relayer submissions ({func, auth}, base64
 * XDR). The backend decodes and fully validates; this only keeps malformed or
 * oversized bodies away from it. Mirrors validRelaySubmission in
 * @stealthbridge/sdk (oz-smart-accounts).
 */
export const OZ_RELAY_MAX_AUTH = 8;
const MAX_B64 = 64 * 1024;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const b64 = (s: unknown) => typeof s === "string" && s.length > 0 && s.length <= MAX_B64 && s.length % 4 === 0 && B64.test(s);

export function validOzRelaySubmission(v: unknown): v is { func: string; auth: string[] } {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).sort().join(",");
  return keys === "auth,func" && b64(o.func) && Array.isArray(o.auth) &&
    o.auth.length >= 1 && o.auth.length <= OZ_RELAY_MAX_AUTH && o.auth.every(b64);
}

/** Errors in the shape smart-account-kit's RelayerClient reads. */
export function relayError(code: string) {
  return { success: false, error: code, errorCode: code };
}
