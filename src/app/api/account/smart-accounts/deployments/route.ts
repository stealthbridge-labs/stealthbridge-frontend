import { NextResponse } from "next/server";
import { currentWalletIdentity } from "@/lib/auth-server";
import { validSameOrigin } from "@/lib/wallet-auth";
import { PRIVATE_HEADERS, backendUrl, boundedText, bridgeSecret, signedHeaders } from "@/lib/bff";
import { validDeployRequest, validDeploymentDirectory } from "@/lib/smart-account-deployments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PATH = "/v1/account/smart-accounts/deployments";
const DOMAIN = "stealthbridge-smart-account-deploy-v1";
const MAX_REQ = 1024;
const MAX_RES = 64_000;

const reply = (body: unknown, status: number) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });

async function relay(request: Request, method: "GET" | "POST") {
  const identity = await currentWalletIdentity();
  if (!identity) return reply({ code: "SESSION_REQUIRED" }, 401);
  if (method === "POST" && !validSameOrigin(request)) return reply({ code: "ORIGIN_REJECTED" }, 403);
  const secret = bridgeSecret();
  const backend = backendUrl();
  if (!secret || !backend) return reply({ code: "SMART_ACCOUNTS_NOT_CONFIGURED" }, 503);

  let body = "";
  if (method === "POST") {
    try {
      if (!request.headers.get("content-type")?.startsWith("application/json")) throw Error("TYPE");
      const parsed: unknown = JSON.parse(await boundedText(request, MAX_REQ));
      if (!validDeployRequest(parsed)) throw Error("SHAPE");
      body = JSON.stringify(parsed);
    } catch {
      return reply({ code: "INVALID_DEPLOY_REQUEST" }, 400);
    }
  }
  try {
    const response = await fetch(new URL(PATH, backend), {
      method,
      headers: {
        accept: "application/json",
        ...signedHeaders({ secret, domain: DOMAIN, method, path: PATH, account: identity.address, body }),
      },
      cache: "no-store",
      redirect: "error",
      // POST waits for simulation + submission; Stellar inclusion is polled via GET.
      signal: AbortSignal.timeout(method === "POST" ? 25_000 : 15_000),
      ...(method === "POST" ? { body } : {}),
    });
    const text = await response.text();
    if (text.length > MAX_RES) throw Error("OVERSIZED");
    const data: unknown = text ? JSON.parse(text) : null;
    if (method === "GET") {
      if (!response.ok || !validDeploymentDirectory(data, identity.address)) throw Error("INVALID");
      return reply(data, 200);
    }
    if (response.status === 202) return reply(data, 202);
    // Backend error envelopes carry safe codes and public ids in `details`.
    const details = (data as { details?: unknown } | null)?.details ?? null;
    return reply({ code: "DEPLOYMENT_FAILED", status: response.status, details }, response.status);
  } catch {
    return reply({ code: "SMART_ACCOUNT_SERVICE_UNAVAILABLE" }, 503);
  }
}

export async function GET(request: Request) {
  return relay(request, "GET");
}
export async function POST(request: Request) {
  return relay(request, "POST");
}
