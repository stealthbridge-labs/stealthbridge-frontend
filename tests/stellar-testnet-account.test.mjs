import {test} from "node:test";
import assert from "node:assert/strict";
import {getPublicTestnetAccount,parsePublicTestnetAccount} from "../src/lib/stellar-testnet-account.ts";

const account="GBBCOFZZ3RDQHTC662EVM3UO5SAXQEZB6DL64HLEJYEYJ4KBVL3CDLTE";
const fixture=()=>({
 account_id:account,sequence:"420000000000",
 balances:[{asset_type:"native",balance:"101.2345678"}],
});
test("consented Horizon read uses only fixed Testnet host and a public G-address",async()=>{
 const calls=[];
 const value=await getPublicTestnetAccount(account,async(url,options)=>{
  calls.push({url,options});
  return new Response(JSON.stringify(fixture()),{status:200,headers:{"content-type":"application/json"}});
 });
 assert.equal(value.address,account);
 assert.equal(value.nativeXlmBalance,"101.2345678");
 assert.equal(value.financialExecutionAuthorized,false);
 assert.equal(value.source,"stellar-horizon-testnet");
 assert.equal(calls[0].url,"https://horizon-testnet.stellar.org/accounts/"+account);
 assert.equal(calls[0].options.method,"GET");
 assert.equal(calls[0].options.redirect,"error");
 assert.equal(calls[0].options.credentials,"omit");
 assert.equal(calls[0].options.cache,"no-store");
 assert.equal(calls[0].options.headers.accept,"application/json");
});
test("invalid address is rejected before any network request",async()=>{
 let accessed=false;
 await assert.rejects(getPublicTestnetAccount("SAADPRIVATEKEY",async()=>{
  accessed=true;throw new Error("network");
 }),TypeError);
 assert.equal(accessed,false);
});
test("forged identity, missing balances and misleading XLM values fail closed",()=>{
 const alterations=[
  {account_id:"GINVALID"},
  {balances:[{asset_type:"credit_alphanum4",balance:"10"}]},
  {balances:[{asset_type:"native",balance:"NaN"}]},
  {balances:[{asset_type:"native",balance:"1.00000000"}]},
  {balances:[{asset_type:"native",balance:"-1"}]},
  {balances:[{asset_type:"native",balance:"1"},{asset_type:"native",balance:"2"}]},
  {sequence:0},
 ];
 for(const changes of alterations)
  assert.throws(()=>parsePublicTestnetAccount({...fixture(),...changes},account));
});
test("404 and enormous streaming responses reject without inventing funds",async()=>{
 await assert.rejects(getPublicTestnetAccount(account,async()=>new Response("",{status:404})),/not funded/);
 await assert.rejects(getPublicTestnetAccount(account,async()=>new Response(JSON.stringify({data:"A".repeat(40000)}),{
  headers:{"content-type":"application/json"}
 })),/size limit/);
});
