import {expect,test} from "@playwright/test";
import {Keypair,TransactionBuilder,Operation,Account} from "@stellar/stellar-sdk";

// SEP-10 style sign-in for wallets that can sign transactions but not SEP-53
// messages (Albedo, Rabet, hardware wallets, WalletConnect). A real Ed25519
// key signs the challenge exactly as a wallet would.
const PASSPHRASE="Test SDF Network ; September 2015";

async function challenge(page:import("@playwright/test").Page,address:string){
 await page.goto("/login");
 const origin=new URL(page.url()).origin;
 const res=await page.request.post("/api/auth/challenge",{data:{address},headers:{origin}});
 expect(res.status()).toBe(200);
 return {origin,body:await res.json() as {message:string;transaction:string;network_passphrase:string}};
}

test("a wallet-signed challenge transaction creates a session and can never execute",async({page})=>{
 const key=Keypair.random();
 const {origin,body}=await challenge(page,key.publicKey());
 expect(body.network_passphrase).toBe(PASSPHRASE);
 const tx=TransactionBuilder.fromXDR(body.transaction,PASSPHRASE);
 if(!("sequence" in tx))throw Error("expected a plain transaction");
 // Source is the user's own account at sequence 0: always txBAD_SEQ on the network.
 expect(tx.source).toBe(key.publicKey());
 expect(tx.sequence).toBe("0");
 expect(tx.operations).toHaveLength(1);
 expect(tx.operations[0].type).toBe("manageData");
 expect(Number(tx.timeBounds?.maxTime)-Number(tx.timeBounds?.minTime)).toBeLessThanOrEqual(300);
 tx.sign(key);
 const ok=await page.request.post("/api/auth/verify",{data:{address:key.publicKey(),signed_transaction:tx.toXDR()},headers:{origin}});
 expect(ok.status()).toBe(200);
 expect(await (await page.request.get("/api/auth/session")).json()).toMatchObject({authenticated:true,address:key.publicKey()});
});

test("challenge transactions signed by another key, altered, or sent with a message signature are refused",async({page})=>{
 const key=Keypair.random();
 const {origin,body}=await challenge(page,key.publicKey());
 const wrongSigner=TransactionBuilder.fromXDR(body.transaction,PASSPHRASE);
 wrongSigner.sign(Keypair.random());
 expect((await page.request.post("/api/auth/verify",{data:{address:key.publicKey(),signed_transaction:wrongSigner.toXDR()},headers:{origin}})).status()).toBe(401);
 // A different transaction (e.g. a real payment) signed by the right key is not the challenge.
 const altered=new TransactionBuilder(new Account(key.publicKey(),"-1"),{fee:"100",networkPassphrase:PASSPHRASE,timebounds:{minTime:0,maxTime:0}})
  .addOperation(Operation.manageData({name:"other auth",value:"x"})).build();
 altered.sign(key);
 expect((await page.request.post("/api/auth/verify",{data:{address:key.publicKey(),signed_transaction:altered.toXDR()},headers:{origin}})).status()).toBe(401);
 const signed=TransactionBuilder.fromXDR(body.transaction,PASSPHRASE);signed.sign(key);
 expect((await page.request.post("/api/auth/verify",{data:{address:key.publicKey(),signed_transaction:signed.toXDR(),signature:"a".repeat(128)},headers:{origin}})).status()).toBe(400);
 expect(await (await page.request.get("/api/auth/session")).json()).toMatchObject({authenticated:false});
});
