"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ExternalLink,RefreshCw,ShieldCheck,ShieldAlert} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {readGovernanceRelease,readGovernanceCode,readGovernanceAdministrator,readGovernanceSnapshot} from "@/lib/bridge-api";
import type {GovernanceSnapshot} from "@/lib/governance-snapshot";
import type {GovernanceAdministratorObservation} from "@/lib/governance-administrator";
import type {GovernanceCodeObservation} from "@/lib/governance-code";
import type {GovernanceRelease} from "@/lib/governance-release";

export function GovernanceWorkspace(){
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState<{
  loading:boolean;release:GovernanceRelease|null;code:GovernanceCodeObservation|null;
  administrator:GovernanceAdministratorObservation|null;
  error:string|null;codeError:string|null;adminError:string|null;snapshot:GovernanceSnapshot|null;
 }>({loading:true,release:null,code:null,administrator:null,error:null,codeError:null,adminError:null,snapshot:null});
 useEffect(()=>{
  const ctl=new AbortController();
  async function inspect(){
   const [releaseResult,codeResult,adminResult,snapshotResult]=await Promise.allSettled([
    readGovernanceRelease(ctl.signal),readGovernanceCode(ctl.signal),readGovernanceAdministrator(ctl.signal),
    readGovernanceSnapshot(ctl.signal)
   ]);
   if(ctl.signal.aborted)return;
   const release=releaseResult.status==="fulfilled"?releaseResult.value:null;
   let code=codeResult.status==="fulfilled"?codeResult.value:null;
   if(code&&(!release||code.observed_ledger_sequence!==release.observed_ledger_sequence)){
    code=null; // Never combine incompatible or asynchronously distant ledgers.
   }
   let administrator=adminResult.status==="fulfilled"?adminResult.value:null;
   if(administrator&&(!code||!code.all_executable_hashes_match_release||
     !administrator.all_administrators_match_deployment||
     !administrator.same_administrator_for_all_contracts||
     administrator.contracts.some(c=>c.paused===true||c.pending_administrator!==null)||
     administrator.observed_ledger_sequence!==code.observed_ledger_sequence)){
     administrator=null;
   }
   setState({
    loading:false,release,code,administrator,
    snapshot:snapshotResult.status==="fulfilled"?snapshotResult.value:null,
    error:release?null:"Release receipts could not be confirmed against a fresh Testnet observation.",
    codeError:code?null:"Current executable hashes and entry expiry could not be confirmed from the same fresh Testnet head.",
    adminError:administrator?null:"The current Soroban administrator storage could not be independently confirmed. Check RPC, contract code and ledger freshness."
   });
  }
  void inspect();
  return ()=>ctl.abort();
 },[revision]);
 const release=state.release;
 const code=state.code;
 const administrator=state.administrator;
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
    <Button type="button" variant="outline" disabled={state.loading} onClick={()=>{setState({loading:true,release:null,code:null,administrator:null,error:null,codeError:null,adminError:null,snapshot:null});setRevision(n=>n+1);}}>
     <RefreshCw size={16} aria-hidden/> Recheck live receipts
    </Button>
   </div>
   <section aria-label="Same-ledger governance evidence" className="registry-panel"
     style={{padding:"1.25rem",marginBottom:"1.25rem"}} aria-live="polite">
    <div className="registry-panel-heading"><ShieldCheck size={20} aria-hidden/><div>
     <h2>Atomic governance evidence</h2>
     <p>One shared contract-instance ledger read · historical transaction receipts separately verified</p>
    </div></div>
    {state.loading?<p role="status">Checking same-ledger governance state…</p>:
     state.snapshot?<div role="status">
      <p><strong>{state.snapshot.state==="consistent-observations"?
       "Public code, deployment and administrator observations agree.":
       "Governance observations disagree — manual review required."}</strong></p>
      <p>Observed ledger #{state.snapshot.observed_ledger_sequence.toLocaleString()}.
       Canonical manifest attested: <strong>No</strong>. Signer possession verified: <strong>No</strong>.
       Payment execution and platform fee collection: <strong>Disabled</strong>.</p>
      <p>{state.snapshot.reason}</p>
     </div>:
     <p role="status">Same-ledger snapshot unavailable or invalid. Independently fetched
      receipts may still be shown below, but cannot establish a unified governance state.</p>}
   </section>
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
    <p>Current admin read from verified instance storage: <strong>{administrator?"Yes":"Unavailable"}</strong>. WASM bytes freshly re-downloaded: <strong>No</strong>. Transfer, platform-fee collection and customer payments: <strong>Disabled</strong>.</p>
   </section>:null}
   {release?<section aria-label="Administrator recovery and current ownership" className="registry-panel" style={{padding:"1.25rem",marginBottom:"1.25rem"}}>
    <div className="registry-panel-heading"><ShieldCheck size={20} aria-hidden/><div>
     <h2>Current governance administrators</h2>
     <p>Read-only administrator storage, recovery nominations and registry pause state</p>
    </div></div>
    {administrator?<div>
     <p role="status"><strong>{administrator.all_administrators_match_deployment
       ?"Administrators still match the deployment record."
       :"At least one administrator has changed since deployment."}</strong></p>
     {administrator.contracts.some(record=>record.pending_administrator!==null)?
      <div role="alert" className="registry-boundary"><ShieldAlert size={17} aria-hidden/>
       <p>Administrator succession is pending on at least one registry. The nominated wallet has not accepted ownership. Verify both signers and current contract storage before any changes.</p>
      </div>:null}
     <p>{administrator.same_administrator_for_all_contracts
       ?"All three currently share the same administrator address."
       :"Governance administration is split across addresses — review carefully."}</p>
     <p>Observed in Testnet ledger #{administrator.observed_ledger_sequence.toLocaleString()}. Ledger closed at {new Date(Number(administrator.observed_ledger_closed_at_unix)*1000).toLocaleString("en-GB",{timeZone:"UTC"})} UTC.
      This proves stored on-chain addresses, <strong>not</strong> access to their keys or the ability to sign claims.</p>
     <dl>{administrator.contracts.map(entry=><div key={entry.contract_id} style={{overflowWrap:"anywhere",marginBottom:"1rem"}}>
      <dt>{entry.name.replaceAll("-"," ")} administrator</dt>
      <dd><code>{entry.current_administrator}</code></dd>
      {entry.pending_administrator?<><dt>Pending recovery nomination</dt>
        <dd><code>{entry.pending_administrator}</code> — not yet accepted by the successor</dd></>:null}
      {entry.paused!==null?<><dt>Registry paused</dt><dd>{entry.paused?"Yes":"No"}</dd></>:null}
     </div>)}</dl>
    </div>:<p role="status"><ShieldAlert size={16} aria-hidden/> {state.adminError} Administrator custody is not assumed.</p>}
    <h3>Before changing computers</h3>
    <p>The local CLI name <code>operator_local</code> is not a recoverable account identity.
     Preserve access to the original signer until you have verified a new wallet with offline
     recovery and completed both parties' on-chain administrator handover. A newly generated
     alias on another PC has no automatic authority. Never paste a seed phrase or secret into this site.</p>
    <p>GovernanceGate remains an immutable deployment-time administrator record;
     registry succession does not rewrite GovernanceGate storage. FeeVault is separate and
     not deployed, and no operator fee claims are available here.</p>
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
    <p>Fresh WASM bytes re-downloaded: <strong>No</strong>. Current administrator entries independently observed: <strong>{administrator?"Yes":"Unavailable"}</strong>. Signer possession confirmed: <strong>No</strong>.
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
