import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validBeneficiaryDirectory,
  validUpsertBeneficiaryInput,
} from "../src/lib/account-beneficiaries.ts";

const OWNER = "GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const TARGET_CLASSIC = "GCMNQ7HHWLT7YBAFGHJBVPEZEANTZTIAZXCDTYNWHLESDGRMBIITUMOW";
const TARGET_CONTRACT = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";
const TARGET_W = "WDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW6AAAAAAAAAAAFKW6A";

test("account beneficiaries enforce strict G/M/C/W validation and backend flags", () => {
  assert.equal(
    validUpsertBeneficiaryInput({
      id: "11111111-1111-4111-8111-111111111111",
      recipient_address: TARGET_W,
      label: "Muxed Contract Vault",
      flow: "business",
    }),
    true,
  );
  assert.equal(
    validUpsertBeneficiaryInput({
      id: "11111111-1111-4111-8111-111111111111",
      recipient_address: "invalid",
      label: "Bad",
      flow: "personal",
    }),
    false,
  );

  const valid = {
    schema_version: 1,
    network: "testnet",
    source: "neon-account-beneficiaries",
    account_address: OWNER,
    identity_verified: false,
    payment_execution_enabled: false,
    items: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        recipient_address: TARGET_CLASSIC,
        recipient_kind: "classic",
        label: "Family Account",
        flow: "personal",
        created_at_unix: 1795000000,
        updated_at_unix: 1795000001,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        recipient_address: TARGET_CONTRACT,
        recipient_kind: "contract",
        label: "Contract Treasury",
        flow: "business",
        created_at_unix: 1795000000,
        updated_at_unix: 1795000002,
      },
    ],
  };
  assert.equal(validBeneficiaryDirectory(valid, OWNER), true);
  assert.equal(
    validBeneficiaryDirectory({ ...valid, identity_verified: true }, OWNER),
    false,
  );
});

test("account beneficiaries client, proxy, and workspace never use browser storage", async () => {
  const [client, proxy, workspace] = await Promise.all([
    readFile("src/lib/account-beneficiaries.ts", "utf8"),
    readFile("src/app/api/account/beneficiaries/route.ts", "utf8"),
    readFile("src/components/customer-payment-workspace.tsx", "utf8"),
  ]);
  for (const src of [client, proxy, workspace]) {
    assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB/);
  }
  assert.match(proxy, /STEALTHBRIDGE_ACCOUNT_BENEFICIARIES_ENABLED/);
  assert.match(proxy, /stealthbridge-account-beneficiaries-v1/);
  assert.match(workspace, /listAccountBeneficiaries/);
});
