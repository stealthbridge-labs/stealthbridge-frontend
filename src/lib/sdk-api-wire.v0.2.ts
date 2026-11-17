/** AUTO-GENERATED from specs/backend-openapi.v0.3.yaml.
 * Backend source commit: ba0e579084750be1ad7b001f98830a342fa51b5c
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

export interface ApiSmartAccountKitEntry {
  name: "account_code" | "webauthn_instance" | "webauthn_code" | "threshold_instance" | "threshold_code" | "spendingLimit_instance" | "spendingLimit_code";
  kind: "code" | "instance";
  expected_wasm_hash: string;
  observed_wasm_hash: string | null;
  status: "live" | "low_ttl" | "unavailable" | "mismatch";
  live_until_ledger: number | null;
  ttl_remaining_ledgers: number | null;
}

export interface ApiSmartAccountKitObservation {
  schema_version: 1;
  network: "testnet";
  source: "stellar-rpc/pinned-smart-account-kit";
  observed_at_unix: number;
  observed_ledger_sequence: number;
  kit_version: "0.10.0";
  entries: [ApiSmartAccountKitEntry & {name: "account_code"; kind: "code"}, ApiSmartAccountKitEntry & {name: "webauthn_instance"; kind: "instance"}, ApiSmartAccountKitEntry & {name: "webauthn_code"; kind: "code"}, ApiSmartAccountKitEntry & {name: "threshold_instance"; kind: "instance"}, ApiSmartAccountKitEntry & {name: "threshold_code"; kind: "code"}, ApiSmartAccountKitEntry & {name: "spendingLimit_instance"; kind: "instance"}, ApiSmartAccountKitEntry & {name: "spendingLimit_code"; kind: "code"}];
  all_entries_healthy: boolean;
  customer_smart_account_factory_deployed: false;
  customer_smart_account_created: false;
  credential_recovery_verified: false;
  privacy_proofs_verified: false;
  mainnet_enabled: false;
  financial_execution_enabled: false;
  operator_managed_deployment: true;
}

