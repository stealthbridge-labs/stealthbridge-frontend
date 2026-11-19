import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {
 canonicalMuxedAccountAddress,
 canonicalMuxedContractAddress,
 canonicalStellarAccountAddress,
 parseStellarAddress,
} from "../src/lib/stellar-address.ts";
import {parseBusinessBatchCsv} from "../src/lib/business-batch.ts";
import {validRecipientPresence,currentRecipientContract} from "../src/lib/recipient-presence.ts";
import {validClassicRecipientPresence,currentClassicRecipient} from "../src/lib/classic-recipient-presence.ts";

const G = "GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const C = "CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB";
const M = "MC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNWAAAAAAAAAAAAGDYO";
const W = "WDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW6AAAAAAAAAAAFKW6A";
const W_BAD_BIT = "WDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW6AAAAAAAAAAAFKW6B";
const M_BAD_BIT = "MAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB6EJCCD2H32MBCWAGR";

test("frontend StrKey parser handles G, C, M and CAP-84 W and rejects non-canonical trailing bits", () => {
 assert.deepEqual(parseStellarAddress(G), { address: G, kind: "classic", baseAddress: G, muxedId: null });
 assert.deepEqual(parseStellarAddress(C), { address: C, kind: "contract", baseAddress: C, muxedId: null });
 assert.deepEqual(parseStellarAddress(M), { address: M, kind: "muxed-classic", baseAddress: G, muxedId: "1" });
 assert.deepEqual(parseStellarAddress(W), { address: W, kind: "muxed-contract", baseAddress: C, muxedId: "42" });

 for (const bad of [W_BAD_BIT, M_BAD_BIT, "S" + G.slice(1), "W" + C.slice(1), "M" + G.slice(1)]) {
  assert.equal(parseStellarAddress(bad), null, bad);
  assert.equal(canonicalMuxedAccountAddress(bad), null, bad);
  assert.equal(canonicalMuxedContractAddress(bad), null, bad);
 }
 assert.equal(canonicalStellarAccountAddress(M), null);
 assert.equal(canonicalStellarAccountAddress(W), null);
});

test("frontend batch CSV and presence validators accept canonical M and CAP-84 W recipients cleanly", () => {
 const csv = [
  "corridor_id,recipient,amount,reference",
  `11111111-2222-4333-8444-555555555555,${M},12.50,INV-M1`,
  `11111111-2222-4333-8444-555555555555,${W},15.00,INV-W1`
 ].join("\n");
 assert.equal(parseBusinessBatchCsv(csv).rows.length, 2);
 assert.throws(() => parseBusinessBatchCsv(csv.replace(W, W_BAD_BIT)), TypeError);

 const now = 1800000000;
 const mPresence = {
  schema_version: 1, network: "testnet", source: "stellar-horizon/account-presence",
  address: M, observed_at_unix: now, classic_account_found: true,
  ownership_verified: false, asset_acceptance_verified: false, payment_execution_enabled: false
 };
 assert.equal(validClassicRecipientPresence(mPresence, M, now), true);
 assert.equal(currentClassicRecipient(mPresence, M, now), true);

 const wPresence = {
  schema_version: 1, network: "testnet", source: "stellar-rpc/recipient-presence",
  address: W, observed_at_unix: now, observed_ledger_sequence: 100, contract_instance_found: true,
  smart_account_verified: false, signer_authority_verified: false,
  recipient_asset_eligibility_verified: false, privacy_verified: false, payment_execution_enabled: false
 };
 assert.equal(validRecipientPresence(wPresence, W, now), true);
 assert.equal(currentRecipientContract(wPresence, W, now), true);
});

test("frontend recipient inputs, API routes and transfer modules handle 69-char M/W without inflating trust", async () => {
 const [workspace, hub, transfer, vault, review] = await Promise.all([
  readFile("src/components/customer-payment-workspace.tsx", "utf8"),
  readFile("src/components/wallet-hub.tsx", "utf8"),
  readFile("src/lib/private-transfer.ts", "utf8"),
  readFile("src/lib/private-draft-vault.ts", "utf8"),
  readFile("src/lib/private-review-commitment.ts", "utf8"),
 ]);
 assert.match(workspace, /maxLength=\{69\}/);
 assert.match(workspace, /mux ID #.*routing is unverified/);
 assert.match(hub, /maxLength=\{69\}/);
 assert.match(hub, /CAP-84 W/);
 assert.match(transfer, /"muxed-contract-candidate"/);
 assert.match(transfer, /sender\.kind!=="classic"/);
 assert.match(vault, /canonicalMuxedContractAddress/);
 assert.match(review, /canonicalMuxedContractAddress/);
});
