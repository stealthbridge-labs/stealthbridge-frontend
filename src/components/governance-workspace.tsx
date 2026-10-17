"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ExternalLink,RefreshCw,ShieldCheck,ShieldAlert} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {readGovernanceRelease,readGovernanceCode} from "@/lib/bridge-api";
import type {GovernanceCodeObservation} from "@/lib/governance-code";
import type {GovernanceRelease} from "@/lib/governance-release";

export function GovernanceWorkspace(){
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState<{
  loading:boolean;release:GovernanceRelease|null;code:GovernanceCodeObservation|null;
  error:string|null;codeError:string|null
 }>({loading:true,release:null,code:null,error:null,codeError:null});
 useEffect(()=>{
  const ctl=new AbortController();
  async function inspect(){
   const [releaseResult,codeResult]=await Promise.allSettled([
    readGovernanceRelease(ctl.signal),readGovernanceCode(ctl.signal)
   ]);
   if(ctl.signal.aborted)return;
   const release=releaseResult.status==="fulfilled"?releaseResult.value:null;
   let code=codeResult.status==="fulfilled"?codeResult.value:null;
   if(code&&(!release||Math.abs(code.observed_ledger_sequence-release.observed_ledger_sequence)>15)){
    code=null; // Never combine incompatible or asynchronously distant ledgers.
   }
   setState({
    loading:false,release,code,
    error:release?null:"Release receipts could not be confirmed against a fresh Testnet observation.",
    codeError:code?null:"Current executable hashes and entry expiry could not be confirmed from the same fresh Testnet head."
   });
  }
  void inspect();
  return ()=>ctl.abort();
 },[revision]);
 const release=state.release;
 const code=state.code;
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
   {release?<section aria-label="Current governance contract code check" className="registry-panel" style={{padding:"1.25rem",marginBottom:"1.25rem"}}>
    <div className="registry-panel-heading"><ShieldCheck size={21} aria-hidden/><div>
     <h2>Current Testnet executable hashes</h2>
     <p>Independent read-only contract-instance ledger entries · no signer required</p>
    </div></div>
    {code?<div role="status">
     <p><strong>{code.all_executable_hashes_match_release
       ?"All three observed executable hashes match the reviewed release."
       :"At least one executable hash differs from the reviewed release."}</strong></p>
     <p>RPC ledger #{code.observed_ledger_sequence.toLocaleString()}. This observation identifies executable hashes and expiry, not a complete WASM re-download or current administrator authorization.</p>
     <dl>
      {code.contracts.map(item=><div key={item.contract_id}>
       <dt>{item.name.replaceAll("-"," ")} — current executable</dt>
       <dd>{item.matches_reviewed_release?"Matches release":"Different from release — review required"}</dd>
       <dt>Current hash</dt><dd><code style={{overflowWrap:"anywhere"}}>{item.current_executable_wasm_hash}</code></dd>
       <dt>Contract instance lives through ledger</dt>
       <dd>{item.live_until_ledger.toLocaleString()}</dd>
      </div>)}
     </dl>
    </div>:<p role="status"><ShieldAlert size={16} aria-hidden/> {state.codeError} No current-code health claim is available.</p>}
    <p>Current admin independently verified: <strong>No</strong>. WASM bytes freshly re-downloaded: <strong>No</strong>. Transfer, platform-fee collection and customer payments: <strong>Disabled</strong>.</p>
   </section>:null}
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
