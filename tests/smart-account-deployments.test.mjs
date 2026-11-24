import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto, generateKeyPairSync } from "node:crypto";
import {
  p256PointFromSpki,
  validDeployRequest,
  validDeploymentDirectory,
  deploymentErrorMessage,
} from "../src/lib/smart-account-deployments.ts";

const OWNER = "GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";

test("extracts the uncompressed P-256 point exactly as WebAuthn getPublicKey() returns it", async () => {
  const kp = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
  const spki = new Uint8Array(await webcrypto.subtle.exportKey("spki", kp.publicKey));
  const raw = Buffer.from(await webcrypto.subtle.exportKey("raw", kp.publicKey)).toString("hex");
  assert.equal(p256PointFromSpki(spki), raw);
  assert.match(raw, /^04[0-9a-f]{128}$/);
});

test("rejects non-P-256 keys and truncated input", () => {
  const ed = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "der" });
  assert.equal(p256PointFromSpki(new Uint8Array(ed)), null);
  const p384 = generateKeyPairSync("ec", { namedCurve: "P-384" }).publicKey.export({ type: "spki", format: "der" });
  assert.equal(p256PointFromSpki(new Uint8Array(p384)), null);
  assert.equal(p256PointFromSpki(new Uint8Array(90)), null);
});

test("deploy requests carry only public passkey material", () => {
  const ok = { label: "Everyday", public_key_hex: "04" + "ab".repeat(64), credential_id: "AbCdEfGhIjKlMnOpQrSt", wallet_guardian: true };
  assert.equal(validDeployRequest(ok), true);
  assert.equal(validDeployRequest({ ...ok, private_key: "x" }), false);
  assert.equal(validDeployRequest({ ...ok, public_key_hex: "02" + "ab".repeat(64) }), false);
  assert.equal(validDeployRequest({ ...ok, label: "<b>" }), false);
});

test("a deployment cannot be shown as deployed without the ledger it was observed in", () => {
  const row = {
    contract_address: "C" + "A".repeat(55), label: "Everyday", owner_public_key: "04" + "ab".repeat(64),
    credential_id: "AbCdEfGhIjKlMnOpQrSt", rp_id: "stealthbridge.vercel.app", guardian_address: OWNER,
    factory_address: "C" + "B".repeat(55), tx_hash: "a".repeat(64), status: "deployed", ledger: 5896996, created_at_unix: 1795508616,
  };
  const dir = (r) => ({ schema_version: 1, network: "testnet", account_address: OWNER, relayer_configured: true, max_deployments: 3, deployments: [r] });
  assert.equal(validDeploymentDirectory(dir(row), OWNER), true);
  assert.equal(validDeploymentDirectory(dir({ ...row, ledger: null }), OWNER), false);
  assert.equal(validDeploymentDirectory(dir({ ...row, status: "active" }), OWNER), false);
  assert.equal(validDeploymentDirectory(dir(row), "G" + "B".repeat(55)), false);
});

test("errors are explained in plain language", () => {
  assert.match(deploymentErrorMessage(503, "RELAYER_NOT_CONFIGURED"), /isn't switched on/);
  assert.match(deploymentErrorMessage(409), /already has a smart account/);
});
