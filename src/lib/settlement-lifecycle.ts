const ANY_STRKEY = /^[GCMW][A-Z2-7]{55,68}$/;

export type LifecycleState =
  | "instruction_created"
  | "corridor_verified"
  | "asset_recipient_verified"
  | "quote_unavailable"
  | "quoted"
  | "policy_verified"
  | "customer_authorized"
  | "privacy_proof_pending"
  | "privacy_proof_verified"
  | "tx_submitted"
  | "chain_finalized"
  | "chain_failed"
  | "payout_pending"
  | "payout_completed"
  | "payout_failed"
  | "dispute_open"
  | "reversal_pending"
  | "reversed"
  | "reconciled"
  | "expired"
  | "cancelled";

export interface SettlementLifecycleEvent {
  revision: number;
  previous_state: LifecycleState | null;
  next_state: LifecycleState;
  reason_code: string;
  tx_hash: string | null;
  recorded_at_unix: number;
}

export interface SettlementLifecycleRecord {
  id: string;
  organization_id: string | null;
  instruction_id: string | null;
  corridor_id: string;
  route_fingerprint: string;
  idempotency_key: string;
  request_sha256: string;
  asset_code: string;
  asset_issuer: string | null;
  amount_minor_units: number;
  recipient_address: string;
  recipient_kind: "classic" | "muxed-classic" | "contract" | "muxed-contract";
  privacy_rail: "private-payments" | "confidential-token";
  privacy_rail_verified: boolean;
  quote_status: "unavailable" | "provider_verified";
  quote_sha256: string | null;
  policy_commitment_sha256: string | null;
  customer_auth_sha256: string | null;
  state: LifecycleState;
  revision: number;
  expires_at_unix: number;
  testnet_tx_hash: string | null;
  observed_ledger: number | null;
  observed_at_unix: number | null;
  chain_status: "SUCCESS" | "FAILED" | null;
  payout_status: "unavailable" | "pending" | "completed" | "failed" | "reversed";
  reconciliation_status: "pending" | "matched" | "disputed" | "reversed";
  last_error_code: string | null;
  created_at_unix: number;
  updated_at_unix: number;
  events: SettlementLifecycleEvent[];
}

export interface SettlementLifecycleDirectory {
  schema_version: 1;
  network: "testnet";
  source: "account-settlement-lifecycles";
  account_address: string;
  observed_at_unix: number;
  items: SettlementLifecycleRecord[];
  mainnet_enabled: false;
  live_fx_enabled: false;
  fiat_payouts_enabled: false;
}

export interface CreateSettlementLifecycleInput {
  id: string;
  organization_id: string | null;
  instruction_id: string | null;
  corridor_id: string;
  route_fingerprint: string;
  idempotency_key: string;
  asset_code: string;
  asset_issuer: string | null;
  amount_minor_units: number;
  recipient_address: string;
  privacy_rail: "private-payments" | "confidential-token";
  expires_in_seconds: number;
}

const VALID_STATES = new Set<string>([
  "instruction_created",
  "corridor_verified",
  "asset_recipient_verified",
  "quote_unavailable",
  "quoted",
  "policy_verified",
  "customer_authorized",
  "privacy_proof_pending",
  "privacy_proof_verified",
  "tx_submitted",
  "chain_finalized",
  "chain_failed",
  "payout_pending",
  "payout_completed",
  "payout_failed",
  "dispute_open",
  "reversal_pending",
  "reversed",
  "reconciled",
  "expired",
  "cancelled",
]);
const HEX64 = /^[0-9a-f]{64}$/;
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

export function validSettlementLifecycleDirectory(
  v: unknown,
  account: string,
): v is SettlementLifecycleDirectory {
  if (
    !isRecord(v) ||
    v.schema_version !== 1 ||
    v.network !== "testnet" ||
    v.source !== "account-settlement-lifecycles" ||
    v.account_address !== account ||
    v.mainnet_enabled !== false ||
    v.live_fx_enabled !== false ||
    v.fiat_payouts_enabled !== false ||
    !Array.isArray(v.items) ||
    v.items.length > 50
  ) {
    return false;
  }
  for (const item of v.items) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !UUID.test(item.id) ||
      typeof item.state !== "string" ||
      !VALID_STATES.has(item.state) ||
      typeof item.request_sha256 !== "string" ||
      !HEX64.test(item.request_sha256) ||
      !Array.isArray(item.events)
    ) {
      return false;
    }
  }
  return true;
}

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export async function canonicalSettlementIntentDigest(
  account: string,
  input: CreateSettlementLifecycleInput,
): Promise<string> {
  if (!/^G[A-Z2-7]{55}$/.test(account) || !ANY_STRKEY.test(input.recipient_address)) {
    throw new TypeError("Invalid Stellar address");
  }
  const canonical =
    `StealthBridge settlement intent v1\n${account}\n${input.organization_id ?? ""}\n` +
    `${input.instruction_id ?? ""}\n${input.corridor_id}\n${input.route_fingerprint}\n` +
    `${input.asset_code}\n${input.asset_issuer ?? ""}\n${input.amount_minor_units}\n` +
    `${input.recipient_address}\n${input.privacy_rail}\n`;
  return sha256(canonical);
}

export async function canonicalCustomerAuthorizationDigest(
  account: string,
  requestSha256: string,
): Promise<string> {
  return sha256(`stealthbridge-auth-v1\n${account}\n${requestSha256}\n`);
}

export async function listSettlementLifecycles(
  account: string,
  signal?: AbortSignal,
): Promise<SettlementLifecycleDirectory> {
  const res = await fetch("/api/account/settlements", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`SETTLEMENT_${res.status}`);
  const data: unknown = await res.json();
  if (!validSettlementLifecycleDirectory(data, account)) {
    throw new Error("INVALID_SETTLEMENT_DIRECTORY");
  }
  return data;
}

export async function createSettlementLifecycle(
  input: CreateSettlementLifecycleInput,
): Promise<Record<string, unknown>> {
  const res = await fetch("/api/account/settlements", {
    method: "PUT",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`SETTLEMENT_${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

export async function advanceSettlementLifecycle(
  action: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch("/api/account/settlements", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(action),
  });
  if (!res.ok) throw new Error(`SETTLEMENT_${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}
