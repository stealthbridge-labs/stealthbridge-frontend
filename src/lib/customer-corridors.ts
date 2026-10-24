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
export type CustomerCorridorFilters={
 origin_country?:string;
 destination_country?:string;
 privacy_rail?:"private-payments"|"confidential-token";
};
const FILTER_FIELDS=["origin_country","destination_country","privacy_rail"] as const;
export function validCustomerCorridorFilters(filters:unknown):filters is CustomerCorridorFilters{
 if(!filters||typeof filters!=="object"||Array.isArray(filters))return false;
 const obj=filters as Record<string,unknown>;
 if(Object.keys(obj).some(key=>!FILTER_FIELDS.includes(key as typeof FILTER_FIELDS[number])))return false;
 for(const field of ["origin_country","destination_country"] as const){
  const value=obj[field];if(value!==undefined&&(typeof value!=="string"||!/^[A-Z]{2}$/.test(value)))return false;
 }
 const rail=obj.privacy_rail;
 return rail===undefined||rail==="private-payments"||rail==="confidential-token";
}
export function customerCorridorSearch(filters:CustomerCorridorFilters,after?:string):string{
 if(!validCustomerCorridorFilters(filters))throw new TypeError("Invalid corridor search filters.");
 if(after!==undefined&&!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(after))
  throw new TypeError("Invalid corridor pagination cursor.");
 const query=new URLSearchParams();
 for(const name of FILTER_FIELDS){const value=filters[name];if(value)query.set(name,value);}
 if(after)query.set("after",after.toLowerCase());
 const suffix=query.toString();
 return suffix?"?"+suffix:"";
}
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
export async function loadCustomerCorridors(signal?:AbortSignal,after?:string,filters:CustomerCorridorFilters={}):Promise<CustomerCorridorPage>{
 const suffix=customerCorridorSearch(filters,after);
 const response=await fetch("/api/public/corridors"+suffix,{method:"GET",cache:"no-store",credentials:"omit",signal});
 if(!response.ok)throw new Error("The corridor directory is temporarily unavailable.");
 const data:unknown=await response.json();
 if(!validCustomerCorridorPage(data))throw new Error("The corridor directory returned unverified records.");
 if(data.items.some(item=>
  filters.origin_country!==undefined&&item.origin_country!==filters.origin_country||
  filters.destination_country!==undefined&&item.destination_country!==filters.destination_country||
  filters.privacy_rail!==undefined&&item.privacy_rail!==filters.privacy_rail))
  throw new Error("The corridor directory returned records outside the selected filters.");
 return data;
}

/** Revalidate an individual operator-enabled route before local customer review.
 * A list snapshot cannot establish that a route is still configured.
 */
export function sameCustomerCorridor(a:CustomerCorridor,b:CustomerCorridor):boolean{
 return a.id===b.id&&a.origin_country===b.origin_country&&
  a.destination_country===b.destination_country&&a.asset_code===b.asset_code&&
  a.asset_issuer===b.asset_issuer&&a.privacy_rail===b.privacy_rail;
}
export async function loadVerifiedCustomerCorridor(id:string,signal?:AbortSignal):Promise<CustomerCorridor>{
 if(!UUID.test(id))throw new TypeError("Invalid corridor identifier.");
 const response=await fetch("/api/public/corridors/"+encodeURIComponent(id),{
  method:"GET",cache:"no-store",credentials:"omit",signal
 });
 if(!response.ok)throw new Error("The selected route could not be verified. Refresh the corridor directory.");
 const data:unknown=await response.json();
 if(!validCustomerCorridorPage({items:[data],next_cursor:null}))
  throw new Error("The selected route returned invalid corridor metadata.");
 const row=data as CustomerCorridor;
 if(row.id.toLowerCase()!==id.toLowerCase())
  throw new Error("The selected route response does not match its identifier.");
 return row;
}
