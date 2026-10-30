/** Whitelisted account redirects, public corridor UUID only; never PII or arbitrary URLs. */
export type AccountDestination="/app"|"/app/send"|"/app/business"|
 `/app/send?corridor=${string}`|
 `/app/business?corridor=${string}`;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function validAccountDestination(value:unknown):value is AccountDestination{
 if(typeof value!=="string"||value.length>80)return false;
 if(value==="/app"||value==="/app/send"||value==="/app/business")return true;
 const prefixes=["/app/send?corridor=","/app/business?corridor="];
 return prefixes.some(prefix=>value.startsWith(prefix)&&UUID.test(value.slice(prefix.length)));
}
