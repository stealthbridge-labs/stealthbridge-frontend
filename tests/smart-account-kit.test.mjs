import {test} from "node:test";
import assert from "node:assert/strict";
import {SMART_ACCOUNT_PINS,validSmartAccountKit,loadSmartAccountKit} from "../src/lib/smart-account-kit.ts";
const now=1800000000,ledger=1000;
function fixture(){return {schema_version:1,network:"testnet",source:"stellar-rpc/pinned-smart-account-kit",
 kit_version:"0.10.0",observed_at_unix:now,observed_ledger_sequence:ledger,
 entries:SMART_ACCOUNT_PINS.map(([name,kind,expected_wasm_hash])=>({name,kind,expected_wasm_hash,
  observed_wasm_hash:expected_wasm_hash,status:"live",live_until_ledger:ledger+120961,ttl_remaining_ledgers:120961})),
 all_entries_healthy:true,customer_smart_account_factory_deployed:false,customer_smart_account_created:false,
 credential_recovery_verified:false,privacy_proofs_verified:false,mainnet_enabled:false,
 financial_execution_enabled:false,operator_managed_deployment:true};}
test("kit validates exact pinned observations, TTL boundaries and independent unavailable states",()=>{
 const value=fixture();assert.equal(validSmartAccountKit(value,now),true);
 const entry=value.entries[0];
 entry.status="low_ttl";entry.ttl_remaining_ledgers=120960;entry.live_until_ledger=ledger+120960;
 value.all_entries_healthy=false;assert.equal(validSmartAccountKit(value,now),true);
 entry.status="unavailable";entry.observed_wasm_hash=null;entry.live_until_ledger=null;entry.ttl_remaining_ledgers=null;
 assert.equal(validSmartAccountKit(value,now),true);
 entry.live_until_ledger=ledger;entry.ttl_remaining_ledgers=0;
 // An unavailable entry must not claim a live expiration, even a zero TTL.
 assert.equal(validSmartAccountKit(value,now),false);
 entry.live_until_ledger=null;entry.ttl_remaining_ledgers=null;
 entry.observed_wasm_hash=entry.expected_wasm_hash;
 assert.equal(validSmartAccountKit(value,now),true);
 entry.status="low_ttl";entry.live_until_ledger=ledger;entry.ttl_remaining_ledgers=0;
 assert.equal(validSmartAccountKit(value,now),true);
 entry.status="mismatch";entry.observed_wasm_hash="f".repeat(64);entry.live_until_ledger=ledger+12;entry.ttl_remaining_ledgers=12;
 assert.equal(validSmartAccountKit(value,now),true);
});
test("kit fails closed for stale, forged, duplicate, missing, wrong pins and malformed TTLs",()=>{
 const cases=[
  v=>{v.observed_at_unix=now-91;},v=>{v.observed_at_unix=now+1;},
  v=>{v.observed_ledger_sequence=0;},v=>{v.observed_ledger_sequence=4294967296;},v=>{v.network="mainnet";},
  v=>{v.entries[0].observed_wasm_hash="f".repeat(64);},
  v=>{v.entries[0].expected_wasm_hash="f".repeat(64);},
  v=>{v.entries[0].observed_wasm_hash="0".repeat(64);},
  v=>{v.entries[1]=v.entries[0];},v=>{v.entries.pop();},v=>{v.entries.reverse();},
  v=>{v.entries[0].ttl_remaining_ledgers++;},v=>{v.entries[0].live_until_ledger=null;},
  v=>{v.entries[0].ttl_remaining_ledgers=0;},
  v=>{v.entries[0].status="low_ttl";},v=>{v.entries[0].status="mismatch";},
  v=>{v.entries[0].status="unavailable";},v=>{v.entries[0].extra=true;},
  v=>{v.all_entries_healthy=false;},v=>{v.operator_managed_deployment=false;},
  v=>{v.passphrase="unexpected";},v=>{delete v.source;},v=>{v.flags={};}
 ];
 for(const flag of ["customer_smart_account_factory_deployed","customer_smart_account_created",
  "credential_recovery_verified","privacy_proofs_verified","mainnet_enabled","financial_execution_enabled"])
  cases.push(v=>{v[flag]=true;});
 for(const mutate of cases){const value=fixture();mutate(value);assert.equal(validSmartAccountKit(value,now),false,mutate.toString());}
});
test("network failure cannot create a kit observation",async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error("network unavailable");};
 try{await assert.rejects(loadSmartAccountKit(),/network unavailable/);}finally{globalThis.fetch=original;}
});
test("pin manifest keeps exact seven upstream 0.10.0 identities and order",()=>{
 assert.deepEqual(SMART_ACCOUNT_PINS.map(([name,kind])=>[name,kind]),[
  ["account_code","code"],["webauthn_instance","instance"],["webauthn_code","code"],
  ["threshold_instance","instance"],["threshold_code","code"],
  ["spendingLimit_instance","instance"],["spendingLimit_code","code"]
 ]);
 assert.deepEqual([...new Set(SMART_ACCOUNT_PINS.map(([, ,hash])=>hash))],[
  "c514d35ea67eaea9bfc1fb3327854c0c06111bc1ddebd4fe217c504c1004b9e1",
  "e63a030d0f1a1481e36059a4837c433083b33e704c1f9625b7314795b6d72b76",
  "f72a11de6e2d5d2495d98fe61e04cd13544e64156a5a3be83ef8c2e403d14a94",
  "9bc17db0a804d6c82231a268c43bac1413650ea92cac0022e0d0a3b66ddc8189"
 ]);
});
