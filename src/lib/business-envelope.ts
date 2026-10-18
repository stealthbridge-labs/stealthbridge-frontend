/** Canonical, unsigned metadata for tenant-scoped business *review drafts*.
 * Not a payment command, financial quote, signature or cryptographic approval.
 */
export type ReviewOperation = "invoice-review" | "vendor-onboarding" | "treasury-policy";
export interface BusinessEnvelopeInput {
  organization: string;
  actor: string;
  operation: ReviewOperation;
  reference: string;
  requestKey: string;
}
export interface BusinessEnvelopeDigest {
  canonical: string;
  sha256: string;
  network: "testnet";
  financialExecutionAuthorized: false;
}
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const SUBJECT = /^[A-Za-z0-9]{8,128}$/;
const REFERENCE = /^[A-Za-z0-9_-]{8,64}$/;
const KEY = /^[A-Za-z0-9_-]{16,128}$/;
const OPERATIONS = new Set<string>(["invoice-review","vendor-onboarding","treasury-policy"]);
const PASSPHRASE = "Test SDF Network ; September 2015";

/** Text is ASCII-only with a fixed order and unambiguous separators. */
export function canonicalBusinessEnvelope(value: BusinessEnvelopeInput): string {
  if (!UUID.test(value.organization) ||
    value.organization === "00000000-0000-0000-0000-000000000000" ||
    !SUBJECT.test(value.actor) || !OPERATIONS.has(value.operation) ||
    !REFERENCE.test(value.reference) || !KEY.test(value.requestKey))
    throw new TypeError("Invalid Testnet business review envelope");
  return [
    "StealthBridge business review",
    "network:"+PASSPHRASE,
    "organization:"+value.organization,
    "actor:"+value.actor,
    "operation:"+value.operation,
    "reference:"+value.reference,
    "request_key:"+value.requestKey,
    "",
  ].join("\n");
}
/**
 * Calculate a content digest locally via Web Crypto. A hash is not a signature
 * and cannot substitute for wallet authentication or organization authorization.
 */
export async function digestBusinessEnvelope(
  input: BusinessEnvelopeInput,
): Promise<BusinessEnvelopeDigest> {
  const canonical=canonicalBusinessEnvelope(input);
  const data=new TextEncoder().encode(canonical);
  const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",data));
  const sha256=Array.from(bytes,byte=>byte.toString(16).padStart(2,"0")).join("");
  return {canonical,sha256,network:"testnet",financialExecutionAuthorized:false};
}
