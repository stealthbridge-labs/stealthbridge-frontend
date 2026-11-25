// Vendored verbatim from @stealthbridge/sdk src/smart-account-payments.ts. Replace with
// `import ... from "@stealthbridge/sdk"` once 0.4.0 is on npm (tests enforce byte parity).
/**
 * Passkey-authorized smart-account payments.
 *
 * The passkey signs the Soroban authorization payload
 * `sha256(HashIdPreimage::SorobanAuthorization)`, which commits to the network,
 * the single-use nonce, the expiry ledger and the exact invocation
 * `asset_contract.transfer(account, destination, amount)`.
 *
 * `verifyPreparedPayment` lets a wallet confirm, without trusting the server,
 * that the challenge it is about to sign is exactly the payment the customer
 * reviewed: it rebuilds the expected invocation bytes from the customer's own
 * inputs and recomputes the challenge. Pure, dependency-free, WebCrypto only.
 */

export type PaymentStatus = "prepared" | "submitting" | "submitted" | "confirmed" | "failed" | "expired";

export type PreparedPayment = {
  id: string;
  status: "prepared";
  contract_address: string;
  destination: string;
  asset: string;
  asset_contract: string;
  amount_stroops: number;
  network_passphrase: string;
  expiration_ledger: number;
  fee_estimate_stroops: number;
  fee_payer: "stealthbridge-relayer";
  authorization_preimage_xdr: string;
  challenge: string;
  credential_id: string;
  rp_id: string;
};

export type PaymentRecord = {
  id: string;
  contract_address: string;
  destination: string;
  asset: string;
  asset_contract: string;
  amount_stroops: number;
  status: PaymentStatus;
  tx_hash: string | null;
  ledger: number | null;
  fee_estimate_stroops: number;
  error_code: string | null;
  created_at_unix: number;
};

export type PaymentDirectory = {
  schema_version: 1;
  account_address: string;
  payments_configured: boolean;
  assets: string[];
  payments: PaymentRecord[];
};

export type PaymentAssertion = {
  authenticator_data: string;
  client_data_json: string;
  signature: string;
};

const C_ADDR = /^C[A-Z2-7]{55}$/;
const GC_ADDR = /^[GC][A-Z2-7]{55}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const B64URL = /^[A-Za-z0-9_-]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STATUSES: readonly string[] = ["prepared", "submitting", "submitted", "confirmed", "failed", "expired"];
const ASSET = /^(XLM|[A-Za-z0-9]{1,12}:G[A-Z2-7]{55})$/;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const posInt = (v: unknown) => Number.isSafeInteger(v) && (v as number) > 0;

export function validPreparedPayment(v: unknown): v is PreparedPayment {
  if (!isObj(v)) return false;
  return (
    typeof v.id === "string" && UUID.test(v.id) && v.status === "prepared" &&
    typeof v.contract_address === "string" && C_ADDR.test(v.contract_address) &&
    typeof v.destination === "string" && GC_ADDR.test(v.destination) &&
    typeof v.asset === "string" && ASSET.test(v.asset) &&
    typeof v.asset_contract === "string" && C_ADDR.test(v.asset_contract) &&
    posInt(v.amount_stroops) && typeof v.network_passphrase === "string" &&
    posInt(v.expiration_ledger) && Number.isSafeInteger(v.fee_estimate_stroops) &&
    v.fee_payer === "stealthbridge-relayer" &&
    typeof v.authorization_preimage_xdr === "string" && v.authorization_preimage_xdr.length < 4096 &&
    typeof v.challenge === "string" && B64URL.test(v.challenge) && v.challenge.length === 43 &&
    typeof v.credential_id === "string" && B64URL.test(v.credential_id) &&
    typeof v.rp_id === "string" && v.rp_id.length >= 3
  );
}

function validRecord(v: unknown): v is PaymentRecord {
  if (!isObj(v)) return false;
  const confirmed = v.status === "confirmed";
  return (
    typeof v.id === "string" && UUID.test(v.id) &&
    typeof v.contract_address === "string" && C_ADDR.test(v.contract_address) &&
    typeof v.destination === "string" && GC_ADDR.test(v.destination) &&
    typeof v.asset === "string" && ASSET.test(v.asset) &&
    typeof v.asset_contract === "string" && C_ADDR.test(v.asset_contract) &&
    posInt(v.amount_stroops) && typeof v.status === "string" && STATUSES.includes(v.status) &&
    (v.tx_hash === null || (typeof v.tx_hash === "string" && HEX64.test(v.tx_hash))) &&
    // A confirmed payment must name the transaction and ledger that prove it.
    (!confirmed || (typeof v.tx_hash === "string" && posInt(v.ledger))) &&
    (v.ledger === null || posInt(v.ledger)) &&
    Number.isSafeInteger(v.fee_estimate_stroops) &&
    (v.error_code === null || typeof v.error_code === "string") &&
    posInt(v.created_at_unix)
  );
}

export function validPaymentDirectory(v: unknown, account: string): v is PaymentDirectory {
  return (
    isObj(v) && v.schema_version === 1 && v.account_address === account &&
    typeof v.payments_configured === "boolean" &&
    Array.isArray(v.assets) && v.assets.every((a) => typeof a === "string" && ASSET.test(a)) &&
    Array.isArray(v.payments) && v.payments.length <= 25 && v.payments.every(validRecord)
  );
}

// ------------------------------------------------------------ byte helpers

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Raw 32-byte payload of a canonical G... or C... strkey (checksum verified). */
export function strkeyPayload(address: string): { kind: "G" | "C"; bytes: Uint8Array } | null {
  if (!GC_ADDR.test(address)) return null;
  const out: number[] = [];
  let acc = 0, bits = 0;
  for (const ch of address) {
    acc = (acc << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); acc &= (1 << bits) - 1; }
  }
  if (out.length !== 35) return null;
  const version = address[0] === "G" ? 6 << 3 : 2 << 3;
  if (out[0] !== version) return null;
  let crc = 0;
  for (const b of out.slice(0, 33)) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  if (out[33] !== (crc & 255) || out[34] !== crc >> 8) return null;
  return { kind: address[0] as "G" | "C", bytes: new Uint8Array(out.slice(1, 33)) };
}

const u32 = (n: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b; };
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function sha256(b: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", b as Uint8Array<ArrayBuffer>));
}
export function base64urlBytes(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
}
const b64Bytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

/** XDR `ScAddress` for a G (account) or C (contract) strkey. */
function scAddress(address: string): Uint8Array | null {
  const p = strkeyPayload(address);
  if (!p) return null;
  return p.kind === "G" ? concat(u32(0), u32(0), p.bytes) : concat(u32(1), p.bytes);
}

/** XDR `Asset` for "XLM" or "CODE:ISSUER". */
function assetXdr(asset: string): Uint8Array | null {
  if (asset === "XLM") return u32(0);
  const [code, issuer] = asset.split(":");
  const key = issuer ? strkeyPayload(issuer) : null;
  if (!code || !key || key.kind !== "G" || !/^[A-Za-z0-9]{1,12}$/.test(code)) return null;
  const len = code.length <= 4 ? 4 : 12;
  const c = new Uint8Array(len);
  c.set(new TextEncoder().encode(code));
  return concat(u32(len === 4 ? 1 : 2), c, u32(0), key.bytes);
}

/** Stellar Asset Contract id for `asset` on `networkPassphrase` (C... strkey bytes). */
export async function sacContractId(asset: string, networkPassphrase: string): Promise<Uint8Array | null> {
  const a = assetXdr(asset);
  if (!a) return null;
  const networkId = await sha256(new TextEncoder().encode(networkPassphrase));
  // HashIdPreimage::ContractId(ENVELOPE_TYPE_CONTRACT_ID=8){networkId, ContractIdPreimage::Asset(=1)}
  return sha256(concat(u32(8), networkId, u32(1), a));
}

/** Expected XDR of `SorobanAuthorizedInvocation` for the transfer. */
async function expectedInvocation(e: ExpectedPayment, token: Uint8Array): Promise<Uint8Array | null> {
  const from = scAddress(e.account), to = scAddress(e.destination);
  if (!from || !to || !Number.isSafeInteger(e.amountStroops) || e.amountStroops <= 0) return null;
  const sym = new TextEncoder().encode("transfer");
  const amount = new Uint8Array(16);
  new DataView(amount.buffer).setBigUint64(8, BigInt(e.amountStroops));
  return concat(
    u32(0), // SorobanAuthorizedFunction::ContractFn
    u32(1), token, // ScAddress::Contract(asset contract)
    u32(sym.length), sym, // ScSymbol("transfer") (8 bytes, no padding)
    u32(3), // args
    u32(18), from, // ScVal::Address(account)
    u32(18), to, // ScVal::Address(destination)
    u32(10), amount, // ScVal::I128 {hi=0, lo=amount}
    u32(0), // no sub-invocations
  );
}

export type ExpectedPayment = {
  account: string;
  destination: string;
  asset: string;
  amountStroops: number;
  networkPassphrase: string;
};

/**
 * Throws unless `prepared` authorizes exactly `expected` on the expected
 * network, and its challenge equals sha256(preimage). Call this before asking
 * the passkey to sign.
 */
export async function verifyPreparedPayment(prepared: PreparedPayment, expected: ExpectedPayment): Promise<void> {
  if (!validPreparedPayment(prepared)) throw new Error("Malformed payment authorization.");
  if (prepared.network_passphrase !== expected.networkPassphrase) throw new Error("Payment is for a different network.");
  const token = await sacContractId(expected.asset, expected.networkPassphrase);
  const invocation = token && (await expectedInvocation(expected, token));
  if (!token || !invocation) throw new Error("Invalid payment details.");
  const pre = b64Bytes(prepared.authorization_preimage_xdr);
  const networkId = await sha256(new TextEncoder().encode(expected.networkPassphrase));
  // HashIdPreimage::SorobanAuthorization (ENVELOPE_TYPE_SOROBAN_AUTHORIZATION = 9):
  // type(4) | networkId(32) | nonce(8) | signatureExpirationLedger(4) | invocation
  const ok =
    equal(pre.subarray(0, 4), u32(9)) &&
    equal(pre.subarray(4, 36), networkId) &&
    equal(pre.subarray(44, 48), u32(prepared.expiration_ledger)) &&
    equal(pre.subarray(48), invocation);
  if (!ok) throw new Error("The authorization does not match the payment you reviewed.");
  if (toB64url(await sha256(pre)) !== prepared.challenge) throw new Error("Challenge does not match the authorization.");
}
