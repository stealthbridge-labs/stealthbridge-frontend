import { NextResponse } from "next/server";
import { currentWalletIdentity } from "@/lib/auth-server";
import { validSameOrigin } from "@/lib/wallet-auth";
import { PRIVATE_HEADERS, backendUrl, boundedText, bridgeSecret, signedHeaders } from "@/lib/bff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PATH = "/v1/account/smart-accounts/payments";
const DOMAIN = "stealthbridge-smart-account-payments-v1";
const reply = (body: unknown, status: number) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const B64URL = /^[A-Za-z0-9_-]{1,3000}$/;

/** Only the two documented actions, with exact fields, reach the backend. */
function validAction(v: unknown): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  const keys = Object.keys(r).sort().join(",");
  if (r.action === "prepare") {
    return keys === "action,amount_stroops,asset,contract_address,destination" &&
      typeof r.contract_address === "string" && /^C[A-Z2-7]{55}$/.test(r.contract_address) &&
      typeof r.destination === "string" && /^[GC][A-Z2-7]{55}$/.test(r.destination) &&
      typeof r.asset === "string" && /^(XLM|[A-Za-z0-9]{1,12}:G[A-Z2-7]{55})$/.test(r.asset) &&
      Number.isSafeInteger(r.amount_stroops) && (r.amount_stroops as number) > 0;
  }
  if (r.action === "submit") {
    return keys === "action,authenticator_data,client_data_json,id,signature" &&
      typeof r.id === "string" && UUID.test(r.id) &&
      [r.authenticator_data, r.client_data_json, r.signature].every((x) => typeof x === "string" && B64URL.test(x));
  }
  return false;
}

async function relay(request: Request, method: "GET" | "POST") {
  const identity = await currentWalletIdentity();
  if (!identity) return reply({ code: "SESSION_REQUIRED" }, 401);
  if (method === "POST" && !validSameOrigin(request)) return reply({ code: "ORIGIN_REJECTED" }, 403);
  const secret = bridgeSecret();
  const backend = backendUrl();
  if (!secret || !backend) return reply({ code: "PAYMENTS_NOT_CONFIGURED" }, 503);
  let body = "";
  if (method === "POST") {
    try {
      const parsed: unknown = JSON.parse(await boundedText(request, 8192));
      if (!validAction(parsed)) throw Error("SHAPE");
      body = JSON.stringify(parsed);
    } catch {
      return reply({ code: "INVALID_PAYMENT" }, 400);
    }
  }
  try {
    const res = await fetch(new URL(PATH, backend), {
      method,
      headers: { accept: "application/json", ...signedHeaders({ secret, domain: DOMAIN, method, path: PATH, account: identity.address, body }) },
      cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(28_000),
      ...(method === "POST" ? { body } : {}),
    });
    const text = await res.text();
    if (text.length > 200_000) throw Error("OVERSIZED");
    return reply(text ? JSON.parse(text) : null, res.status);
  } catch {
    return reply({ code: "PAYMENT_SERVICE_UNAVAILABLE" }, 503);
  }
}

export async function GET(request: Request) { return relay(request, "GET"); }
export async function POST(request: Request) { return relay(request, "POST"); }
