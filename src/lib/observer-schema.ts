/** Bounded public SQLx-schema readiness. Not observer-worker liveness, settlement, or payment authority. */
export interface ObserverSchema {
 schema_version:1;
 network:"testnet";
 source:"postgresql-sqlx-migrations";
 schema_status:"not-configured"|"unavailable"|"migrations-pending"|"schema-incomplete"|"current";
 registered_migrations:number|null;
 required_migrations:10;
 payment_execution_enabled:false;
 fee_collection_enabled:false;
}
export function validObserverSchema(v:unknown):v is ObserverSchema{
 if(v===null||typeof v!=="object"||Array.isArray(v))return false;
 const o=v as Record<string,unknown>;
 if(Object.keys(o).length!==8||!["schema_version","network","source","schema_status",
  "registered_migrations","required_migrations","payment_execution_enabled","fee_collection_enabled"]
  .every(k=>Object.hasOwn(o,k))||
  o.schema_version!==1||o.network!=="testnet"||o.source!=="postgresql-sqlx-migrations"||
  o.required_migrations!==10||o.payment_execution_enabled!==false||o.fee_collection_enabled!==false)
  return false;
 const n=o.registered_migrations;
 if(n!==null&&(!Number.isSafeInteger(n)||Number(n)<0||Number(n)>10))return false;
 switch(o.schema_status){
  case "not-configured": case "unavailable":return n===null;
  case "migrations-pending":return typeof n==="number"&&n<10;
  case "schema-incomplete":case "current":return n===10;
  default:return false;
 }
}
