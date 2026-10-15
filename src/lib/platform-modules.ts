/** Runtime boundary for the read-only StealthBridge product module inventory. */
export type PlatformModuleName =
  "wallet"|"corridors"|"quotes"|"payments"|"batch-payouts"|"approvals"|
  "reconciliation"|"webhooks"|"privacy-proofs"|"disclosure"|"partner-settlement";
export interface PlatformModule {
 id:PlatformModuleName;
 audiences:("consumer"|"business"|"developer"|"partner")[];
 availability:"metadata-only"|"planned"|"blocked";
 description:string;
}
export interface PlatformCatalog {
 product:"StealthBridge";
 network:"testnet";
 payment_execution_enabled:false;
 privacy_verified:false;
 mainnet_enabled:false;
 modules:PlatformModule[];
}
export const PLATFORM_MODULES:readonly PlatformModuleName[]=[
 "wallet","corridors","quotes","payments","batch-payouts","approvals",
 "reconciliation","webhooks","privacy-proofs","disclosure","partner-settlement"
] as const;
const AUDIENCES=new Set(["consumer","business","developer","partner"]);
const BLOCKED=new Set(["quotes","payments","batch-payouts","privacy-proofs","partner-settlement"]);
const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==="object"&&!Array.isArray(value);
/** A compromised API must not turn a planned feature into a usable payment control. */
export function validPlatformCatalog(value:unknown):value is PlatformCatalog {
 if(!object(value)||value.product!=="StealthBridge"||value.network!=="testnet"||
  value.payment_execution_enabled!==false||value.privacy_verified!==false||
  value.mainnet_enabled!==false||!Array.isArray(value.modules)||
  value.modules.length!==PLATFORM_MODULES.length)return false;
 const seen=new Set<string>();
 for(const module of value.modules){
  if(!object(module)||typeof module.id!=="string"||
    !PLATFORM_MODULES.includes(module.id as PlatformModuleName)||seen.has(module.id)||
    !Array.isArray(module.audiences)||module.audiences.length<1||module.audiences.length>4||
    new Set(module.audiences).size!==module.audiences.length||
    !module.audiences.every((audience:unknown)=>typeof audience==="string"&&AUDIENCES.has(audience))||
    typeof module.description!=="string"||module.description.trim().length===0||
    module.description.length>180||
    !["metadata-only","planned","blocked"].includes(String(module.availability)))return false;
  if(module.availability==="metadata-only"&&module.id!=="corridors")return false;
  if(module.id==="corridors"&&module.availability!=="metadata-only")return false;
  if(BLOCKED.has(module.id)&&module.availability!=="blocked")return false;
  seen.add(module.id);
 }
 return PLATFORM_MODULES.every(id=>seen.has(id));
}
