import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canonicalCustomerAuthorizationDigest,
  canonicalSettlementIntentDigest,
  validSettlementLifecycleDirectory,
} from "../src/lib/settlement-lifecycle.ts";
import {
  buildReconciliationCsv,
  buildReconciliationReportJson,
  plainLanguageLifecycleSummary,
  stageProgressForLifecycle,
} from "../src/lib/settlement-reconciliation.ts";

const OWNER = "GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const CORRIDOR_ID = "a12ef783-d60b-4427-aa62-d2562acd4cef";

test("frontend lifecycle digest and directory guards reject mainnet/fiat claims", async () => {
  const digest = await canonicalSettlementIntentDigest(OWNER, {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: null,
    instruction_id: null,
    corridor_id: CORRIDOR_ID,
    route_fingerprint: "20c275c9036c67194652e03698526070566bafc86cb1cc523f76df6161441c20",
    idempotency_key: "idem-key-1234567890",
    asset_code: "USDC",
    asset_issuer: null,
    amount_minor_units: 2_500_000,
    recipient_address: OWNER,
    privacy_rail: "private-payments",
    expires_in_seconds: 3600,
  });
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.match(
    await canonicalCustomerAuthorizationDigest(OWNER, digest),
    /^[0-9a-f]{64}$/,
  );

  const valid = {
    schema_version: 1,
    network: "testnet",
    source: "account-settlement-lifecycles",
    account_address: OWNER,
    observed_at_unix: 1_795_000_000,
    mainnet_enabled: false,
    live_fx_enabled: false,
    fiat_payouts_enabled: false,
    items: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        corridor_id: CORRIDOR_ID,
        request_sha256: digest,
        state: "quote_unavailable",
        events: [],
      },
    ],
  };
  assert.equal(validSettlementLifecycleDirectory(valid, OWNER), true);
  assert.equal(
    validSettlementLifecycleDirectory({ ...valid, fiat_payouts_enabled: true }, OWNER),
    false,
  );
});

test("customer payment workspace integrates authenticated settlement lifecycle panel safely", async () => {
  const workspace = await readFile("src/components/customer-payment-workspace.tsx", "utf8");
  const panel = await readFile("src/components/settlement-lifecycle-panel.tsx", "utf8");
  const route = await readFile("src/app/api/account/settlements/route.ts", "utf8");
  assert.match(workspace, /SettlementLifecyclePanel/);
  assert.match(panel, /On-chain Testnet finality never equals\s+fiat payout completion/);
  assert.match(route, /STEALTHBRIDGE_SETTLEMENT_LIFECYCLE_ENABLED/);
  assert.match(route, /stealthbridge-settlement-lifecycle-v1/);
});

test("reconciliation export and lifecycle progression preserve factual Testnet boundaries", () => {
  const pausedStages = stageProgressForLifecycle("quote_unavailable");
  assert.equal(pausedStages[0].status, "halted");
  assert.equal(pausedStages[6].status, "upcoming");

  const finalizedStages = stageProgressForLifecycle("reconciled");
  assert.ok(finalizedStages.every((step) => step.status === "done"));

  const sampleRow = {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: null,
    instruction_id: null,
    corridor_id: CORRIDOR_ID,
    route_fingerprint: "20c275c9036c67194652e03698526070566bafc86cb1cc523f76df6161441c20",
    idempotency_key: "idem-key-1234567890",
    request_sha256: "a".repeat(64),
    asset_code: "USDC",
    asset_issuer: null,
    amount_minor_units: 25_000_000,
    recipient_address: OWNER,
    recipient_kind: "classic",
    privacy_rail: "private-payments",
    privacy_rail_verified: false,
    quote_status: "unavailable",
    quote_sha256: null,
    policy_commitment_sha256: null,
    customer_auth_sha256: null,
    state: "chain_finalized",
    revision: 5,
    expires_at_unix: 1_795_003_600,
    testnet_tx_hash: "f".repeat(64),
    observed_ledger: 5818583,
    observed_at_unix: 1_795_000_123,
    chain_status: "SUCCESS",
    payout_status: "unavailable",
    reconciliation_status: "pending",
    last_error_code: null,
    created_at_unix: 1_795_000_000,
    updated_at_unix: 1_795_000_123,
    events: [],
  };
  assert.match(plainLanguageLifecycleSummary(sampleRow), /fiat payout remains unavailable/i);
  const csv = buildReconciliationCsv([sampleRow]);
  assert.match(csv, /^id,created_at_iso,network,asset_code,/);
  assert.match(csv, /"2\.5000000"/);
  assert.match(csv, /"5818583"/);
  assert.match(csv, /"unavailable","pending","false","false"/);

  const parsedJson = JSON.parse(buildReconciliationReportJson(OWNER, [sampleRow]));
  assert.equal(parsedJson.mainnet_enabled, false);
  assert.equal(parsedJson.live_fx_enabled, false);
  assert.equal(parsedJson.fiat_payouts_enabled, false);
  assert.equal(parsedJson.record_count, 1);
});
