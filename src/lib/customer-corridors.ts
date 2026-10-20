/** Public catalog metadata from real operator-configured PostgreSQL rows.
 * Never equate a row with live settlement, fiat payout or privacy eligibility.
 */
export type CustomerCorridor={
 id:string;
 origin_country:string;
 destination_country:string;
 asset_code:string;
 asset_issuer:string|null;
 privacy_rail:"private-payments"|"confidential-token";
};
export type CustomerCorridorPage={items:CustomerCorridor[];next_cursor:string|null};
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const country=/^[A-Z]{2}$/;
const asset=/^[A-Za-z0-9_:-]{1,64}$/;
const cursor=(value:unknown)=>value===null||(typeof value==="string"&&UUID.test(value));
export function validCustomerCorridorPage(data:unknown):data is CustomerCorridorPage {
 if(!data||typeof data!=="object"||Array.isArray(data))return false;
 const value=data as Record<string,unknown>;
 if(Object.keys(value).sort().join(",")!=="items,next_cursor"||
  !Array.isArray(value.items)||value.items.length>25||!cursor(value.next_cursor))return false;
 const ids=new Set<string>();
 for(const item of value.items){
  if(!item||typeof item!=="object"||Array.isArray(item))return false;
  const row=item as Record<string,unknown>;
  if(Object.keys(row).sort().join(",")!=="asset_code,asset_issuer,destination_country,id,origin_country,privacy_rail"||
   typeof row.id!=="string"||!UUID.test(row.id)||ids.has(row.id.toLowerCase())||
   typeof row.origin_country!=="string"||!country.test(row.origin_country)||
   typeof row.destination_country!=="string"||!country.test(row.destination_country)||
   row.origin_country===row.destination_country||
   typeof row.asset_code!=="string"||!asset.test(row.asset_code)||
   !(row.asset_issuer===null||(typeof row.asset_issuer==="string"&&row.asset_issuer.length>0&&row.asset_issuer.length<=128))||
   !["private-payments","confidential-token"].includes(String(row.privacy_rail)))return false;
  ids.add(row.id.toLowerCase());
 }
 if(value.next_cursor!==null&&
   (!value.items.length||value.next_cursor!==value.items[value.items.length-1].id))return false;
 return true;
}
export async function loadCustomerCorridors(signal?:AbortSignal):Promise<CustomerCorridorPage>{
 const response=await fetch("/api/public/corridors",{method:"GET",cache:"no-store",credentials:"omit",signal});
 if(!response.ok)throw new Error("The corridor directory is temporarily unavailable.");
 const data:unknown=await response.json();
 if(!validCustomerCorridorPage(data))throw new Error("The corridor directory returned unverified records.");
 return data;
}
