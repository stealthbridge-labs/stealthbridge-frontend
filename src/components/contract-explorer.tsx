"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {AlertTriangle,ArrowLeft,ArrowRight,BookOpen,CheckCircle2,Code2,Database,ExternalLink,LockKeyhole,RefreshCw,ShieldCheck} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {readBridge,type Capabilities,type ContractDiscovery,type NetworkStatus,type ServiceReadiness} from "@/lib/bridge-api";

type Snapshot={
 contracts:ContractDiscovery|null;
 readiness:ServiceReadiness|null;
 network:NetworkStatus|null;
 capabilities:Capabilities|null;
 error:string|null;
 loading:boolean;
};
const initial:Snapshot={contracts:null,readiness:null,network:null,capabilities:null,error:null,loading:true};
const expectedPassphrase="Test SDF Network ; September 2015";
const titles:Record<string,string>={
 "corridor-registry":"Corridor registry",
 "policy-registry":"Policy registry",
 "governance-gate":"Governance gate"
};
const purpose:Record<string,string>={
 "corridor-registry":"Operator-managed public corridor enablement and emergency pause flags.",
 "policy-registry":"Public policy commitments, revisions and administrative controls.",
 "governance-gate":"Read-only composition of corridor and policy registry flags. Not a transfer verifier."
};
function freshLedger(value:NetworkStatus|null):boolean{
 if(!value||value.passphrase!==expectedPassphrase||value.network!=="testnet")return false;
 const closed=Number(value.ledger_closed_at_unix);
 const age=Math.floor(Date.now()/1000)-closed;
 return Number.isSafeInteger(closed)&&closed>0&&age>=-30&&age<=180;
}
export function ContractExplorer(){
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState<Snapshot>(initial);
 const [selected,setSelected]=useState("corridor-registry");
 const [method,setMethod]=useState<string|null>(null);
 const refresh=useCallback(()=>setRevision(value=>value+1),[]);
 useEffect(()=>{
  const controller=new AbortController();
  setState(previous=>({...previous,loading:true,error:null}));
  async function inspect(){
   // Contract metadata is mandatory; optional network/readiness checks must not
   // turn an honest source-only display into a fictional deployed contract.
   try{
    const contracts=await readBridge<ContractDiscovery>("contracts",controller.signal);
    const [network,readiness,capabilities]=await Promise.allSettled([
     readBridge<NetworkStatus>("network",controller.signal),
     readBridge<ServiceReadiness>("ready",controller.signal),
     readBridge<Capabilities>("capabilities",controller.signal)
    ]);
    if(controller.signal.aborted)return;
    setState({
     contracts,
     network:network.status==="fulfilled"?network.value:null,
     readiness:readiness.status==="fulfilled"?readiness.value:null,
     capabilities:capabilities.status==="fulfilled"?capabilities.value:null,
     loading:false,error:null
    });
   }catch(error){
    if(controller.signal.aborted)return;
    setState({contracts:null,network:null,readiness:null,capabilities:null,loading:false,
     error:error instanceof Error?error.message:"Unable to inspect registry metadata."});
   }
  }
  void inspect();
  return ()=>controller.abort();
 },[revision]);
 const modules=state.contracts?.public_interface.contracts??{};
 const selectedModule=Object.hasOwn(modules,selected)?selected:Object.keys(modules)[0];
 const definition=selectedModule?modules[selectedModule]:null;
 const reads=Object.entries(definition?.reads??{});
 const selectedMethod=method&&definition?.reads[method]?method:reads[0]?.[0];
 const signature=selectedMethod&&definition?.reads[selectedMethod];
 const verified=freshLedger(state.network)&&state.readiness?.status==="ready"
  &&state.readiness.stellar_rpc==="connected";
 const undiscovered=state.contracts?.manifest.status==="not-deployed";
 return <div className="workspace-page registry-shell">
  <header className="workspace-header">
   <Brand/>
   <span className="network-chip"><i/> Stellar Testnet</span>
   <Link className="back-link" href="/preview/corridors">Corridor directory <ArrowRight size={15} aria-hidden/></Link><Link className="back-link" href="/preview/business">Business preview <ArrowRight size={15} aria-hidden/></Link>
   <Link className="back-link" href="/explorer">Transaction explorer <ArrowRight size={15} aria-hidden/></Link>
   <Link className="back-link" href="/"><ArrowLeft size={16} aria-hidden/> Home</Link>
  </header>
  <main id="main-content" className="workspace-main">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / Developer infrastructure</span>
    <h1>Soroban Registry Explorer</h1>
    <p>Inspect the real Rust contract interface served by the StealthBridge backend. Browse supported method signatures and deployment evidence without granting wallet access or submitting transactions.</p>
   </div>
   <div className="registry-status-strip" aria-live="polite">
    <div><span>Source verification</span><strong>{state.loading?"Checking…":state.error?"Unavailable":"ABI matched"}</strong></div>
    <div><span>On-chain deployment</span><strong>{state.loading?"Checking…":undiscovered?"Not deployed":"Not verified"}</strong></div>
    <div><span>Testnet RPC</span><strong>{state.loading?"Checking…":verified?"Fresh":"Not confirmed"}</strong></div>
    <div><span>Payment execution</span><strong>Disabled</strong></div>
   </div>
   <div className="registry-toolbar">
    <p>Source interface is not a deployed contract address. Live Soroban reads require an independently verified Testnet deployment.</p>
    <Button variant="outline" size="sm" type="button" onClick={refresh} disabled={state.loading}>
     <RefreshCw size={16} aria-hidden/> {state.loading?"Checking backend…":"Refresh verification"}
    </Button>
   </div>
   {state.error?<section className="registry-error" role="alert">
    <AlertTriangle size={21} aria-hidden/>
    <div><strong>Unable to verify contract discovery.</strong><p>{state.error} Contract IDs, live calls, signing and payment actions remain unavailable.</p></div>
   </section>:null}
   {!state.error&&state.loading?<p className="state-muted registry-loading" role="status">Loading contract source metadata from the read-only backend…</p>:null}
   {!state.loading&&!state.error&&state.contracts?<div className="registry-grid">
    <section className="registry-panel" aria-label="Soroban contract modules">
     <div className="registry-panel-heading"><BookOpen size={21} aria-hidden/><div><h2>Rust modules</h2><p>Choose a contract to inspect</p></div></div>
     <div className="registry-module-list">
      {Object.keys(modules).map(key=><button key={key} type="button"
       aria-pressed={key===selectedModule} className={"registry-module"+(key===selectedModule?" is-selected":"")}
       onClick={()=>{setSelected(key);setMethod(null);}}>
       <Code2 size={18} aria-hidden/>
       <span><strong>{titles[key]??key}</strong><small>{Object.keys(modules[key].reads).length} public reads · {modules[key].writes.length} admin writes</small></span>
       <ArrowRight size={16} aria-hidden/>
      </button>)}
     </div>
     <div className="registry-security-note"><LockKeyhole size={17} aria-hidden/>
      <p>Browsing methods only. No contract invocation, signature, proof or wallet connection is requested.</p>
     </div>
    </section>
    <section className="registry-panel registry-inspector" aria-label="Contract method inspector">
     <div className="registry-panel-heading"><ShieldCheck size={22} aria-hidden/><div>
      <h2>{titles[selectedModule]??selectedModule}</h2><p>{purpose[selectedModule]??"Public Testnet source interface."}</p></div></div>
     <div className="registry-code-meta">
      <span>Contract status: <strong>Source only</strong></span>
      <a href={"https://github.com/stealthbridge-labs/stealthbridge-contracts/blob/main/"+definition?.source}
       target="_blank" rel="noreferrer">View Rust source <ExternalLink size={14} aria-hidden/></a>
     </div>
     <h3 className="registry-subheading">Public read methods</h3>
     <div className="registry-method-list" aria-label="Read method selector">
      {reads.map(([name])=><button type="button" key={name} aria-pressed={selectedMethod===name}
       className={selectedMethod===name?"is-selected":""} onClick={()=>setMethod(name)}>{name}</button>)}
     </div>
     {signature&&selectedMethod?<div className="registry-signature" aria-live="polite">
      <span>Declared Soroban function</span>
      <code>{selectedMethod}({signature.args.join(", ")}) → {signature.returns}</code>
      <p>The backend confirms this source signature. No deployed contract ID is available, so the method cannot be invoked on Testnet.</p>
     </div>:<p className="state-muted">No public read method declared.</p>}
     <h3 className="registry-subheading">Privileged writes</h3>
     {definition?.writes.length?<div className="registry-admin-list">
      {definition.writes.map(name=><span key={name}>{name} <LockKeyhole size={12} aria-hidden/></span>)}
     </div>:<p className="state-muted">No write functions declared for this contract.</p>}
     <p className="registry-muted">Admin writes are intentionally not exposed through the frontend or backend proxy.</p>
    </section>
    <aside className="registry-panel registry-evidence" aria-label="Backend evidence and next steps">
     <div className="registry-panel-heading"><Database size={21} aria-hidden/><div><h2>Backend evidence</h2><p>Observed, not simulated</p></div></div>
     <dl>
      <div><dt>Network</dt><dd>Stellar Testnet</dd></div>
      <div><dt>Contract manifest</dt><dd>Not deployed</dd></div>
      <div><dt>Ledger sequence</dt><dd>{state.network?.ledger_sequence.toLocaleString()??"Not available"}</dd></div>
      <div><dt>Ledger freshness</dt><dd>{freshLedger(state.network)?"Fresh observation":"Unverified or stale"}</dd></div>
      <div><dt>PostgreSQL readiness</dt><dd>{state.readiness?.database??"Not confirmed"}</dd></div>
      <div><dt>Configured chain addresses</dt><dd>None verified</dd></div>
     </dl>
     <div className="registry-next"><CheckCircle2 size={17} aria-hidden/><div>
      <strong>What becomes available next?</strong>
      <p>After authorized deployment and bytecode, administrator, and constructor-bound address verification, the backend can expose separately reviewed on-chain read operations.</p>
     </div></div>
     <Link className="registry-link" href="/preview/send">Explore the Send workspace <ArrowRight size={15} aria-hidden/></Link>
    </aside>
   </div>:null}
   <div className="registry-boundary"><AlertTriangle size={19} aria-hidden/>
    <p>Governance flags do not prove confidentiality, asset issuance, liquidity, or a bank payout. Signing and transfers remain disabled regardless of backend availability.</p>
   </div>
  </main>
  <footer className="workspace-footer">StealthBridge · Soroban source explorer · No deployed contract interactions or payments</footer>
 </div>;
}
