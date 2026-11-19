import test from "node:test";
import assert from "node:assert/strict";
import {
  loadLocalBeneficiaries,
  removeLocalBeneficiary,
  saveLocalBeneficiary,
} from "../src/lib/local-beneficiaries.ts";

const OWNER = "GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const TARGET_CLASSIC = "GCMNQ7HHWLT7YBAFGHJBVPEZEANTZTIAZXCDTYNWHLESDGRMBIITUMOW";
const TARGET_CONTRACT = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

test("local beneficiaries enforce Stellar address validation, deduplication, and owner scoping", () => {
  const store = memoryStorage();
  assert.deepEqual(loadLocalBeneficiaries(OWNER, store), []);

  // Rejects invalid recipient
  assert.deepEqual(saveLocalBeneficiary(OWNER, "not-an-address", "Bad", store), []);

  // Saves valid G and C addresses cleanly
  const first = saveLocalBeneficiary(OWNER, TARGET_CLASSIC, "Ghana Supplier\nCorp", store);
  assert.equal(first.length, 1);
  assert.equal(first[0].label, "Ghana Supplier Corp");

  const second = saveLocalBeneficiary(OWNER, TARGET_CONTRACT, "Escrow Vault", store);
  assert.equal(second.length, 2);
  assert.equal(second[0].address, TARGET_CONTRACT);

  // Deduplicates and updates label cleanly
  const updated = saveLocalBeneficiary(OWNER, TARGET_CLASSIC, "Updated Family", store);
  assert.equal(updated.length, 2);
  assert.equal(updated[0].address, TARGET_CLASSIC);
  assert.equal(updated[0].label, "Updated Family");

  // Removes one entry and clears store when last is removed
  const remaining = removeLocalBeneficiary(OWNER, TARGET_CONTRACT, store);
  assert.equal(remaining.length, 1);
  const empty = removeLocalBeneficiary(OWNER, TARGET_CLASSIC, store);
  assert.deepEqual(empty, []);
  assert.deepEqual(loadLocalBeneficiaries(OWNER, store), []);
});

test("corrupted storage JSON fails safely without throwing", () => {
  const store = memoryStorage();
  store.setItem(`sb:beneficiaries:v1:${OWNER}`, "{not json");
  assert.deepEqual(loadLocalBeneficiaries(OWNER, store), []);
});
