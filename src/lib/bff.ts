import { createHash, createHmac, randomUUID } from "node:crypto";

/**
 * Shared server-side plumbing for BFF route handlers: backend URL
 * resolution, bounded request bodies and the HMAC attestation the Rust API
 * verifies. New routes use this module; older routes still carry inline
 * copies and are migrated one at a time.
 */

export const PRIVATE_HEADERS = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
} as const;

const PRODUCTION_BACKEND = "stealthbridge-backend.vercel.app";

/** Backend origin, restricted to the StealthBridge Vercel backends over HTTPS. */
export function backendUrl(): URL | null {
  const raw = process.env.STEALTHBRIDGE_API_URL?.trim() || `https://${PRODUCTION_BACKEND}`;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
      return null;
    }
    if (url.hostname !== PRODUCTION_BACKEND && !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(url.hostname)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function bridgeSecret(): string | null {
  const s = process.env.STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET;
  return s && Buffer.byteLength(s, "utf8") >= 32 ? s : null;
}

/** Reads at most `limit` bytes of a request body as strict UTF-8. */
export async function boundedText(request: Request, limit: number): Promise<string> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > limit) throw Error("OVERSIZED");
  const reader = request.body?.getReader();
  if (!reader) throw Error("EMPTY");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw Error("OVERSIZED");
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let pos = 0;
  for (const part of parts) {
    data.set(part, pos);
    pos += part.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(data);
}

/**
 * Headers that authenticate `account` to the Rust API for one request:
 * HMAC over domain, method, path, account, timestamp, nonce and body digest
 * (mirrors `customer_ciphertext_vault::authorize_account_request`).
 */
export function signedHeaders(opts: {
  secret: string;
  domain: string;
  method: string;
  path: string;
  account: string;
  body: string;
}): Record<string, string> {
  const stamp = String(Math.floor(Date.now() / 1000));
  const isGet = opts.method === "GET";
  const nonce = isGet ? "" : randomUUID();
  const digest = isGet ? "" : createHash("sha256").update(opts.body, "utf8").digest("hex");
  const text = `${opts.domain}\n${opts.method}\n${opts.path}\n${opts.account}\n${stamp}\n${nonce}\n${digest}\n`;
  const signature = createHmac("sha256", opts.secret).update(text).digest("hex");
  return {
    "x-stealthbridge-account": opts.account,
    "x-stealthbridge-issued-at": stamp,
    "x-stealthbridge-nonce": nonce,
    "x-stealthbridge-signature": signature,
    ...(isGet ? {} : { "content-type": "application/json" }),
  };
}
