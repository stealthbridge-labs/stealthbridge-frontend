import {canonicalStellarAccountAddress} from "./stellar-address";
import {isContractStrKey} from "./observer-activity";

/** A salted, locally created integrity receipt for a reviewed Testnet draft.
 * This is NOT a zero-knowledge proof, encryption, settlement authorization,
 * transfer commitment for a privacy pool, or evidence of payment finality.
 * Keep the random nonce secret: publicizing it can expose low-entropy amounts.
 */
export interface PrivateReviewDraft {
  corridorId:string;
  originCountry:string;
  destinationCountry:string;
  assetCode:string;
  assetIssuer:string|null;
  privacyRail:"confidential-token"|"private-payments";
  sender:string;
  recipient:string;
  amount:string;
  reference:string;
}
export interface PrivateReviewReceipt {
  scheme:"sb-review-sha256-random256-v1";
  network:"stellar-testnet";
  commitment:string;
  nonceHex:string;
  paymentAuthorized:false;
  zkProofVerified:false;
}
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const AMOUNT=/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,7})?$/;
const DOMAIN="StealthBridge private local review v1";
const PASSPHRASE="Test SDF Network ; September 2015";
const HEX64=/^[a-f0-9]{64}$/;
const toHex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");

/** Exact, newline-delimited ASCII serialization shared with Rust tests.
 * A caller may not introduce invisible field separators or another network.
 */
export function canonicalPrivateReviewDraft(draft:PrivateReviewDraft):string {
  const sender=canonicalStellarAccountAddress(draft.sender);
  const recipient=canonicalStellarAccountAddress(draft.recipient)||
    (isContractStrKey(draft.recipient)?draft.recipient:null);
  const assetOk=/^[A-Za-z0-9_:-]{1,64}$/.test(draft.assetCode);
  if(!UUID.test(draft.corridorId)||
    !/^[A-Z]{2}$/.test(draft.originCountry)||
    !/^[A-Z]{2}$/.test(draft.destinationCountry)||
    draft.originCountry===draft.destinationCountry||!assetOk||
    (draft.assetIssuer!==null&&!canonicalStellarAccountAddress(draft.assetIssuer))||
    !["private-payments","confidential-token"].includes(draft.privacyRail)||
    !sender||!recipient||sender===recipient||
    !AMOUNT.test(draft.amount)||Number(draft.amount)<=0||
    !/^[A-Za-z0-9_-]{0,64}$/.test(draft.reference))
    throw new TypeError("Invalid private review draft");
  return [DOMAIN,"network:"+PASSPHRASE,"corridor:"+draft.corridorId,
    "origin:"+draft.originCountry,"destination:"+draft.destinationCountry,
    "asset:"+draft.assetCode,"issuer:"+(draft.assetIssuer??""),
    "rail:"+draft.privacyRail,"sender:"+sender,"recipient:"+recipient,
    "amount:"+draft.amount,"reference:"+draft.reference,""].join("\n");
}
/** Reproducible only when holding the original nonce AND the complete draft. */
export async function digestPrivateReviewDraft(draft:PrivateReviewDraft,nonceHex:string):Promise<string>{
  if(!HEX64.test(nonceHex))throw new TypeError("Review nonce must be 32 random bytes in lowercase hex");
  const bytes=new TextEncoder().encode(DOMAIN+" nonce:"+nonceHex+"\n"+canonicalPrivateReviewDraft(draft));
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)));
}
/** Uses OS-backed Web Crypto randomness; never sends or stores draft/nonce. */
export async function createPrivateReviewReceipt(draft:PrivateReviewDraft):Promise<PrivateReviewReceipt>{
  const canonical=canonicalPrivateReviewDraft(draft);
  if(typeof crypto==="undefined"||!crypto.subtle||!crypto.getRandomValues)
    throw new Error("Secure Web Crypto is required for local review");
  const nonceHex=toHex(crypto.getRandomValues(new Uint8Array(32)));
  const bytes=new TextEncoder().encode(DOMAIN+" nonce:"+nonceHex+"\n"+canonical);
  return {scheme:"sb-review-sha256-random256-v1",network:"stellar-testnet",
    commitment:toHex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))),
    nonceHex,paymentAuthorized:false,zkProofVerified:false};
}
export async function verifyPrivateReviewReceipt(draft:PrivateReviewDraft,receipt:PrivateReviewReceipt):Promise<boolean>{
  if(receipt.scheme!=="sb-review-sha256-random256-v1"||receipt.network!=="stellar-testnet"||
    receipt.paymentAuthorized!==false||receipt.zkProofVerified!==false||
    !HEX64.test(receipt.commitment)||!HEX64.test(receipt.nonceHex))return false;
  try{return await digestPrivateReviewDraft(draft,receipt.nonceHex)===receipt.commitment;}
  catch{return false;}
}
