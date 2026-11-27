import { NextResponse } from "next/server";
import { currentWalletIdentity } from "@/lib/auth-server";
import { validSameOrigin } from "@/lib/wallet-auth";
import { PRIVATE_HEADERS, backendUrl, boundedText, bridgeSecret, signedHeaders } from "@/lib/bff";
import { relayError, validOzRelaySubmission } from "@/lib/oz-relay";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Fee-sponsored relay for OpenZeppelin smart accounts. Use this route as
 * smart-account-kit's `relayerUrl`. Requires a signed-in session; the backend
 * validates every host function and auth entry before paying any fee.
 */
const PATH = "/v1/account/smart-accounts/oz/relay";
const DOMAIN = "stealthbridge-oz-relay-v1";
const reply = (body: unknown, status: number) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });

export async function POST(request: Request) {
  const identity = await currentWalletIdentity();
  if (!identity) return reply(relayError("SESSION_REQUIRED"), 401);
  if (!validSameOrigin(request)) return reply(relayError("ORIGIN_REJECTED"), 403);
  const secret = bridgeSecret();
  const backend = backendUrl();
  if (!secret || !backend) return reply(relayError("RELAY_NOT_CONFIGURED"), 503);
  let body = "";
  try {
    const parsed: unknown = JSON.parse(await boundedText(request, 131_072));
    if (!validOzRelaySubmission(parsed)) throw Error("SHAPE");
    body = JSON.stringify({ func: parsed.func, auth: parsed.auth });
  } catch {
    return reply(relayError("INVALID_REQUEST"), 400);
  }
  try {
    const res = await fetch(new URL(PATH, backend), {
      method: "POST",
      headers: { accept: "application/json", ...signedHeaders({ secret, domain: DOMAIN, method: "POST", path: PATH, account: identity.address, body }) },
      body, cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(28_000),
    });
    const text = await res.text();
    if (text.length > 16_384) throw Error("OVERSIZED");
    return reply(text ? JSON.parse(text) : relayError("EMPTY_RESPONSE"), res.status);
  } catch {
    return reply(relayError("RELAY_UNAVAILABLE"), 503);
  }
}
