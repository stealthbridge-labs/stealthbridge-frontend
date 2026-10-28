import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validDependencyDiagnostics} from "../src/lib/dependency-diagnostics.ts";
const now=1800000000;
const safe={schema_version:1,network:"testnet",source:"live-backend-probes",
 observed_at_unix:now,rpc:"connected",database:"ready",read_only_ready:true,
 payment_execution_enabled:false,privacy_verified:false,fiat_payouts_enabled:false};
test("frontend distinguishes missing schema from connectivity and denies unsafe claims",()=>{
 for(const database of ["ready","schema-incomplete","unreachable","not-configured"]){
  const item={...safe,database,read_only_ready:database==="ready"};
  assert.equal(validDependencyDiagnostics(item,now),true);
 }
 for(const bad of [{...safe,network:"mainnet"},{...safe,read_only_ready:false},
  {...safe,privacy_verified:true},{...safe,fiat_payouts_enabled:true},
  {...safe,payment_execution_enabled:true},{...safe,observed_at_unix:now-121}])
  assert.equal(validDependencyDiagnostics(bad,now),false);
});
test("developer diagnostics are preview-only, GET-only and never claims wallet authority",async()=>{
 const workspace=await readFile("src/components/developer-workspace.tsx","utf8");
 const proxy=await readFile("src/app/api/bridge/[...parts]/route.ts","utf8");
 assert.match(workspace,/readDependencyDiagnostics/);
 assert.match(workspace,/schema-incomplete/);
 assert.match(proxy,/"v1\/diagnostics"/);
 assert.match(proxy,/STEALTHBRIDGE_SITE_MODE!=="preview"/);
 assert.doesNotMatch(workspace,/signTransaction|sendPayment/);
});
