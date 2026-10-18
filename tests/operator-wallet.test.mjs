import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {canonicalStellarAccountAddress} from "../src/lib/stellar-address.ts";

const PUBLIC="GBBCOFZZ3RDQHTC662EVM3UO5SAXQEZB6DL64HLEJYEYJ4KBVL3CDLTE";
test("public Testnet operator address has a genuine Stellar checksum",()=>{
 assert.equal(canonicalStellarAccountAddress(PUBLIC),PUBLIC);
 assert.equal(canonicalStellarAccountAddress(PUBLIC.slice(0,-1)+"A"),null);
 assert.equal(canonicalStellarAccountAddress("S"+"A".repeat(55)),null);
});
test("operator comparison requires explicit Freighter authorization without signing",async()=>{
 const wallet=await readFile("src/components/wallet-connect.tsx","utf8");
 const review=await readFile("src/components/upgrade-review-workspace.tsx","utf8");
 assert.match(wallet,/requestAccess\(\)/);
 assert.match(wallet,/isConnected\(\)/);
 assert.match(wallet,/expectedOperator===address/);
 assert.match(wallet,/operatorMatches/);
 assert.match(wallet,/info\.networkPassphrase!==TESTNET_PASSPHRASE/);
 assert.match(review,/WalletConnect expectedOperatorAddress=\{operatorAddress\}/);
 for(const sensitive of [/signTransaction\(/,/signAuthEntry\(/,/submitTransaction\(/,/secretKey\(/])
  assert.doesNotMatch(wallet,sensitive);
});
test("operator address remains empty until the user provides it",async()=>{
 const review=await readFile("src/components/upgrade-review-workspace.tsx","utf8");
 assert.match(review,/\[operatorAddress,setOperatorAddress\]=useState\(""\)/);
 assert.doesNotMatch(review,/GBBCOFZZ3RDQHTC662EVM3UO5SAXQEZB6DL64HLEJYEYJ4KBVL3CDLTE/);
});
