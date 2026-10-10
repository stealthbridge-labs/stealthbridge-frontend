#!/usr/bin/env node
// Read-only deployed-site smoke verification. No wallet, credentials or fund movement.
import assert from "node:assert/strict";

const provided = process.argv[2] ?? process.env.STEALTHBRIDGE_WEB_URL;
if (!provided) {
  console.error("Usage: npm run smoke -- https://your-frontend-host");
  process.exit(2);
}
const base = new URL(provided);
if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost","127.0.0.1"].includes(base.hostname))) {
  console.error("Deployed URL must use HTTPS (HTTP allowed only on localhost).");
  process.exit(2);
}
const fetchPage = async (path) => {
  const response = await fetch(new URL(path, base), {cache:"no-store", signal:AbortSignal.timeout(15000)});
  return response;
};
for (const path of ["/","/business","/send"]) {
  const res = await fetchPage(path);
  assert.equal(res.status, 200, `${path} returned HTTP ${res.status}`);
  assert.match(await res.text(), /StealthBridge/i, `${path} did not include StealthBridge identity`);
  console.log(`PASS ${path} — reachable frontend page`);
}
const network = await fetchPage("/api/bridge/v1/network");
assert.equal(network.status, 200, `Live RPC proxy returned HTTP ${network.status}. Check frontend STEALTHBRIDGE_API_URL and backend STELLAR_RPC_URL.`);
const data = await network.json();
assert.equal(data.network,"testnet","Backend must not connect to Mainnet");
assert.equal(data.passphrase,"Test SDF Network ; September 2015");
assert.ok(Number.isSafeInteger(data.ledger_sequence) && data.ledger_sequence > 0, "Missing observed ledger sequence");
assert.match(data.ledger_hash,/^[0-9a-f]{64}$/i,"Missing real ledger hash");
const closed = data.ledger_closed_at_unix;
assert.match(closed,/^[0-9]{1,20}$/,"Missing Stellar ledger close time");
const ledgerAge = Math.floor(Date.now()/1000)-Number(closed);
assert.ok(ledgerAge >= -30 && ledgerAge <= 180,`Stellar ledger is stale or future-dated (${ledgerAge}s)`);
console.log(`PASS Stellar RPC: ledger ${data.ledger_sequence}, protocol ${data.protocol_version}`);
const corridors = await fetchPage("/api/bridge/v1/corridors");
if (corridors.status === 200) {
  const rows = await corridors.json();
  assert.ok(Array.isArray(rows), "Corridor catalog must be a JSON array");
  console.log(`PASS corridor catalog: ${rows.length} operator-configured records`);
} else if (corridors.status === 503) {
  if(process.env.STEALTHBRIDGE_REQUIRE_DATABASE==="1") throw new Error("PostgreSQL must be reachable for the live integration gate");
  console.log("NOTICE corridor catalog unavailable — configure the backend PostgreSQL database and apply migrations");
} else {
  throw new Error(`Unexpected corridor response HTTP ${corridors.status}`);
}
const flags = await fetchPage("/api/bridge/v1/capabilities");
assert.equal(flags.status,200);
const capabilities=await flags.json();
assert.equal(typeof capabilities.payments_enabled,"boolean");
console.log("PASS capabilities response");
// Verify that the backend and contract manifest cannot advertise unverified payments.
const contracts = await fetchPage("/api/bridge/v1/contracts");
assert.equal(contracts.status,200,"Contract discovery must be reachable in engineering staging");
const discovery = await contracts.json();
assert.equal(discovery.network,"testnet");
assert.equal(discovery.on_chain_verified,false,"Do not advertise undeployed contracts as verified");
assert.equal(discovery.payment_execution_enabled,false,"Payment execution must remain disabled");
assert.equal(discovery.manifest?.status,"not-deployed");
assert.deepEqual(discovery.manifest?.contractAddresses,{},"Unexpected deployed contract addresses");
console.log("PASS canonical Testnet contract discovery (undeployed, payment execution disabled)");

const readiness = await fetchPage("/api/bridge/ready");
assert.ok([200,503].includes(readiness.status),"Readiness must return 200 or degraded 503");
const envelope = await readiness.json();
const dependencies = readiness.status===200?envelope:envelope.details;
assert.ok(dependencies&&typeof dependencies==="object","Missing readiness status payload");
assert.equal(dependencies.payments,"disabled");
assert.equal(dependencies.status,readiness.status===200?"ready":"degraded");
if(process.env.STEALTHBRIDGE_REQUIRE_DATABASE==="1"){
 assert.equal(readiness.status,200,"Live database gate requires fully connected backend dependencies");
 assert.equal(dependencies.database,"connected");
 assert.equal(dependencies.stellar_rpc,"connected");
}
console.log("PASS backend dependency readiness (payment execution disabled)");

assert.equal(capabilities.payments_enabled,false,"Backend must not enable fund movement");
assert.equal(capabilities.confidential_token_verified,false,"Confidential token rail is not verified");
assert.equal(capabilities.private_payments_verified,false,"Private payments rail is not verified");
assert.equal(capabilities.fiat_payouts_enabled,false,"Fiat payouts must remain disabled");

// The same-origin read-only proxy must reject mutation methods.
const writeAttempt=await fetch(new URL("/api/bridge/v1/settlements",base),{
 method:"POST",headers:{"content-type":"application/json"},body:"{}",cache:"no-store",signal:AbortSignal.timeout(15000)
});
assert.equal(writeAttempt.status,405,"Frontend proxy must not forward settlement writes");
console.log("PASS frontend rejects settlement submission (HTTP 405)");

console.log("Smoke check covers site/network discovery only; does NOT verify confidential transfers, real FX, or fiat payouts.");
