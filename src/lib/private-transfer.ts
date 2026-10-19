import {canonicalStellarAccountAddress} from "./stellar-address";
import {isContractStrKey} from "./observer-activity";

/** Address classification is not wallet authorization. Any Soroban C-address
 * may be an arbitrary contract; it is not automatically a smart account.
 */
export type PublicAddressIdentity={
 address:string;
 kind:"classic"|"contract-candidate";
 ownershipVerified:false;
 smartWalletCodeVerified:false;
};
export function classifyPublicStellarAddress(input:unknown):PublicAddressIdentity|null{
 if(typeof input!=="string"||input.length>128)return null;
 const text=input.trim();
 const classic=canonicalStellarAccountAddress(text);
 if(classic)return {address:classic,kind:"classic",ownershipVerified:false,smartWalletCodeVerified:false};
 if(isContractStrKey(text))return {address:text,kind:"contract-candidate",
  ownershipVerified:false,smartWalletCodeVerified:false};
 return null;
}
export type PrivacyRail="confidential-token"|"private-payments";
export type PaymentPreparation={
 validLocalDraft:boolean;
 submissionAvailable:false;
 blockReasons:(
  "invalid-sender"|"invalid-recipient"|"self-payment"|"invalid-amount"|
  "network-unverified"|"confidential-proof-unverified"|
  "private-pool-unverified"|"payment-execution-disabled"
 )[];
};
/** Pure offline preflight. Never signs or submits; no user draft is logged or sent
 * to any API. Validating a recipient and amount is not proof of confidentiality.
 */
export function preparePrivateTransfer(input:{
 sender:unknown;recipient:unknown;amount:unknown;rail:PrivacyRail;
 backendTestnetFresh:boolean;
}):PaymentPreparation{
 const sender=classifyPublicStellarAddress(input.sender);
 const recipient=classifyPublicStellarAddress(input.recipient);
 const amount=typeof input.amount==="string"&&
  /^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,7})?$/.test(input.amount)&&Number(input.amount)>0;
 const reasons:PaymentPreparation["blockReasons"]=[];
 if(!sender||sender.kind!=="classic")reasons.push("invalid-sender");
 if(!recipient)reasons.push("invalid-recipient");
 if(sender&&recipient&&sender.address===recipient.address)reasons.push("self-payment");
 if(!amount)reasons.push("invalid-amount");
 if(!input.backendTestnetFresh)reasons.push("network-unverified");
 reasons.push(input.rail==="confidential-token"?
  "confidential-proof-unverified":"private-pool-unverified");
 reasons.push("payment-execution-disabled");
 return {validLocalDraft:!!sender&&sender.kind==="classic"&&!!recipient&&
  !reasons.includes("self-payment")&&!!amount&&input.backendTestnetFresh,
  submissionAvailable:false,blockReasons:reasons};
}
