import Link from "next/link";
import type {Metadata} from "next";
import {ArrowLeft,ArrowUpRight,ShieldCheck,ShieldAlert} from "lucide-react";
import {Brand} from "@/components/brand";
import evidence from "@/lib/governance-release-evidence.v2.json";

export const metadata:Metadata={
 title:"Public Testnet governance infrastructure | StealthBridge",
 description:"Verified historic Stellar Testnet deployments for StealthBridge governance, with public transaction links. Financial execution is not enabled.",
 robots:{index:true,follow:true},
};
const names:Record<string,string>={
 "corridor-registry":"Corridor Registry",
 "policy-registry":"Policy Registry",
 "governance-gate":"Governance Gate",
};
export default function Page(){
 const contracts=Object.entries(evidence.contracts);
 return <div className="workspace-page preview-home">
  <header className="workspace-header">
   <Brand/>
   <span className="network-chip"><i aria-hidden="true"/> Stellar Testnet · Public evidence</span>
   <Link href="/" className="back-link"><ArrowLeft size={16} aria-hidden/> Home</Link>
  </header>
  <main id="main-content" className="workspace-main">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / Public infrastructure</span>
    <h1>Three governance contracts, verified on Testnet.</h1>
    <p>The actual October 17, 2026 release of StealthBridge's Rust/Soroban
      governance infrastructure, with historical code digests and public on-chain
      deployment transactions. These records do not represent enabled private payments.</p>
   </div>
   <div className="registry-boundary"><ShieldAlert size={19} aria-hidden/>
    <p>This page contains a pinned historical deployment record. It does not continuously
    recheck current WASM, administrator changes, contract TTL, token balances or network
    availability. Platform-fee collection, confidential settlement and fiat payouts are disabled.</p>
   </div>
   <section aria-label="Deployed Stellar Testnet governance" className="registry-panel" style={{padding:"1.25rem"}}>
    <div className="registry-panel-heading">
     <ShieldCheck size={22} aria-hidden/>
     <div><h2>Reviewed public deployment receipts</h2>
      <p>Stellar Testnet · deployed {evidence.deployedAt} · {contracts.length} governance contracts</p>
     </div>
    </div>
    <p>Administrator at deployment:
     <code style={{overflowWrap:"anywhere",display:"block"}}>{evidence.administrator}</code>
    </p>
    <div className="preview-link-grid">
     {contracts.map(([key,info])=><article className="preview-link-card" key={info.contractId} style={{overflowWrap:"anywhere"}}>
      <span>Confirmed Testnet release</span>
      <h3>{names[key]??key}</h3>
      <p>Contract ID</p>
      <code>{info.contractId}</code>
      <p>WASM SHA-256 verified at deployment</p>
      <code>{info.wasmSha256}</code>
      <p>Deployment ledger #{info.deploymentLedger.toLocaleString()}</p>
      <a href={"https://stellar.expert/explorer/testnet/tx/"+info.deploymentTx}
       rel="noopener noreferrer" target="_blank" className="back-link">
       Open Testnet transaction <ArrowUpRight size={15} aria-hidden/></a>
     </article>)}
    </div>
   </section>
   <div className="registry-boundary">
    <ShieldCheck size={19} aria-hidden/>
    <p>Governance registry deployment verifies infrastructure progress, not the
    privacy of transfers or regulatory, issuer, payment, bank and settlement readiness.
    StealthBridge is not accepting customer payments or collecting platform fees.</p>
   </div>
  </main>
  <footer className="workspace-footer">StealthBridge · Public deployment record · <Link href="/">Return home</Link></footer>
 </div>;
}
