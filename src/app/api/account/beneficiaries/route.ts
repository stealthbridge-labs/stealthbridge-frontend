import { createHash, createHmac, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { currentWalletIdentity } from "@/lib/auth-server";
import { validSameOrigin } from "@/lib/wallet-auth";
import {
  validBeneficiaryDirectory,
  validDeleteBeneficiaryInput,
  validUpsertBeneficiaryInput,
} from "@/lib/account-beneficiaries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const common = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
};
const PATH = "/v1/account/beneficiaries";
const DOMAIN = "stealthbridge-account-beneficiaries-v1";
const MAX_REQ_BYTES = 2048;
const MAX_RES_BYTES = 64000;

function backendUrl(): URL | null {
  const raw =
    process.env.STEALTHBRIDGE_API_URL?.trim() ||
    "https://stealthbridge-backend.vercel.app";
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    ) {
      return null;
    }
    if (
      url.hostname !== "stealthbridge-backend.vercel.app" &&
      !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(url.hostname)
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

async function boundedText(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw Error("EMPTY");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQ_BYTES) throw Error("OVERSIZED");
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

async function relay(request: Request, method: "GET" | "PUT" | "DELETE") {
  const identity = await currentWalletIdentity();
  if (!identity) {
    return NextResponse.json({ code: "SESSION_REQUIRED" }, { status: 401, headers: common });
  }
  if (process.env.STEALTHBRIDGE_ACCOUNT_BENEFICIARIES_ENABLED !== "true") {
    return NextResponse.json(
      { code: "BENEFICIARIES_NOT_RELEASED" },
      { status: 503, headers: common },
    );
  }
  if (new URL(request.url).search) {
    return NextResponse.json({ code: "INVALID_QUERY" }, { status: 400, headers: common });
  }
  if (method !== "GET" && !validSameOrigin(request)) {
    return NextResponse.json({ code: "ORIGIN_REJECTED" }, { status: 403, headers: common });
  }
  const secret = process.env.STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET;
  const backend = backendUrl();
  if (!secret || Buffer.byteLength(secret) < 32 || !backend) {
    return NextResponse.json(
      { code: "BENEFICIARIES_NOT_CONFIGURED" },
      { status: 503, headers: common },
    );
  }

  let body = "";
  if (method !== "GET") {
    if (
      !request.headers.get("content-type")?.startsWith("application/json") ||
      Number(request.headers.get("content-length") ?? 0) > MAX_REQ_BYTES
    ) {
      return NextResponse.json({ code: "INVALID_BENEFICIARY" }, { status: 400, headers: common });
    }
    try {
      const raw = await boundedText(request);
      if (raw.length === 0 || Buffer.byteLength(raw, "utf8") > MAX_REQ_BYTES) {
        throw Error("OVERSIZED");
      }
      const parsed: unknown = JSON.parse(raw);
      const ok =
        method === "PUT"
          ? validUpsertBeneficiaryInput(parsed)
          : validDeleteBeneficiaryInput(parsed);
      if (!ok) throw Error("MALFORMED");
      body = JSON.stringify(parsed);
    } catch {
      return NextResponse.json({ code: "INVALID_BENEFICIARY" }, { status: 400, headers: common });
    }
  }

  const stamp = String(Math.floor(Date.now() / 1000));
  const nonce = method === "GET" ? "" : randomUUID();
  const digest =
    method === "GET" ? "" : createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", secret)
    .update(`${DOMAIN}\n${method}\n${PATH}\n${identity.address}\n${stamp}\n${nonce}\n${digest}\n`)
    .digest("hex");

  const signed: Record<string, string> = {
    accept: "application/json",
    "x-stealthbridge-account": identity.address,
    "x-stealthbridge-issued-at": stamp,
    "x-stealthbridge-signature": signature,
  };
  if (method !== "GET") {
    signed["x-stealthbridge-nonce"] = nonce;
    signed["content-type"] = "application/json";
  }

  try {
    const response = await fetch(new URL(PATH, backend), {
      method,
      headers: signed,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      ...(method === "GET" ? {} : { body }),
    });
    if (response.status === 409) {
      return NextResponse.json({ code: "BENEFICIARY_CONFLICT" }, { status: 409, headers: common });
    }
    if (response.status === 429) {
      return NextResponse.json({ code: "RATE_LIMITED" }, { status: 429, headers: common });
    }
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
      throw Error("UNAVAILABLE");
    }
    const sizeHeader = response.headers.get("content-length");
    if (sizeHeader !== null && (!/^\d+$/.test(sizeHeader) || Number(sizeHeader) > MAX_RES_BYTES)) {
      throw Error("OVERSIZED");
    }
    const reader = response.body?.getReader();
    if (!reader) throw Error("EMPTY");
    let size = 0;
    const parts: Uint8Array[] = [];
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RES_BYTES) throw Error("OVERSIZED");
        parts.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.byteLength;
    }
    const data: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!validBeneficiaryDirectory(data, identity.address)) {
      throw Error("INVALID_STORAGE_RESPONSE");
    }
    return NextResponse.json(data, { headers: common });
  } catch {
    return NextResponse.json(
      { code: "BENEFICIARY_STORAGE_UNAVAILABLE" },
      { status: 503, headers: common },
    );
  }
}

export async function GET(request: Request) {
  return relay(request, "GET");
}
export async function PUT(request: Request) {
  return relay(request, "PUT");
}
export async function DELETE(request: Request) {
  return relay(request, "DELETE");
}
