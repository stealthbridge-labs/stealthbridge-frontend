"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Activity,ArrowLeft,ArrowRight,BookOpen,Layers,Building2,Database,Globe2,Code2,LockKeyhole,RefreshCw,Search,ShieldCheck,Wallet} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {readBridge,type NetworkStatus,type ServiceReadiness,type ContractDiscovery} from "@/lib/bridge-api";

type Status={network:NetworkStatus|null;ready:ServiceReadiness|null;contracts:ContractDiscovery|null;loading:boolean;error:boolean};
const initial:Status={network:null,ready:null,contracts:null,loading:true,error:false};
const links=[
 {href:"/preview/governance",title:"Verified governance release",label:"On-chain Testnet receipts",icon:ShieldCheck,detail:"Inspect real deployed Soroban contract IDs and live-checked deployment transactions; financial execution remains disabled."},
 {href:"/preview/upgrades",title:"Protocol upgrade review",label:"Soroban operations",icon:Layers,detail:"Inspect proposed registry WASM hashes and timelocks without signing, deploying or claiming authority."},
 {href:"/preview/approvals",title:"Business review controls",label:"Maker-checker policy",icon:Building2,detail:"Explore tenant-aware reviewer separation rules without enabling settlements."},
 {href:"/preview/developers",title:"Developer integration",label:"Read-only SDK preflight",icon:Code2,detail:"Check the Testnet API, platform catalog, source-only Soroban state, and SDK integration boundaries."},
 {href:"/preview/modules",title:"Platform modules",label:"Product availability",icon:Layers,detail:"Compare real backend capability stages for consumer, business, developer and partner modules; no financial execution."},
 {href:"/preview/business",title:"Business workspace",label:"Treasury visibility",icon:Wallet,detail:"Inspect the public Testnet network, configured corridors and a consented public wallet account."},
 {href:"/preview/send",title:"Send workspace",label:"Consumer experience",icon:Globe2,detail:"Explore private-payment research availability without any enabled money movement."},
 {href:"/preview/corridors",title:"Corridor directory",label:"Real PostgreSQL records",icon:Database,detail:"Query and paginate enabled operator-created routes by countries and declared privacy rail."},
 {href:"/preview/contracts",title:"Soroban registry",label:"Rust source ABI",icon:BookOpen,detail:"Browse all three reviewed source interfaces and independently verified deployment status."},
 {href:"/preview/observability",title:"System observability",label:"Five live read-only checks",icon:Activity,detail:"Compare Stellar RPC, observer checkpoint, backend readiness and disabled payment capabilities without fabricated status."},
 {href:"/explorer",title:"Transaction explorer",label:"On-chain observation",icon:Search,detail:"Look up a real Testnet transaction hash, returning inclusion metadata only."},
] as const;
export function PreviewOverview(){
 const [revision,setRevision]=useState(0);
 const [status,setStatus]=useState<Status>(initial);
 useEffect(()=>{
  const controller=new AbortController();
  setStatus(previous=>({...previous,loading:true,error:false}));
  Promise.allSettled([
   readBridge<NetworkStatus>("network",controller.signal),
   readBridge<ServiceReadiness>("ready",controller.signal),
   readBridge<ContractDiscovery>("contracts",controller.signal)
  ]).then(results=>{
   if(controller.signal.aborted)return;
   const [network,ready,contracts]=results;
   setStatus({
    network:network.status==="fulfilled"?network.value:null,
    ready:ready.status==="fulfilled"?ready.value:null,
    contracts:contracts.status==="fulfilled"?contracts.value:null,
    loading:false,
    error:results.some(result=>result.status==="rejected")
   });
  });
  return ()=>controller.abort();
 },[revision]);
 const now=Math.floor(Date.now()/1000);
 const observed=Number(status.network?.ledger_closed_at_unix);
 const fresh=status.network?.passphrase==="Test SDF Network ; September 2015"
  &&Number.isFinite(observed)&&observed>0&&now-observed<=180&&now-observed>=-30;
 return <div className="workspace-page preview-home">
  <header className="workspace-header"><Brand/><span className="network-chip"><i/> Stellar Testnet</span>
   <Link className="back-link" href="/"><ArrowLeft size={16} aria-hidden/> Public site</Link>
  </header>
  <main id="main-content" className="workspace-main">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / Integration workspace</span>
    <h1>Build on verified ground.</h1>
    <p>A single starting point for our connected frontend, Rust API, PostgreSQL and Soroban source contracts. Every page reads actual configured state; unsupported operations stay disabled.</p>
   </div>
   <div className="preview-health" aria-live="polite">
    <div><Activity size={19} aria-hidden/><span>Stellar ledger</span><strong>{status.loading?"Checking…":fresh?`#${status.network?.ledger_sequence.toLocaleString()}`:"Unverified"}</strong></div>
    <div><Database size={19} aria-hidden/><span>Managed database</span><strong>{status.loading?"Checking…":status.ready?.database==="connected"?"Connected":"Not confirmed"}</strong></div>
    <div><BookOpen size={19} aria-hidden/><span>Soroban contracts</span><strong>{status.loading?"Checking…":status.contracts?.manifest.status==="not-deployed"?"Source only":"Unverified"}</strong></div>
    <div><LockKeyhole size={19} aria-hidden/><span>Financial execution</span><strong>Disabled</strong></div>
   </div>
   <div className="preview-home-toolbar">
    <p role="status">{status.error?"Some backend observations are unavailable. The workspaces remain read-only.":status.loading?"Checking the backend and Testnet…":fresh&&status.ready?.database==="connected"?"Backend dependencies were observed; payments remain disabled.":"Network or database readiness is not fully verified."}</p>
    <Button variant="outline" size="sm" disabled={status.loading} onClick={()=>setRevision(r=>r+1)}><RefreshCw size={16} aria-hidden/> Recheck services</Button>
   </div>
   <section aria-label="Available Testnet experiences">
    <h2 className="preview-hub-title">Choose a workspace</h2>
    <div className="preview-link-grid">
     {links.map(item=><Link href={item.href} key={item.href} className="preview-link-card">
      <div className="preview-link-head"><item.icon size={24} aria-hidden/><ArrowRight size={19} aria-hidden/></div>
      <span>{item.label}</span><h3>{item.title}</h3><p>{item.detail}</p>
      <span className="preview-link-end">Open read-only experience <ArrowRight size={14} aria-hidden/></span>
     </Link>)}
    </div>
   </section>
   <div className="registry-boundary"><ShieldCheck size={19} aria-hidden/>
    <p>This environment is for real infrastructure observation, not transaction execution. The Soroban sources are compiled but not independently deployed; wallet connection is not authentication, and no private transfer or fiat payout is available.</p>
   </div>
  </main>
  <footer className="workspace-footer">StealthBridge · Engineering Testnet workspace · No transfer or signing API</footer>
 </div>;
}
