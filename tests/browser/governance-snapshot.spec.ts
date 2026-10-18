import {expect,test} from "@playwright/test";

// Exact public contract-release identities shared with SDK tests.
// These fixtures cannot and do not authorize financial transactions.
const contracts=[
 ["corridor-registry","CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB",
  "588d17f99850272f2f18e6ee407d94329b4f8ae415c2f6b71993cf59f4139099",
  "0ac4094247fd50872d079c9637b0975f825f99574e6722c9c69739d8c5c143e5",5244269],
 ["policy-registry","CBXWEA5PMDTBN5AN7FJYGGAPIWLRKXYHWLVWG5WOXH3HSRDB4RYTJBN5",
  "856186ba3dca1feff010c670bd1ae9818bf69e284304273f943745603b9a7912",
  "34c2e84cad5be5181b7e1964d4e48e2c26ca021583373922f821c0038abce118",5244283],
 ["governance-gate","CD2KIMDRYJMKGO5SMIBOQP6ADPW5I4THNZFGXWYLIPGSXAI5NRXVAPKV",
  "66b40fe5ee4f704a91acf39922ed130cc1eb4fc0cdc3c5ee5a30614921f4aa81",
  "9468801411a6bbb7fb2966c0225057bb4f3c8a7113aa687c0a0be744a7c5b341",5244293]
];
const admin="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
function snapshot(){
 const ledger=5244400,time=String(Math.floor(Date.now()/1000)-4);
 return {
  schema_version:1,network:"testnet",source:"stellar-rpc+stellar-horizon",
  state:"consistent-observations",
  reason:"Public same-ledger observations agree; canonical release not attested",
  observed_ledger_sequence:ledger,observed_network_head_closed_at_unix:time,
  canonical_manifest_attested:false,signer_possession_verified:false,
  trusted_for_execution:false,privacy_verified:false,
  payment_execution_enabled:false,fee_collection_enabled:false,
  release:{
   schema_version:1,network:"testnet",
   source:"stealthbridge-contracts/deployments/testnet/governance-deployment-evidence.v2.json",
   release_date:"2026-10-17",administrator_at_release:admin,
   observed_ledger_sequence:ledger,observed_ledger_closed_at_unix:time,
   contracts:contracts.map(([name,contract_id,wasm_sha256_at_release,deployment_tx,deployment_ledger])=>({
    name,contract_id,wasm_sha256_at_release,deployment_tx,deployment_ledger,deployment_transaction_confirmed:true
   })),deployment_transactions_confirmed:true,onchain_code_freshly_verified:false,
   administrator_freshly_verified:false,privacy_verified:false,
   payment_execution_enabled:false,fee_collection_enabled:false
  },
  code:{
   schema_version:1,network:"testnet",source:"stellar-rpc/getLedgerEntries",
   observed_ledger_sequence:ledger,
   contracts:contracts.map(([name,contract_id,hash])=>({
    name,contract_id,current_executable_wasm_hash:hash,
    release_executable_wasm_hash:hash,matches_reviewed_release:true,
    last_modified_ledger:5244300,live_until_ledger:5300000
   })),all_executable_hashes_match_release:true,
   current_administrator_verified:false,wasm_bytes_freshly_downloaded:false,
   privacy_verified:false,payment_execution_enabled:false,fee_collection_enabled:false
  },
  administrators:{
   schema_version:1,network:"testnet",
   source:"stellar-rpc/getLedgerEntries/contract-instance-storage",
   observed_ledger_sequence:ledger,observed_ledger_closed_at_unix:time,
   reviewed_release_executable_hashes_confirmed:true,
   administrator_entries_read_from_current_storage:true,
   same_administrator_for_all_contracts:true,all_administrators_match_deployment:true,
   release_administrator:admin,
   contracts:contracts.map(([name,contract_id],i)=>({
    name,contract_id,current_administrator:admin,pending_administrator:null,
    paused:i===2?null:false,matches_deployment_administrator:true
   })),signer_possession_verified:false,fee_collection_enabled:false,
   payment_execution_enabled:false,privacy_verified:false
  }
 };
}

test("same-ledger governance uses one backend read with no duplicate RPC fan-out",async({page})=>{
 const calls:string[]=[];
 await page.route("**/api/bridge/**",route=>{
  const path=new URL(route.request().url()).pathname;
  calls.push(path);
  if(path==="/api/bridge/v1/governance/snapshot")
   return route.fulfill({json:snapshot()});
  return route.fulfill({status:503,json:{code:"UPSTREAM_UNAVAILABLE"}});
 });
 await page.goto("/preview/governance");
 await expect(page.getByText("Public code, deployment and administrator observations agree.")).toBeVisible();
 await expect(page.getByText(/Canonical manifest attested:/)).toBeVisible();
 expect(calls).toEqual(["/api/bridge/v1/governance/snapshot"]);
 await expect(page.getByText(/Payment execution and platform fee collection:/)).toContainText("Disabled");
});
test("forged execution flag invalidates the atomic response; no success is shown",async({page})=>{
 const calls:string[]=[];
 await page.route("**/api/bridge/**",route=>{
  const path=new URL(route.request().url()).pathname;
  calls.push(path);
  if(path==="/api/bridge/v1/governance/snapshot"){
   const forged=snapshot();
   forged.payment_execution_enabled=true;
   return route.fulfill({json:forged});
  }
  return route.fulfill({status:503,json:{code:"UPSTREAM_UNAVAILABLE"}});
 });
 await page.goto("/preview/governance");
 await expect(page.getByText(/Same-ledger snapshot unavailable or invalid/)).toBeVisible();
 await expect(page.getByText("Public code, deployment and administrator observations agree.")).toHaveCount(0);
 await expect(page.getByRole("heading",{name:"Public deployment evidence"})).toHaveCount(0);
 expect(calls).toContain("/api/bridge/v1/governance/release");
 expect(calls).toContain("/api/bridge/v1/governance/code");
 expect(calls).toContain("/api/bridge/v1/governance/admin");
});
