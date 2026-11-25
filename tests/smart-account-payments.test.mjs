import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { sacContractId, strkeyPayload, verifyPreparedPayment, validPreparedPayment, validPaymentDirectory } from "../src/lib/smart-account-payments-core.ts";

const TESTNET = "Test SDF Network ; September 2015";
const ACCOUNT = "CAUJ5FMGDISNYEU7T6EQDYRLFF7CVC5F2PXJVEHQHY7HM275I2X6ITH6";
const DEST = "GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
// Produced by the Rust backend (smart_account_payments::parity_fixture).
const PREIMAGE = readFileSync(new URL("./fixtures/payment-preimage.b64", import.meta.url), "utf8").trim();
const challenge = createHash("sha256").update(Buffer.from(PREIMAGE, "base64")).digest("base64url");

const prepared = (over = {}) => ({
  id: "6f0b6f1e-1c2d-4e5f-8a9b-0c1d2e3f4a5b", status: "prepared", contract_address: ACCOUNT, destination: DEST,
  asset: "XLM", asset_contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", amount_stroops: 125_000_000,
  network_passphrase: TESTNET, expiration_ledger: 1000, fee_estimate_stroops: 90000, fee_payer: "stealthbridge-relayer",
  authorization_preimage_xdr: PREIMAGE, challenge, credential_id: "LocalE2ECredential0001", rp_id: "stealthbridge.vercel.app", ...over,
});
const expected = (over = {}) => ({ account: ACCOUNT, destination: DEST, asset: "XLM", amountStroops: 125_000_000, networkPassphrase: TESTNET, ...over });

test("SAC id derivation matches the known Testnet XLM contract", async () => {
  const id = await sacContractId("XLM", TESTNET);
  assert.deepEqual(Buffer.from(id), Buffer.from(strkeyPayload("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC").bytes));
});

test("accepts the Rust-built authorization for exactly the reviewed payment", async () => {
  assert.equal(validPreparedPayment(prepared()), true);
  await verifyPreparedPayment(prepared(), expected());
});

test("rejects recipient, amount, asset, account, network and expiry substitution", async () => {
  const other = "GBXXE7JVT6JPUOLBYZM4ECD63DUVGGPJZXYMVVLUZT42GFPHXG3UEARH";
  for (const e of [expected({ destination: other }), expected({ amountStroops: 125_000_001 }),
    expected({ asset: "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" }),
    expected({ account: "CBNY2LDYIZMQXSN3OKXRGKTCH74GZKTTTW247EG3EF3KCQNSUMYJLTC7" })]) {
    await assert.rejects(verifyPreparedPayment(prepared(), e), /does not match/);
  }
  await assert.rejects(verifyPreparedPayment(prepared(), expected({ networkPassphrase: "Public Global Stellar Network ; September 2015" })), /different network/);
  await assert.rejects(verifyPreparedPayment(prepared({ expiration_ledger: 999 }), expected()), /does not match/);
  await assert.rejects(verifyPreparedPayment(prepared({ challenge: "A".repeat(43) }), expected()), /Challenge/);
});

test("strkey payload checks version and checksum", () => {
  assert.equal(strkeyPayload(DEST).kind, "G");
  assert.equal(strkeyPayload(DEST.slice(0, -1) + (DEST.endsWith("X") ? "Y" : "X")), null);
});

test("a confirmed payment must carry its transaction and ledger", () => {
  const rec = { id: "6f0b6f1e-1c2d-4e5f-8a9b-0c1d2e3f4a5b", contract_address: ACCOUNT, destination: DEST, asset: "XLM",
    asset_contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", amount_stroops: 1, status: "confirmed",
    tx_hash: "a".repeat(64), ledger: 10, fee_estimate_stroops: 1, error_code: null, created_at_unix: 1 };
  const dir = (r) => ({ schema_version: 1, account_address: DEST, payments_configured: true, assets: ["XLM"], payments: [r] });
  assert.equal(validPaymentDirectory(dir(rec), DEST), true);
  assert.equal(validPaymentDirectory(dir({ ...rec, ledger: null }), DEST), false);
  assert.equal(validPaymentDirectory(dir({ ...rec, tx_hash: null }), DEST), false);
});

test("amount parsing is exact to 7 decimals", async () => {
  const { toStroops, formatStroops } = await import("../src/lib/stroops.ts");
  assert.equal(toStroops("12.5"), 125_000_000);
  assert.equal(toStroops("0.0000001"), 1);
  assert.equal(toStroops("0.00000001"), null);
  assert.equal(toStroops("0"), null);
  assert.equal(toStroops("1e5"), null);
  assert.equal(formatStroops("875000000"), "87.5");
});
