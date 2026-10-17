"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ExternalLink,RefreshCw,ShieldCheck,ShieldAlert} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {readGovernanceRelease} from "@/lib/bridge-api";
import type {GovernanceRelease} from "@/lib/governance-release";

export function GovernanceWorkspace(){
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState<{loading:boolean;release:GovernanceRelease|null;error:string|null}>({loading:true,release:null,error:null});
 useEffect(()=>{
  const ctl=new AbortController();
  void readGovernanceRelease(ctl.signal).then(release=>{
   if(!ctl.signal.aborted)setState({loading:false,release,error:null});
  }).catch(()=>{
   if(!ctl.signal.aborted)setState({loading:false,release:null,error:"Release receipts could not be confirmed against a fresh Testnet observation."});
  });
  return ()=>ctl.abort();
 },[revision]);
 const release=state.release;
 return <div className="workspace-page preview-home">
  <header className="workspace-header"><Brand/><span className="network-chip"><i aria-hidden/> Stellar Testnet · Public receipts</span>
   <Link href="/preview" className="back-link"><ArrowLeft size={16} aria-hidden/> Workspace</Link>
  </header>
  <main id="main-content" className="workspace-main">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / Deployed Soroban infrastructure</span>
    <h1>Governance contracts on Testnet.</h1>
    <p>Actual public deployment transactions, pinned release WASM hashes and the administrator recorded at the time of deployment. Each refresh requests independent public transaction receipts through the Rust API; no wallet access or signature is requested.</p>
   </div>
   <div className="registry-boundary"><ShieldAlert size={19} aria-hidden/>
    <p>Receipt confirmation is not a fresh audit of current contract code, upgraded administrator state, issuer readiness, or financial safety. Three governance contracts are deployed; confidentiality, user payments, fee collection and fiat payouts are not enabled.</p>
   </div>
   <div className="preview-home-toolbar">
    <p role="status">{state.loading?"Checking Stellar Testnet receipts…":release?"Three published governance deployments confirmed by Testnet receipts. Payment execution disabled.":state.error}</p>
    <Button type="button" variant="outline" disabled={state.loading} onClick={()=>{setState({loading:true,release:null,error:null});setRevision(n=>n+1);}}>
     <RefreshCw size={16} aria-hidden/> Recheck live receipts
    </Button>
   </div>
   {release?<section aria-label="Testnet governance release" className="registry-panel" style={{padding:"1.25rem"}}>
    <div className="registry-panel-heading"><ShieldCheck size={21} aria-hidden/><div>
     <h2>Public deployment evidence</h2><p>Release {release.release_date} · observed ledger #{release.observed_ledger_sequence.toLocaleString()}</p>
    </div></div>
    <p>Administrator at release: <code style={{overflowWrap:"anywhere"}}>{release.administrator_at_release}</code></p>
    <div className="preview-link-grid">
     {release.contracts.map(item=><article key={item.contract_id} className="preview-link-card" style={{overflowWrap:"anywhere"}}>
      <span>Stellar Testnet · Confirmed deployment transaction</span>
      <h3>{item.name.replaceAll("-"," ")}</h3>
      <p>Contract ID</p><code>{item.contract_id}</code>
      <p>WASM SHA-256 at deployment</p><code>{item.wasm_sha256_at_release}</code>
      <p>Deployment ledger #{item.deployment_ledger.toLocaleString()}</p>
      <a href={"https://stellar.expert/explorer/testnet/tx/"+item.deployment_tx}
       target="_blank" rel="noopener noreferrer" className="back-link">View public transaction <ExternalLink size={14} aria-hidden/></a>
     </article>)}
    </div>
    <p>Current WASM reverified: <strong>No</strong>. Current admin reverified: <strong>No</strong>.
     No contract signing, wallet private keys, customer funds, transfer submission or platform-fee claim actions are exposed here.</p>
   </section>:null}
   <div className="registry-boundary"><ShieldCheck size={18} aria-hidden/>
    <p>For ABI exploration, use the <Link href="/preview/contracts">Soroban source registry</Link>.
    For administrator change checks, use <Link href="/preview/upgrades">the upgrade review workspace</Link>. Neither grants payment authority.</p>
   </div>
  </main>
  <footer className="workspace-footer">StealthBridge · Read-only governance release · No fee collection or transfer signing</footer>
 </div>;
}
