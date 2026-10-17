"use client";
import {useState} from "react";
import Link from "next/link";
import {ArrowLeft, ShieldAlert, RefreshCcw, FileCode2} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {assessRegistryUpgrade,type RegistryUpgradeAssessment,type UpgradeableRegistry} from "@/lib/upgrade-review";

const HEX=/^[0-9a-f]{64}$/;
export function UpgradeReviewWorkspace(){
 const [registry,setRegistry]=useState<UpgradeableRegistry>("policy-registry");
 const [candidate,setCandidate]=useState("");
 const [pending,setPending]=useState("");
 const [current,setCurrent]=useState("");
 const [ready,setReady]=useState("");
 const [expires,setExpires]=useState("");
 const [paused,setPaused]=useState(false);
 const [assessment,setAssessment]=useState<RegistryUpgradeAssessment|null>(null);
 const [error,setError]=useState("");
 function clear(){setAssessment(null);setError("");}
 function calculate(){
  clear();
  const c=Number(current),r=Number(ready),e=Number(expires);
  if(!HEX.test(candidate)||!HEX.test(pending)||
     !Number.isSafeInteger(c)||c<=0||!Number.isSafeInteger(r)||
     !Number.isSafeInteger(e)||r<=0||e<=0){
    setError("Enter exact lowercase 64-character hex hashes and positive whole-number ledger sequences.");
    return;
  }
  setAssessment(assessRegistryUpgrade({
    network:"testnet",registry,currentLedger:c,paused,
    candidateWasmSha256:candidate,
    pending:{wasm_hash:pending,ready_at_ledger:r,expires_at_ledger:e},
  }));
 }
 return <div className="workspace-page preview-home">
  <header className="workspace-header">
   <Brand/>
   <span className="network-chip"><i aria-hidden="true"/> Stellar Testnet · No signing</span>
   <Link href="/preview" className="back-link"><ArrowLeft size={16} aria-hidden/> Workspace</Link>
  </header>
  <main id="main-content" className="workspace-main">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / Protocol operations</span>
    <h1>Review changes before upgrading contracts.</h1>
    <p>Compare a proposed WASM hash and ledger window with independently obtained Testnet observations.
    This local calculator cannot inspect the chain, sign, upload, deploy or execute an upgrade.</p>
   </div>
   <div className="registry-boundary"><ShieldAlert size={19} aria-hidden/>
    <p>Only the corridor and policy registries support in-place WASM upgrades. Both require a paused
    contract, current administrator authorization, an exact hash and an elapsed proposal timelock.
    The governance gate remains immutable. No confidential transfer system is deployed or verified.</p>
   </div>
   <section aria-label="Registry upgrade review">
    <h2 className="preview-hub-title"><FileCode2 size={20} aria-hidden/> Operator preflight</h2>
    <form onSubmit={e=>{e.preventDefault();calculate();}} style={{display:"grid",gap:"1rem",maxWidth:"740px"}}>
     <label style={{display:"grid",gap:"0.35rem"}}>Registry
      <select value={registry} onChange={e=>{setRegistry(e.target.value as UpgradeableRegistry);clear();}}>
       <option value="corridor-registry">Corridor registry</option>
       <option value="policy-registry">Policy registry</option>
      </select>
     </label>
     <label style={{display:"grid",gap:"0.35rem"}}>Independently reviewed candidate WASM SHA-256
      <input value={candidate} autoComplete="off" spellCheck={false} maxLength={64}
       placeholder="64 lowercase hexadecimal characters" onChange={e=>{setCandidate(e.target.value);clear();}} required/>
     </label>
     <label style={{display:"grid",gap:"0.35rem"}}>On-chain pending proposal WASM hash
      <input value={pending} autoComplete="off" spellCheck={false} maxLength={64}
       placeholder="64 lowercase hexadecimal characters" onChange={e=>{setPending(e.target.value);clear();}} required/>
     </label>
     <label style={{display:"grid",gap:"0.35rem"}}>Current Testnet ledger sequence
      <input type="number" min="1" step="1" value={current}
       onChange={e=>{setCurrent(e.target.value);clear();}} required/>
     </label>
     <label style={{display:"grid",gap:"0.35rem"}}>Proposal ready-at ledger
      <input type="number" min="1" step="1" value={ready}
       onChange={e=>{setReady(e.target.value);clear();}} required/>
     </label>
     <label style={{display:"grid",gap:"0.35rem"}}>Proposal expiration ledger
      <input type="number" min="1" step="1" value={expires}
       onChange={e=>{setExpires(e.target.value);clear();}} required/>
     </label>
     <label><input type="checkbox" checked={paused} onChange={e=>{setPaused(e.target.checked);clear();}}/>
      {" "}Registry is paused (independently checked on chain)
     </label>
     <Button type="submit" variant="primary"><RefreshCcw size={16} aria-hidden/> Review supplied values</Button>
    </form>
    {error&&<p role="alert">{error}</p>}
    {assessment&&<div className="registry-boundary" role="status" data-testid="upgrade-assessment">
     <div>
      <p><strong>{assessment.state}</strong> · Matching hash: {assessment.hashMatches?"yes":"no"}</p>
      <p>{assessment.details}</p>
      <p>Execution authorization: {assessment.authorizedToExecute?"granted":"not granted"}.
       Operator signing and independent RPC verification always required.</p>
     </div>
    </div>}
   </section>
   <section aria-label="Next deployment process">
    <h2 className="preview-hub-title">Release process</h2>
    <p>Build reproducibly, inspect contract ABI, compare the uploaded executable hash,
    and have the operator sign locally. The repository's release planner generates no transactions.</p>
    <p><Link href="https://github.com/stealthbridge-labs/stealthbridge-contracts/blob/main/docs/UPGRADABLE-SOROBAN-OPERATIONS.md"
     className="back-link" target="_blank" rel="noopener noreferrer">Read the Testnet deployment and upgrade runbook</Link></p>
   </section>
  </main>
  <footer className="workspace-footer">StealthBridge · Protocol review · Never payment authority</footer>
 </div>;
}
