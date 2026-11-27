/**
 * Privacy capability state shown in the product. Mirrors the canonical lock
 * (stealthbridge-contracts integrations/privacy-dependency-lock.v2.json) and
 * @stealthbridge/sdk `privacy-rails-v2`; scripts/check-privacy-capabilities.mjs
 * fails CI on drift. Debt: replace with the SDK module once 0.4.0 is published.
 *
 * Nothing here can switch a rail on: availability comes only from the lock's
 * verdict, and both privacy rails are NO_GO.
 */
export type Level = "public" | "hidden" | "auditor-only" | "encrypted";

export interface Mechanism {
  id: "draft-encryption" | "public-transfer" | "personal-shielded-pool" | "business-confidential-token";
  name: string;
  status: "live-testnet" | "research-no-go" | "not-available";
  protects: string;
  public: string;
  verdict?: "GO" | "NO_GO";
}

export const MECHANISMS: readonly Mechanism[] = [
  { id: "public-transfer", name: "Passkey payments", status: "live-testnet",
    protects: "Only your device's passkey can approve a payment.",
    public: "Sender account, recipient, asset, amount and time are visible on Stellar." },
  { id: "draft-encryption", name: "Encrypted drafts", status: "live-testnet",
    protects: "Saved payment details are encrypted in your browser before storage.",
    public: "That a draft exists, and your account. It is not on-chain privacy." },
  { id: "personal-shielded-pool", name: "Personal: shielded pool", status: "research-no-go", verdict: "NO_GO",
    protects: "Inside the pool, transfers hide sender, recipient and amount (Groth16 proofs).",
    public: "Deposits and withdrawals (address, amount, time), fee payer, transaction timing." },
  { id: "business-confidential-token", name: "Business: confidential token", status: "not-available", verdict: "NO_GO",
    protects: "Hides balances and transfer amounts (Pedersen commitments, UltraHonk proofs).",
    public: "Sender and recipient addresses; registered auditors can decrypt amounts." },
];

export const PERSONAL_RAIL = {
  upstream: "NethermindEth/stellar-private-payments",
  deploymentCommit: "25f64658e5c26e0f7aac4b35e68f0fed1507cb83",
  pool: "CCW3LL6DAYESXPLCI5XVHYAM2I6XOW7PUAZLXDH4UAVETQN332B5XIHL",
  poolWasmSha256: "830977a55b6e28ba8388fde5e4ffaa67dba6bbaca5e9d4cd94c2f644bb4c41fb",
  verdict: "NO_GO" as "GO" | "NO_GO",
  verified: [
    "Pool code rebuilt from source is byte-identical to the contract on Testnet.",
    "A proof made with the released proving key is accepted by the live verifier; tampered proofs are rejected.",
    "A passkey smart account can authorize a real pool deposit (tested with the exact Testnet contract code).",
  ],
  blockers: [
    "The circuits use a single-party trusted setup: whoever ran it could forge proofs.",
    "The upstream code is unaudited, and the pool is operated by a third party.",
    "Durable backup of private notes beyond about 7 days of network history is not built yet.",
  ],
};

export const BUSINESS_RAIL = {
  upstream: "OpenZeppelin/stellar-contracts v0.8.0",
  verdict: "NO_GO" as "GO" | "NO_GO",
  blockers: [
    "No reviewed client implementation exists yet.",
    "No Testnet deployment to integrate against.",
    "The audit covers an earlier snapshot; the release delta and client layer are unaudited.",
  ],
};

export function railAvailable(id: Mechanism["id"]): boolean {
  if (id === "personal-shielded-pool") return PERSONAL_RAIL.verdict === "GO";
  if (id === "business-confidential-token") return BUSINESS_RAIL.verdict === "GO";
  return true;
}
