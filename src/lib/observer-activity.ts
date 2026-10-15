/** Read-only observer activity records. Not executed payments or ZK verification. */
export interface ActivityContract {
 contract_id:string;
 next_start_ledger:number;
 observed_at_unix:string;
}
export interface ActivityEvent {
 id:string;
 contract_id:string;
 tx_hash:string;
 ledger_sequence:number;
 observed_at_unix:string;
}
export interface PublicActivityPage {
 network:"testnet";
 source:"stored-public-testnet-metadata";
 observation_status:"no-checkpoint"|"checkpoint-present";
 payment_execution_enabled:false;
 contracts:ActivityContract[];
 items:ActivityEvent[];
 next_cursor:string|null;
}
export interface ActivityFilters {
 limit?:number;
 contractId?:string;
 before?:string;
}
const EVENT_ID=/^[0-9]{19}-[0-9]{10}$/;
const HASH=/^[a-f0-9]{64}$/;
const DECIMAL=/^[0-9]{1,20}$/;
function obj(value:unknown):value is Record<string,unknown>{
 return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function exactKeys(value:Record<string,unknown>,keys:string[]):boolean{
 return Object.keys(value).length===keys.length&&
  keys.every(key=>Object.hasOwn(value,key));
}
/** Check the actual StrKey C-address version + CRC16-XModem, not only its alphabet. */
export function isContractStrKey(value:string):boolean{
 if(typeof value!=="string"||!/^C[A-Z2-7]{55}$/.test(value))return false;
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
 const decoded:number[]=[];
 let acc=0,bits=0;
 for(const ch of value){
  const v=alphabet.indexOf(ch);
  if(v<0)return false;
  acc=(acc<<5)|v;
  bits+=5;
  if(bits>=8){
   bits-=8;
   decoded.push((acc>>>bits)&255);
   acc&=(1<<bits)-1;
  }
 }
 if(decoded.length!==35||bits!==0||decoded[0]!==16)return false;
 let crc=0;
 for(const byte of decoded.slice(0,33)){
  crc^=byte<<8;
  for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;
 }
 return crc===decoded[33]+(decoded[34]<<8);
}
function validEvent(value:unknown):value is ActivityEvent{
 return obj(value)&&exactKeys(value,["id","contract_id","tx_hash","ledger_sequence","observed_at_unix"])&&
  typeof value.id==="string"&&EVENT_ID.test(value.id)&&
  typeof value.contract_id==="string"&&isContractStrKey(value.contract_id)&&
  typeof value.tx_hash==="string"&&HASH.test(value.tx_hash)&&
  typeof value.ledger_sequence==="number"&&Number.isSafeInteger(value.ledger_sequence)&&value.ledger_sequence>0&&
  typeof value.observed_at_unix==="string"&&DECIMAL.test(value.observed_at_unix)&&Number(value.observed_at_unix)>0;
}
function validContract(value:unknown):value is ActivityContract{
 return obj(value)&&exactKeys(value,["contract_id","next_start_ledger","observed_at_unix"])&&
  typeof value.contract_id==="string"&&isContractStrKey(value.contract_id)&&
  typeof value.next_start_ledger==="number"&&Number.isSafeInteger(value.next_start_ledger)&&value.next_start_ledger>0&&
  typeof value.observed_at_unix==="string"&&DECIMAL.test(value.observed_at_unix)&&Number(value.observed_at_unix)>0;
}
export function isActivityCursor(value:string):boolean{
 if(typeof value!=="string")return false;
 const dot=value.indexOf(".");
 return dot===30&&EVENT_ID.test(value.slice(0,dot))&&isContractStrKey(value.slice(dot+1));
}
export function assertActivityFilters(filters:ActivityFilters):number{
 const limit=filters.limit??15;
 if(!Number.isSafeInteger(limit)||limit<1||limit>25)throw new RangeError("Activity page limit must be 1–25.");
 if(filters.contractId!==undefined&&!isContractStrKey(filters.contractId))
  throw new TypeError("Observer contract must be a checksum-valid Stellar C-address.");
 if(filters.before!==undefined){
  if(!isActivityCursor(filters.before))throw new TypeError("Observer activity cursor is invalid.");
  if(filters.contractId!==undefined&&!filters.before.endsWith("."+filters.contractId))
   throw new TypeError("Activity cursor does not belong to the requested contract.");
 }
 return limit;
}
/** Reject fabricated deployments, invalid JSON and out-of-order public rows. */
export function validateActivityPage(
 value:unknown,filters:ActivityFilters={}
):value is PublicActivityPage{
 let limit:number;
 try{limit=assertActivityFilters(filters);}catch{return false;}
 if(!obj(value)||!exactKeys(value,["network","source","observation_status","payment_execution_enabled","contracts","items","next_cursor"])||
    value.network!=="testnet"||value.source!=="stored-public-testnet-metadata"||
    value.payment_execution_enabled!==false||
    !["no-checkpoint","checkpoint-present"].includes(String(value.observation_status))||
    !Array.isArray(value.contracts)||value.contracts.length>5||
    !Array.isArray(value.items)||value.items.length>limit||
    !value.contracts.every(validContract)||!value.items.every(validEvent))
  return false;
 const contracts:ActivityContract[]=value.contracts;
 const events:ActivityEvent[]=value.items;
 if(value.observation_status===(contracts.length?"no-checkpoint":"checkpoint-present"))return false;
 if(contracts.some((entry,index)=>index>0&&contracts[index-1].contract_id>=entry.contract_id))
  return false;
 if(events.some((event,index)=>{
  const key=event.id+"."+event.contract_id;
  return !contracts.some(contract=>contract.contract_id===event.contract_id)||
    (filters.contractId!==undefined&&event.contract_id!==filters.contractId)||
    (index>0&&events[index-1].id+"."+events[index-1].contract_id<=key)||
    (filters.before!==undefined&&key>=filters.before);
 }))return false;
 const cursor=value.next_cursor;
 if(cursor!==null && (typeof cursor!=="string"||!isActivityCursor(cursor)||
    events.length!==limit||cursor!==events[events.length-1]?.id+"."+events[events.length-1]?.contract_id))
   return false;
 return true;
}
