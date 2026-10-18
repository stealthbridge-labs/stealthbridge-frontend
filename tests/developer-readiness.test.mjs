import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {assessDeveloperReadiness} from "../src/lib/developer-readiness.ts";

const NOW=1_800_000_000;
const safe={
 network:{network:"testnet",passphrase:"Test SDF Network ; September 2015",source:"stellar-rpc",
  ledger_sequence:14,ledger_closed_at_unix:String(NOW-5)},
 readiness:{status:"ready",stellar_rpc:"connected",database:"connected",payments:"disabled"},
 capabilities:{payments_enabled:false,confidential_token_verified:false,
  private_payments_verified:false,fiat_payouts_enabled:false},
 catalog:{product:"StealthBridge",network:"testnet",payment_execution_enabled:false,
  privacy_verified:false,mainnet_enabled:false,modules:[
   "wallet","corridors","quotes","payments","batch-payouts","approvals",
   "reconciliation","webhooks","privacy-proofs","disclosure","partner-settlement"
  ].map(id=>({id,availability:id==="corridors"?"metadata-only":"blocked"}))},
 contracts:{on_chain_verified:false,payment_execution_enabled:false,
  manifest:{network:"testnet",status:"not-deployed",verified:false}},
};
test("safe integration observation never enables signing or money movement",()=>{
 const status=assessDeveloperReadiness(safe,NOW);
 assert.equal(status.verdict,"read-only-ready");
 assert.equal(status.funds_movement_enabled,false);
 assert.equal(status.wallet_signing_enabled,false);
 assert.equal(status.fiat_payouts_enabled,false);
});
test("degraded or forged observations never become available",()=>{
 const missing=assessDeveloperReadiness({},NOW);
 assert.equal(missing.verdict,"degraded");
 const bad=JSON.parse(JSON.stringify(safe));
 bad.capabilities.payments_enabled=true;
 assert.equal(assessDeveloperReadiness(bad,NOW).verdict,"unsafe-claim");
 const wrong=JSON.parse(JSON.stringify(safe));
 wrong.network.passphrase="Public Global Stellar Network ; September 2015";
 assert.equal(assessDeveloperReadiness(wrong,NOW).verdict,"unsafe-claim");
 const stale=JSON.parse(JSON.stringify(safe));
 stale.network.ledger_closed_at_unix=String(NOW-400);
 assert.equal(assessDeveloperReadiness(stale,NOW).verdict,"degraded");
});
test("developer workspace is preview-only and uses real bounded GET bridge",async()=>{
 const page=await readFile("src/app/preview/developers/page.tsx","utf8");
 const component=await readFile("src/components/developer-workspace.tsx","utf8");
 const proxy=await readFile("src/app/api/bridge/[...parts]/route.ts","utf8");
 assert.match(page,/STEALTHBRIDGE_SITE_MODE!=="preview"/);
 assert.match(page,/notFound\(\)/);
 assert.match(component,/readPlatformModules/);
 assert.match(component,/readBridge/);
 assert.doesNotMatch(component,/submitTransaction|signTransaction|sendPayment/);
 assert.match(proxy,/export async function GET/);
 assert.doesNotMatch(proxy,/export async function POST/);
});
