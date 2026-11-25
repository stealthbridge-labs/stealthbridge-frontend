"use client";
/**
 * Browser side of passkey payments: API calls through the same-origin BFF and
 * the WebAuthn assertion ceremony. Before the passkey is asked to sign,
 * `verifyPreparedPayment` independently confirms that the challenge commits
 * to exactly the payment the customer reviewed.
 */
import {
  base64urlBytes,
  validPaymentDirectory,
  validPreparedPayment,
  verifyPreparedPayment,
  type ExpectedPayment,
  type PaymentAssertion,
  type PaymentDirectory,
  type PreparedPayment,
} from "./smart-account-payments-core";

export * from "./smart-account-payments-core";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export { STROOPS_PER_UNIT, toStroops, formatStroops } from "./stroops";

export function assetLabel(asset: string): string {
  return asset === "XLM" ? "XLM" : asset.split(":")[0];
}

export function paymentErrorMessage(status: number, code?: string): string {
  switch (code) {
    case "PAYMENTS_NOT_CONFIGURED": return "Payments aren't switched on for this environment yet.";
    case "ASSET_NOT_SUPPORTED": return "That asset isn't supported for payments yet.";
    case "PAYMENT_WOULD_FAIL": return "This payment would fail on Stellar, usually because the balance is too low or the recipient can't hold this asset.";
    case "SMART_ACCOUNT_NOT_FOUND": return "That smart account isn't active yet.";
    case "ASSERTION_REJECTED": return "Your passkey's approval couldn't be verified. Nothing was sent.";
    case "REJECTED_BY_ACCOUNT": return "Your smart account rejected the approval. Nothing was sent.";
    case "AUTHORIZATION_EXPIRED": return "This approval expired. Review the payment again.";
    case "PAYMENT_NOT_PENDING": return "This payment was already submitted.";
    case "NETWORK_UNAVAILABLE": case "SUBMISSION_REJECTED": return "Stellar didn't accept the request. Please try again shortly.";
  }
  if (status === 401) return "Your session ended. Sign in again to continue.";
  if (status === 400) return "Check the recipient, asset and amount.";
  return "The payment service is unavailable right now.";
}

async function call(method: "GET" | "POST", body?: unknown) {
  const res = await fetch("/api/account/smart-accounts/payments", {
    method, credentials: "same-origin", cache: "no-store",
    ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const code = (data?.details as { code?: string } | undefined)?.code ?? (data?.code as string | undefined);
  return { res, data, code };
}

export async function listPayments(account: string): Promise<PaymentDirectory> {
  const { res, data, code } = await call("GET");
  if (!res.ok || !validPaymentDirectory(data, account)) throw new Error(paymentErrorMessage(res.status, code));
  return data;
}

export async function preparePayment(input: { contract_address: string; destination: string; asset: string; amount_stroops: number }): Promise<PreparedPayment> {
  const { res, data, code } = await call("POST", { action: "prepare", ...input });
  if (res.status !== 201 || !validPreparedPayment(data)) throw new Error(paymentErrorMessage(res.status, code));
  return data;
}

export async function submitPayment(id: string, assertion: PaymentAssertion): Promise<{ tx_hash: string }> {
  const { res, data, code } = await call("POST", { action: "submit", id, ...assertion });
  if (res.status !== 202 || typeof data?.tx_hash !== "string") throw new Error(paymentErrorMessage(res.status, code));
  return { tx_hash: data.tx_hash };
}

export type AccountBalances = { contract_address: string; balances: { asset: string; balance_stroops: string | null }[] };

export async function listBalances(): Promise<AccountBalances[]> {
  const res = await fetch("/api/account/smart-accounts/balances", { credentials: "same-origin", cache: "no-store" });
  const data = (await res.json().catch(() => null)) as { accounts?: AccountBalances[] } | null;
  if (!res.ok || !Array.isArray(data?.accounts)) throw new Error(paymentErrorMessage(res.status));
  return data.accounts;
}

const toB64url = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * Verifies the prepared authorization against what the customer reviewed,
 * then asks the passkey to sign exactly that challenge.
 */
export async function authorizeWithPasskey(prepared: PreparedPayment, expected: ExpectedPayment): Promise<PaymentAssertion> {
  await verifyPreparedPayment(prepared, expected);
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: base64urlBytes(prepared.challenge) as Uint8Array<ArrayBuffer>,
      rpId: prepared.rp_id,
      allowCredentials: [{ type: "public-key", id: base64urlBytes(prepared.credential_id) as Uint8Array<ArrayBuffer> }],
      userVerification: "required",
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey approval was cancelled.");
  const r = credential.response as AuthenticatorAssertionResponse;
  return {
    authenticator_data: toB64url(r.authenticatorData),
    client_data_json: toB64url(r.clientDataJSON),
    signature: toB64url(r.signature),
  };
}
