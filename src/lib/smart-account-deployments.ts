/**
 * Passkey smart accounts: request/response contracts shared by the BFF route
 * and the browser, plus WebAuthn helpers.
 *
 * A deployment record is shown as "deployed" only when the backend observed
 * a successful factory transaction on Stellar Testnet. The passkey's private
 * key never leaves the authenticator; only its public key is sent.
 */

export type DeploymentStatus = "submitted" | "deployed" | "failed";

export type SmartAccountDeployment = {
  contract_address: string;
  label: string;
  owner_public_key: string;
  credential_id: string;
  rp_id: string;
  guardian_address: string | null;
  factory_address: string;
  tx_hash: string;
  status: DeploymentStatus;
  ledger: number | null;
  created_at_unix: number;
};

export type DeploymentDirectory = {
  schema_version: 1;
  network: "testnet";
  account_address: string;
  relayer_configured: boolean;
  max_deployments: number;
  deployments: SmartAccountDeployment[];
};

export type DeployRequest = {
  label: string;
  public_key_hex: string;
  credential_id: string;
  wallet_guardian: boolean;
};

const C_ADDR = /^C[A-Z2-7]{55}$/;
const G_ADDR = /^G[A-Z2-7]{55}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const P256_HEX = /^04[0-9a-f]{128}$/;
const CRED = /^[A-Za-z0-9_-]{16,256}$/;

const exact = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));

export function validLabel(label: unknown): label is string {
  return typeof label === "string" && label.trim().length >= 1 && label.trim().length <= 48 && !/[<>\p{Cc}]/u.test(label);
}

export function validDeployRequest(v: unknown): v is DeployRequest {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return (
    exact(r, ["label", "public_key_hex", "credential_id", "wallet_guardian"]) &&
    validLabel(r.label) &&
    typeof r.public_key_hex === "string" && P256_HEX.test(r.public_key_hex) &&
    typeof r.credential_id === "string" && CRED.test(r.credential_id) &&
    typeof r.wallet_guardian === "boolean"
  );
}

function validDeployment(v: unknown): v is SmartAccountDeployment {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const d = v as Record<string, unknown>;
  return (
    exact(d, ["contract_address", "label", "owner_public_key", "credential_id", "rp_id", "guardian_address",
      "factory_address", "tx_hash", "status", "ledger", "created_at_unix"]) &&
    typeof d.contract_address === "string" && C_ADDR.test(d.contract_address) &&
    validLabel(d.label) &&
    typeof d.owner_public_key === "string" && P256_HEX.test(d.owner_public_key) &&
    typeof d.credential_id === "string" && CRED.test(d.credential_id) &&
    typeof d.rp_id === "string" && d.rp_id.length >= 3 &&
    (d.guardian_address === null || (typeof d.guardian_address === "string" && G_ADDR.test(d.guardian_address))) &&
    typeof d.factory_address === "string" && C_ADDR.test(d.factory_address) &&
    typeof d.tx_hash === "string" && HEX64.test(d.tx_hash) &&
    (d.status === "submitted" || d.status === "deployed" || d.status === "failed") &&
    // "deployed" must carry the ledger it was observed in.
    (d.status === "deployed" ? Number.isSafeInteger(d.ledger) && (d.ledger as number) > 0 : d.ledger === null || Number.isSafeInteger(d.ledger)) &&
    Number.isSafeInteger(d.created_at_unix) && (d.created_at_unix as number) > 0
  );
}

export function validDeploymentDirectory(v: unknown, account: string): v is DeploymentDirectory {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const d = v as Record<string, unknown>;
  return (
    exact(d, ["schema_version", "network", "account_address", "relayer_configured", "max_deployments", "deployments"]) &&
    d.schema_version === 1 && d.network === "testnet" && d.account_address === account &&
    typeof d.relayer_configured === "boolean" &&
    Number.isSafeInteger(d.max_deployments) &&
    Array.isArray(d.deployments) && d.deployments.length <= 10 && d.deployments.every(validDeployment)
  );
}

// ---------------------------------------------------------------- WebAuthn

/** DER SubjectPublicKeyInfo prefix for an uncompressed P-256 (ES256) key. */
const P256_SPKI_PREFIX = "3059301306072a8648ce3d020106082a8648ce3d030107034200";

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** Extracts 04||X||Y from a P-256 SPKI; rejects every other key type. */
export function p256PointFromSpki(spki: ArrayBuffer | Uint8Array): string | null {
  const bytes = spki instanceof Uint8Array ? spki : new Uint8Array(spki);
  if (bytes.length !== 91) return null;
  const hex = toHex(bytes);
  if (!hex.startsWith(P256_SPKI_PREFIX)) return null;
  const point = hex.slice(P256_SPKI_PREFIX.length);
  return P256_HEX.test(point) ? point : null;
}

export function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function" && !!navigator.credentials;
}

/**
 * Creates a discoverable ES256 passkey bound to this site's RP ID and
 * returns only its public material.
 */
export async function createPasskey(label: string): Promise<{ publicKeyHex: string; credentialId: string; rpId: string }> {
  const rpId = window.location.hostname;
  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: { id: rpId, name: "StealthBridge" },
      user: { id: crypto.getRandomValues(new Uint8Array(32)), name: label, displayName: label },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      attestation: "none",
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey creation was cancelled.");
  const response = credential.response as AuthenticatorAttestationResponse;
  if (response.getPublicKeyAlgorithm?.() !== -7) throw new Error("This authenticator did not create a P-256 passkey.");
  const spki = response.getPublicKey?.();
  const publicKeyHex = spki ? p256PointFromSpki(spki) : null;
  if (!publicKeyHex) throw new Error("Could not read the passkey's public key.");
  return { publicKeyHex, credentialId: base64url(credential.rawId), rpId };
}

// ---------------------------------------------------------------- API

export function deploymentErrorMessage(status: number, code?: string): string {
  if (code === "RELAYER_NOT_CONFIGURED") return "Smart-account creation isn't switched on for this environment yet.";
  if (code === "DEPLOYMENT_LIMIT_REACHED" || status === 429) return "You've reached the limit of smart accounts for this wallet.";
  switch (status) {
    case 400: return "That passkey couldn't be used. Please try again.";
    case 401: return "Your session ended. Sign in again to continue.";
    case 409: return "This passkey already has a smart account, or the request was repeated.";
    case 502: return "Stellar Testnet didn't accept the request. Please try again shortly.";
    default: return "The smart-account service is unavailable right now.";
  }
}

export async function listDeployments(account: string, signal?: AbortSignal): Promise<DeploymentDirectory> {
  const res = await fetch("/api/account/smart-accounts/deployments", {
    credentials: "same-origin", cache: "no-store", signal: signal ?? AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw Object.assign(new Error(deploymentErrorMessage(res.status)), { status: res.status });
  const data: unknown = await res.json();
  if (!validDeploymentDirectory(data, account)) throw new Error("Unexpected response from the smart-account service.");
  return data;
}

export async function requestDeployment(input: DeployRequest): Promise<{ contract_address: string; tx_hash: string }> {
  const res = await fetch("/api/account/smart-accounts/deployments", {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "content-type": "application/json" }, body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (res.status !== 202 || !data) {
    const code = (data?.details as { code?: string } | null | undefined)?.code;
    throw new Error(deploymentErrorMessage(res.status, code));
  }
  return data as { contract_address: string; tx_hash: string };
}
