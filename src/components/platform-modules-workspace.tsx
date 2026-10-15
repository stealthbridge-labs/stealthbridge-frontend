"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,Layers,RefreshCw,ShieldAlert} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {readPlatformModules} from "@/lib/bridge-api";
import type {PlatformCatalog,PlatformModule} from "@/lib/platform-modules";

type Audience="all"|"consumer"|"business"|"developer"|"partner";
const titles:Record<PlatformModule["id"],string>={
 wallet:"Wallet",corridors:"Corridor directory",quotes:"Quote routing",
 payments:"Payments","batch-payouts":"Batch payouts",approvals:"Business approvals",
 reconciliation:"Reconciliation",webhooks:"Developer webhooks",
 "privacy-proofs":"Privacy proofs",disclosure:"Selective disclosure",
 "partner-settlement":"Partner settlement",
};
const audiences:readonly Audience[]=["all","consumer","business","developer","partner"];
const stateLabel={
 "metadata-only":"Metadata only",
 planned:"Planned",
 blocked:"Blocked",
} as const;

export function PlatformModulesWorkspace(){
 const [catalog,setCatalog]=useState<PlatformCatalog|null>(null);
 const [error,setError]=useState(false);
 const [busy,setBusy]=useState(true);
 const [refresh,setRefresh]=useState(0);
 const [audience,setAudience]=useState<Audience>("all");
 useEffect(()=>{
  const abort=new AbortController();
  readPlatformModules(abort.signal).then(value=>{
   if(abort.signal.aborted)return;
   setCatalog(value);setError(false);setBusy(false);
  }).catch(()=>{
   if(abort.signal.aborted)return;
   setCatalog(null);setError(true);setBusy(false);
  });
  return ()=>abort.abort();
 },[refresh]);
 const visible=catalog?.modules.filter(row=>audience==="all"||row.audiences.includes(audience))??[];
 return <div className="workspace-page preview-home">
  <header className="workspace-header">
   <Brand/>
   <span className="network-chip"><i aria-hidden="true"/> Stellar Testnet · Read only</span>
   <Link href="/preview" className="back-link"><ArrowLeft size={16} aria-hidden/> Workspace</Link>
  </header>
  <main className="workspace-main" id="main-content">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / Product infrastructure</span>
    <h1>One platform. Clear boundaries.</h1>
    <p>Explore the consumer, business, developer and partner modules registered by the Rust API.
    A module listing is not proof of contractual deployment, liquidity or payment eligibility.</p>
   </div>
   <div className="preview-home-toolbar">
    <p role="status" aria-live="polite">
     {busy?"Loading reviewed backend inventory…":error?
      "Unable to verify backend inventory. All capabilities should be treated as unavailable.":
      "Catalog received. Financial execution, verified privacy and Mainnet remain disabled."}
    </p>
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>{
     setBusy(true);setError(false);setCatalog(null);setRefresh(value=>value+1);
    }}><RefreshCw size={16} aria-hidden/> Refresh catalog</Button>
   </div>
   <div className="registry-boundary"><ShieldAlert size={18} aria-hidden/>
    <p>Product stages describe current implementation work, not availability to send money.
    Corridor metadata depends on operator-configured PostgreSQL; payment submissions are disabled.</p>
   </div>
   <section aria-label="Filter product modules">
    <h2 className="preview-hub-title">Product modules</h2>
    <div className="preview-home-toolbar" role="group" aria-label="Audience">
     {audiences.map(value=><Button type="button" variant={audience===value?"default":"outline"}
      size="sm" key={value} aria-pressed={audience===value}
      onClick={()=>setAudience(value)}>{value==="all"?"All":value[0].toUpperCase()+value.slice(1)}</Button>)}
    </div>
    {catalog?<div className="preview-link-grid" data-testid="platform-modules">
     {visible.map(row=><article key={row.id} className="preview-link-card">
      <div className="preview-link-head"><Layers size={24} aria-hidden/>
       <span>{stateLabel[row.availability]}</span>
      </div>
      <h3>{titles[row.id]}</h3>
      <p>{row.description}</p>
      <span className="preview-link-end">Audience: {row.audiences.join(", ")}</span>
     </article>)}
    </div>:<p role="status">{busy?"Checking modules…":"Module data unavailable; no actions enabled."}</p>}
   </section>
  </main>
  <footer className="workspace-footer">StealthBridge · Product architecture preview · No financial execution</footer>
 </div>;
}
