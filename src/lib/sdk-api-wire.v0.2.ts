/** AUTO-GENERATED from specs/backend-openapi.v0.3.yaml.
 * Backend source commit: acad5777f2217917421469e9722fbfbf6222ff7a
 * Run: npm run generate:api-types; edit the pinned schema only after review.
 * Types alone are not runtime validators or permission to move money.
 */
export interface ApiCapabilities {
  payments_enabled: boolean;
  confidential_token_verified: boolean;
  private_payments_verified: boolean;
  fiat_payouts_enabled: boolean;
}

export interface ApiContractDiscovery {
  network: "testnet";
  source: "stealthbridge-contracts/deployments/testnet/manifest.json";
  manifest: Record<string, unknown>;
  public_interface: Record<string, unknown>;
  on_chain_verified: false;
  payment_execution_enabled: false;
}

export interface ApiCorridor {
  id: string;
  origin_country: string;
  destination_country: string;
  asset_code: string;
  asset_issuer?: string | null;
  privacy_rail: "confidential-token" | "private-payments";
}

export interface ApiCorridorPage {
  items: ApiCorridor[];
  next_cursor: string | null;
}

export interface ApiErrorDetail {
  code: "INVALID_REQUEST" | "UNAUTHORIZED" | "NOT_FOUND" | "RATE_LIMITED" | "UPSTREAM_UNAVAILABLE" | "DEPENDENCY_UNAVAILABLE" | "FEATURE_DISABLED" | "REQUEST_FAILED";
  message: string;
}

export interface ApiErrorEnvelope {
  error: ApiErrorDetail;
  trace_id: string;
  details?: ApiReadiness;
}

export interface ApiLedgerCheckpoint {
  ledger_sequence: number;
  ledger_hash: string;
  ledger_closed_at_unix: string;
  source: "stellar-rpc";
}

export interface ApiNetworkStatus {
  network: "testnet";
  passphrase: string;
  protocol_version: number;
  ledger_sequence: number;
  ledger_closed_at_unix: string;
  ledger_hash: string;
  source: "stellar-rpc";
}

export interface ApiReadiness {
  status: "ready" | "degraded";
  stellar_rpc: "connected" | "unavailable";
  database: "connected" | "unavailable" | "not-configured";
  payments: "disabled";
}

export interface ApiTransactionObservation {
  hash: string;
  status: "SUCCESS" | "FAILED";
  ledger: number;
  closed_at_unix: string;
  latest_ledger: number;
  source: "stellar-rpc";
}

