import { NextResponse } from "next/server";
import { currentWalletIdentity } from "@/lib/auth-server";
import { PRIVATE_HEADERS, backendUrl, bridgeSecret, signedHeaders } from "@/lib/bff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const PATH = "/v1/account/smart-accounts/balances";
const DOMAIN = "stealthbridge-smart-account-balances-v1";

export async function GET() {
  const identity = await currentWalletIdentity();
  if (!identity) return NextResponse.json({ code: "SESSION_REQUIRED" }, { status: 401, headers: PRIVATE_HEADERS });
  const secret = bridgeSecret();
  const backend = backendUrl();
  if (!secret || !backend) return NextResponse.json({ code: "PAYMENTS_NOT_CONFIGURED" }, { status: 503, headers: PRIVATE_HEADERS });
  try {
    const res = await fetch(new URL(PATH, backend), {
      headers: { accept: "application/json", ...signedHeaders({ secret, domain: DOMAIN, method: "GET", path: PATH, account: identity.address, body: "" }) },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    if (text.length > 64_000) throw Error("OVERSIZED");
    return NextResponse.json(text ? JSON.parse(text) : null, { status: res.status, headers: PRIVATE_HEADERS });
  } catch {
    return NextResponse.json({ code: "PAYMENT_SERVICE_UNAVAILABLE" }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
