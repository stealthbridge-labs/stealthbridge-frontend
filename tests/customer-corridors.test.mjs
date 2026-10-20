import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validCustomerCorridorPage} from "../src/lib/customer-corridors.ts";

const a={
 id:"9a1a395f-249c-4907-b657-d48df4b38d28",
 origin_country:"NG",destination_country:"GH",asset_code:"USDC",
 asset_issuer:null,privacy_rail:"private-payments"
};
test("published corridor records are strict metadata, never synthetic payout quotes",()=>{
 assert.equal(validCustomerCorridorPage({items:[a],next_cursor:null}),true);
 assert.equal(validCustomerCorridorPage({items:[a],next_cursor:a.id}),true);
 for(const row of [
  {...a,origin_country:"XXX"},
  {...a,destination_country:"NG"},
  {...a,privacy_rail:"unverified-rail"},
  {...a,exchange_rate:"1.25"},
  {...a,asset_issuer:""},
 ])assert.equal(validCustomerCorridorPage({items:[row],next_cursor:null}),false);
 assert.equal(validCustomerCorridorPage({items:[a,a],next_cursor:null}),false);
 assert.equal(validCustomerCorridorPage({items:[a],next_cursor:"not-a-cursor"}),false);
 assert.equal(validCustomerCorridorPage({items:[],next_cursor:a.id}),false);
 assert.equal(validCustomerCorridorPage({items:[],next_cursor:null}),true);
});
test("production corridor proxy admits GET-only, bounded input and no finance commands",async()=>{
 const route=await readFile("src/app/api/public/corridors/route.ts","utf8");
 assert.match(route,/export async function GET/);
 assert.match(route,/getAll\(key\).length!==1/);
 assert.match(route,/new URL\("\/v1\/corridors\/page\?limit=25"/);
 assert.match(route,/redirect:"error"/);
 assert.match(route,/cache:"no-store"/);
 assert.match(route,/MAX_BYTES=32768/);
 assert.doesNotMatch(route,/export async function POST|signTransaction|submitPayment/);
});
