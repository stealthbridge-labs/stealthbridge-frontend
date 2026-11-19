export type PrivacyArchitectureKind =
  | "local-encrypted-draft"
  | "private-payments"
  | "confidential-token";

export interface RailDisclosureSummary {
  rail: PrivacyArchitectureKind;
  title: string;
  targetUseCase: string;
  whatRemainsPublic: string;
  productionReady: false;
  executionEnabled: false;
}

export function describePrivacyRailForCustomer(
  rail: PrivacyArchitectureKind,
): RailDisclosureSummary {
  if (rail === "local-encrypted-draft") {
    return {
      rail,
      title: "Encrypted draft storage only",
      targetUseCase: "Browser/vault draft protection",
      whatRemainsPublic:
        "Encrypting a draft or verifying a SHA-256 fingerprint never creates confidential on-chain settlement.",
      productionReady: false,
      executionEnabled: false,
    };
  }
  if (rail === "private-payments") {
    return {
      rail,
      title: "Stellar Private Payments · Evaluation only",
      targetUseCase: "Personal shielded pool evaluation",
      whatRemainsPublic:
        "Deposit and withdrawal amounts, edge addresses, ASP checks, fees, and transaction fee-payer remain public; requires note backup and durable event indexing.",
      productionReady: false,
      executionEnabled: false,
    };
  }
  return {
    rail,
    title: "Confidential Tokens · Evaluation only",
    targetUseCase: "Business confidential-amount evaluation",
    whatRemainsPublic:
      "Sender and recipient addresses, counterparty graph, auditor/viewing-key scope, deposits/withdrawals, and issuer freeze or clawback actions remain public or issuer-controlled.",
    productionReady: false,
    executionEnabled: false,
  };
}
