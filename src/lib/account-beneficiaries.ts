import { canonicalStellarAccountAddress, parseStellarAddress } from "./stellar-address.ts";

export type BeneficiaryFlow = "personal" | "business";
export type BeneficiaryRecipientKind =
  | "classic"
  | "muxed-classic"
  | "contract"
  | "muxed-contract";

export interface UpsertBeneficiaryInput {
  id: string;
  recipient_address: string;
  label: string;
  flow: BeneficiaryFlow;
}

export interface AccountBeneficiary {
  id: string;
  recipient_address: string;
  recipient_kind: BeneficiaryRecipientKind;
  label: string;
  flow: BeneficiaryFlow;
  created_at_unix: number;
  updated_at_unix: number;
}

export interface BeneficiaryDirectory {
  schema_version: 1;
  network: "testnet";
  source: "neon-account-beneficiaries";
  account_address: string;
  items: AccountBeneficiary[];
  identity_verified: false;
  payment_execution_enabled: false;
}

const UUID_RE = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const KINDS = new Set<string>(["classic", "muxed-classic", "contract", "muxed-contract"]);

const exactKeys = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));

export function validBeneficiaryLabel(label: unknown): label is string {
  if (typeof label !== "string") return false;
  const len = [...label].length;
  return (
    len > 0 &&
    len <= 48 &&
    label.trim() === label &&
    !/[<>\u0000-\u001f\u007f]/.test(label)
  );
}

export function validUpsertBeneficiaryInput(input: unknown): input is UpsertBeneficiaryInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const v = input as Record<string, unknown>;
  return (
    exactKeys(v, ["id", "recipient_address", "label", "flow"]) &&
    typeof v.id === "string" &&
    UUID_RE.test(v.id) &&
    typeof v.recipient_address === "string" &&
    parseStellarAddress(v.recipient_address) !== null &&
    validBeneficiaryLabel(v.label) &&
    (v.flow === "personal" || v.flow === "business")
  );
}

export function validDeleteBeneficiaryInput(input: unknown): input is { id: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const v = input as Record<string, unknown>;
  return exactKeys(v, ["id"]) && typeof v.id === "string" && UUID_RE.test(v.id);
}

export function validBeneficiaryRecord(item: unknown): item is AccountBeneficiary {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const v = item as Record<string, unknown>;
  if (
    !exactKeys(v, [
      "id",
      "recipient_address",
      "recipient_kind",
      "label",
      "flow",
      "created_at_unix",
      "updated_at_unix",
    ])
  ) {
    return false;
  }
  const parsed =
    typeof v.recipient_address === "string" ? parseStellarAddress(v.recipient_address) : null;
  return (
    typeof v.id === "string" &&
    UUID_RE.test(v.id) &&
    parsed !== null &&
    typeof v.recipient_kind === "string" &&
    KINDS.has(v.recipient_kind) &&
    parsed.kind === v.recipient_kind &&
    validBeneficiaryLabel(v.label) &&
    (v.flow === "personal" || v.flow === "business") &&
    typeof v.created_at_unix === "number" &&
    Number.isSafeInteger(v.created_at_unix) &&
    v.created_at_unix > 0 &&
    typeof v.updated_at_unix === "number" &&
    Number.isSafeInteger(v.updated_at_unix) &&
    v.updated_at_unix >= v.created_at_unix
  );
}

export function validBeneficiaryDirectory(
  data: unknown,
  accountAddress: string,
): data is BeneficiaryDirectory {
  const canonicalOwner = canonicalStellarAccountAddress(accountAddress);
  if (!canonicalOwner || !data || typeof data !== "object" || Array.isArray(data)) return false;
  const v = data as Record<string, unknown>;
  return (
    exactKeys(v, [
      "schema_version",
      "network",
      "source",
      "account_address",
      "items",
      "identity_verified",
      "payment_execution_enabled",
    ]) &&
    v.schema_version === 1 &&
    v.network === "testnet" &&
    v.source === "neon-account-beneficiaries" &&
    v.account_address === canonicalOwner &&
    v.identity_verified === false &&
    v.payment_execution_enabled === false &&
    Array.isArray(v.items) &&
    v.items.length <= 25 &&
    v.items.every(validBeneficiaryRecord)
  );
}

export async function listAccountBeneficiaries(
  accountAddress: string,
  signal?: AbortSignal,
): Promise<BeneficiaryDirectory> {
  const response = await fetch("/api/account/beneficiaries", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw Error("Saved beneficiaries are unavailable.");
  const data: unknown = await response.json();
  if (!validBeneficiaryDirectory(data, accountAddress)) {
    throw Error("Beneficiaries response failed verification.");
  }
  return data;
}

export async function saveAccountBeneficiary(
  accountAddress: string,
  input: UpsertBeneficiaryInput,
): Promise<BeneficiaryDirectory> {
  if (!validUpsertBeneficiaryInput(input)) {
    throw new TypeError("Enter a valid recipient Stellar address and label (1-48 chars).");
  }
  const response = await fetch("/api/account/beneficiaries", {
    method: "PUT",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    if (response.status === 401) throw Error("Your session has expired. Sign in again.");
    if (response.status === 409) throw Error("Beneficiary limit reached or conflicting request.");
    throw Error("Unable to save beneficiary to your account.");
  }
  const data: unknown = await response.json();
  if (!validBeneficiaryDirectory(data, accountAddress)) {
    throw Error("Saved beneficiaries response failed verification.");
  }
  return data;
}

export async function removeAccountBeneficiary(
  accountAddress: string,
  id: string,
): Promise<BeneficiaryDirectory> {
  if (!UUID_RE.test(id)) throw new TypeError("Invalid beneficiary id.");
  const response = await fetch("/api/account/beneficiaries", {
    method: "DELETE",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    if (response.status === 401) throw Error("Your session has expired. Sign in again.");
    if (response.status === 409) throw Error("This saved recipient could not be removed.");
    throw Error("Unable to remove beneficiary from your account.");
  }
  const data: unknown = await response.json();
  if (!validBeneficiaryDirectory(data, accountAddress)) {
    throw Error("Updated beneficiaries response failed verification.");
  }
  return data;
}
