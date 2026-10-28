/** Live server dependency diagnostics, not KYC, privacy verification, or payment eligibility. */
export interface DependencyDiagnostics {
 schema_version:1;network:"testnet";source:"live-backend-probes";
 observed_at_unix:number;rpc:"connected"|"unavailable";
 database:"ready"|"schema-incomplete"|"unreachable"|"not-configured";
 read_only_ready:boolean;payment_execution_enabled:false;
 privacy_verified:false;fiat_payouts_enabled:false;
}
/** Reject forged, stale, contradictory, extended or mainnet response bodies. */
export function validDependencyDiagnostics(value:unknown,nowUnix:number):value is DependencyDiagnostics {
 if(!value||typeof value!=="object"||Array.isArray(value)||
    !Number.isSafeInteger(nowUnix)||nowUnix<=0)return false;
 const v=value as Record<string,unknown>;
 const keys=["schema_version","network","source","observed_at_unix","rpc","database",
  "read_only_ready","payment_execution_enabled","privacy_verified","fiat_payouts_enabled"];
 if(Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))return false;
 return v.schema_version===1&&v.network==="testnet"&&v.source==="live-backend-probes"&&
  Number.isSafeInteger(v.observed_at_unix)&&Number(v.observed_at_unix)>0&&
  nowUnix-Number(v.observed_at_unix)>=-30&&nowUnix-Number(v.observed_at_unix)<=120&&
  ["connected","unavailable"].includes(String(v.rpc))&&
  ["ready","schema-incomplete","unreachable","not-configured"].includes(String(v.database))&&
  typeof v.read_only_ready==="boolean"&&
  v.read_only_ready===(v.rpc==="connected"&&v.database==="ready")&&
  v.payment_execution_enabled===false&&v.privacy_verified===false&&v.fiat_payouts_enabled===false;
}
