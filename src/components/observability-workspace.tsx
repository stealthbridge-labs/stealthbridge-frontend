"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Activity,ArrowLeft,BookOpen,Copy,Database,LockKeyhole,RefreshCw,Radio,ShieldAlert} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {ApiUnavailable,readBridge} from "@/lib/bridge-api";
import type {Capabilities,ContractDiscovery,NetworkStatus,ObservedLedgerCheckpoint,ServiceReadiness} from "@/lib/bridge-api";
import {assessPublicObservations,appendPublicEvidence,publicEvidenceReceipt} from "@/lib/observation-health";
import type {PublicEvidenceRecord} from "@/lib/observation-health";

/** A failed dependency remains missing; the UI never fills with demo balances or simulated ledgers. */
type Result<T>={state:"available";value:T}|{state:"unavailable";reason:string};
type Snapshot={
 network:Result<NetworkStatus>;observer:Result<ObservedLedgerCheckpoint>;
 ready:Result<ServiceReadiness>;capabilities:Result<Capabilities>;
 contracts:Result<ContractDiscovery>;checkedAt:number;
};
type ViewState={loading:boolean;snapshot:Snapshot|null};
const unavailable=<T,>(reason:string):Result<T>=>({state:"unavailable",reason});
function outcome<T>(settled:PromiseSettledResult<T>):Result<T>{
 if(settled.status==="fulfilled")return {state:"available",value:settled.value};
 const e=settled.reason;
 if(e instanceof ApiUnavailable){
  const reason=e.status===404?"No persisted observation":e.status===503?
   "Dependency unavailable":e.status===429?"Read limit reached":"Read failed (HTTP "+e.status+")";
  return unavailable(reason);
 }
 return unavailable("Could not validate this Testnet response");
}
function textValue<T>(value:Result<T>,format:(v:T)=>string):string{
 return value.state==="available"?format(value.value):value.reason;
}
function when(timestamp:string):string{
 const value=Number(timestamp);
 if(!Number.isSafeInteger(value)||value<=0)return "Unverified timestamp";
 return new Date(value*1000).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"medium"});
}
function healthOf(s:Snapshot){
 const read=<T,>(result:Result<T>):T|null=>result.state==="available"?result.value:null;
 return assessPublicObservations({
  checkedAtUnix:s.checkedAt,
  network:read(s.network),
  observer:read(s.observer),
  readiness:read(s.ready),
  capabilities:read(s.capabilities),
  contracts:read(s.contracts),
 });
}
const comparisonText={
 aligned:"Ledger hashes agree",
 lagging:"Observer behind RPC",
 stale:"Stale observation",
 ahead:"Observer ahead of live RPC",
 conflict:"Ledger hash disagreement",
 unavailable:"Not independently verified",
} as const;

export function ObservabilityWorkspace(){
 const [revision,setRevision]=useState(0);
 const [view,setView]=useState<ViewState>({loading:true,snapshot:null});
 const [history,setHistory]=useState<PublicEvidenceRecord[]>([]);
 const [autoRefresh,setAutoRefresh]=useState(false);
 const [copyStatus,setCopyStatus]=useState("");
 useEffect(()=>{
  const abort=new AbortController();
  setView({loading:true,snapshot:null});
  void Promise.allSettled([
   readBridge<NetworkStatus>("network",abort.signal),
   readBridge<ObservedLedgerCheckpoint>("observer",abort.signal),
   readBridge<ServiceReadiness>("ready",abort.signal),
   readBridge<Capabilities>("capabilities",abort.signal),
   readBridge<ContractDiscovery>("contracts",abort.signal)
  ] as const).then(([network,observer,ready,capabilities,contracts])=>{
   if(abort.signal.aborted)return;
   const checkedAt=Math.floor(Date.now()/1000);
   const snapshot:Snapshot={
    network:outcome(network),observer:outcome(observer),ready:outcome(ready),
    capabilities:outcome(capabilities),contracts:outcome(contracts),
    checkedAt,
   };
   setView({loading:false,snapshot});
   setHistory(previous=>appendPublicEvidence(previous,healthOf(snapshot)));
   setCopyStatus("");
  });
  return ()=>abort.abort();
 },[revision]);
 useEffect(()=>{
  if(!autoRefresh)return;
  // Opt-in only; do not poll hidden tabs or keep timers after navigation.
  const id=window.setInterval(()=>{
   if(document.visibilityState==="visible")setRevision(value=>value+1);
  },30_000);
  return ()=>window.clearInterval(id);
 },[autoRefresh]);

 const s=view.snapshot;
 const live=s?.network.state==="available"?s.network.value:null;
 const last=s?.observer.state==="available"?s.observer.value:null;
 const health=s?healthOf(s):null;
 const ledgerFresh=health?.liveFresh??false;
 const inSync=health?.observerComparison==="aligned";
 const hasConflict=health?.observerComparison==="ahead"||
  health?.observerComparison==="conflict";
 const dbReady=s?.ready.state==="available"&&s.ready.value.database==="connected";
 const capabilitiesConfirmed=s?.capabilities.state==="available"&&
  Object.values(s.capabilities.value).every(value=>value===false);
 const contractsSourceOnly=s?.contracts.state==="available"&&
  s.contracts.value.manifest.status==="not-deployed"&&
  s.contracts.value.on_chain_verified===false;
 const status=(value:boolean,waiting="Unavailable")=>view.loading?"Checking…":value?"Verified observation":waiting;

 return <div className="workspace-page observability-page">
  <header className="workspace-header">
   <Brand/>
   <span className="network-chip"><i aria-hidden="true"/> Stellar Testnet · Read only</span>
   <Link href="/preview" className="back-link"><ArrowLeft size={17} aria-hidden="true"/> Workspace</Link>
  </header>
  <main className="workspace-main" id="main-content">
   <div className="observability-intro">
    <div>
     <span className="section-index">StealthBridge / Observability</span>
     <h1>Know what is real.</h1>
     <p>Five independently validated read-only API observations. A green ledger does not prove Soroban deployment, confidentiality or fiat settlement.</p>
    </div>
    <Button variant="outline" size="sm" disabled={view.loading}
     onClick={()=>setRevision(i=>i+1)}><RefreshCw size={16} aria-hidden="true"/>
     Refresh observations</Button>
   </div>
   <p role="status" aria-live="polite" className="observability-summary">
    {view.loading?"Checking backend dependencies and Stellar Testnet…":
     hasConflict?"Public RPC and saved observer disagree. No financial execution is permitted.":
     health?.verdict==="unsupported-claim"?"Unsafe financial or deployment claim detected. No financial execution is permitted.":
     ledgerFresh&&dbReady?"Live Testnet and database dependency checks passed. Financial execution is disabled.":
     "One or more dependencies are unverified, stale or unavailable. No financial execution is permitted."}
   </p>
   <section aria-label="Testnet observation status" className="observability-grid">
    <article className="observability-tile">
     <Radio size={22} aria-hidden="true"/>
     <h2>Live Stellar RPC</h2>
     <strong data-testid="live-rpc-state">{status(Boolean(ledgerFresh),"Stale or unavailable")}</strong>
     <p>{s?textValue(s.network,n=>"#"+n.ledger_sequence.toLocaleString()+" · "+n.network):"Awaiting RPC response"}</p>
     {live&&<small>Ledger closed: {when(live.ledger_closed_at_unix)}</small>}
    </article>
    <article className="observability-tile">
     <Activity size={22} aria-hidden="true"/>
     <h2>Observer checkpoint</h2>
     <strong data-testid="observer-state">{view.loading?"Checking…":hasConflict?"Disagreement detected":
      status(Boolean(inSync),"Not current or missing")}</strong>
     <p>{s?textValue(s.observer,o=>"Stored #"+o.ledger_sequence.toLocaleString()):"Awaiting database response"}</p>
     {last&&<small>Last persisted close: {when(last.ledger_closed_at_unix)}</small>}
     {health&&<small data-testid="observer-integrity">{comparisonText[health.observerComparison]}
      {health.ledgerGap!==null&&health.ledgerGap>0?` · ${health.ledgerGap.toLocaleString()} ledgers behind`:""}</small>}
    </article>
    <article className="observability-tile">
     <Database size={22} aria-hidden="true"/>
     <h2>PostgreSQL readiness</h2>
     <strong data-testid="database-state">{status(Boolean(dbReady),"Unavailable or not configured")}</strong>
     <p>{s?textValue(s.ready,r=>"Database: "+r.database):"Awaiting readiness response"}</p>
     <small>No private account or transfer data is displayed.</small>
    </article>
    <article className="observability-tile">
     <BookOpen size={22} aria-hidden="true"/>
     <h2>Soroban registry</h2>
     <strong data-testid="contracts-state">{view.loading?"Checking…":contractsSourceOnly?"Source interface only":"Unknown"}</strong>
     <p>{s?textValue(s.contracts,c=>"Status: "+c.manifest.status):"Awaiting interface response"}</p>
     <small>Verified deployment required before on-chain actions.</small>
    </article>
   </section>
   <section className="observability-details" aria-label="Integration release boundaries">
    <div>
     <ShieldAlert size={22} aria-hidden="true"/>
     <h2>Capability boundaries</h2>
     <p>Confidential transfers, private payment proofs, licensed fiat payouts and signing are not enabled by these observations.</p>
    </div>
    <div className="observability-gates">
     <div><span>API capability flags</span><strong>{view.loading?"Checking…":capabilitiesConfirmed?"All financial flags disabled":"Unavailable — fail closed"}</strong></div>
     <div><span>Contract addresses</span><strong>{view.loading?"Checking…":contractsSourceOnly?"No verified deployment":"Not established"}</strong></div>
     <div><span>RPC vs saved observer</span><strong>{view.loading?"Checking…":inSync?"Both observations current":"Independently unverified"}</strong></div>
     <div><span>Payment execution</span><strong>Disabled</strong></div>
    </div>
   </section>
   <section className="observability-history" aria-label="Session observation evidence">
    <div className="observability-history-head">
     <div>
      <span className="section-index">Testnet / Public evidence</span>
      <h2>Observation timeline</h2>
      <p>Last {history.length} actual read attempts in this tab. No wallet, transaction payload or personal information is saved.</p>
     </div>
     <div className="observability-history-actions">
      <label className="observability-auto">
       <input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)}/>
       Auto-recheck every 30s
      </label>
      <Button variant="outline" size="sm" disabled={view.loading||history.length===0}
       onClick={()=>{
        const summary=publicEvidenceReceipt(history,Math.floor(Date.now()/1000));
        if(!navigator.clipboard?.writeText){
         setCopyStatus("Clipboard unavailable. Check browser permissions.");
         return;
        }
        void navigator.clipboard.writeText(JSON.stringify(summary,null,2))
         .then(()=>setCopyStatus("Public evidence copied. No wallet or private data included."))
         .catch(()=>setCopyStatus("Clipboard unavailable. Check browser permissions."));
       }}><Copy size={15} aria-hidden="true"/> Copy public evidence</Button>
     </div>
    </div>
    <p className="observability-copy-status" role="status" aria-live="polite">{copyStatus}</p>
    {history.length===0?
     <p className="observability-history-empty">Awaiting the first backend reading. Missing observations are never synthesized.</p>:
     <div className="observability-history-scroll">
      <table className="observability-history-table" data-testid="observation-timeline">
       <caption>Public Testnet readings from this browser session; newest first</caption>
       <thead><tr><th scope="col">Checked</th><th scope="col">Live ledger</th><th scope="col">Observer</th><th scope="col">Gap</th><th scope="col">Integrity</th></tr></thead>
       <tbody>{[...history].reverse().map(entry=><tr key={entry.checkedAtUnix}>
        <th scope="row">{new Date(entry.checkedAtUnix*1000).toLocaleTimeString()}</th>
        <td>{entry.liveLedger?.toLocaleString()??"Unavailable"}</td>
        <td>{entry.observerLedger?.toLocaleString()??"Unavailable"}</td>
        <td>{entry.ledgerGap===null?"Unknown":entry.ledgerGap.toLocaleString()}</td>
        <td><span className={entry.verdict==="inconsistent"||entry.verdict==="unsupported-claim"?
         "observability-warning":"observability-observed"}>{comparisonText[entry.observerComparison]}</span></td>
       </tr>)}</tbody>
      </table>
     </div>}
    <p className="observability-disclaimer">A green reading is only public ledger metadata agreement, never proof of Soroban deployment, confidentiality, fiat settlement or permission to transact. History is temporary and clears when you leave this tab.</p>
   </section>
   {s&&<p className="observability-disclaimer">Last checked {when(String(s.checkedAt))}. Refresh for a new reading. Stored observer state can lag RPC; a successful response does not demonstrate a private transfer or a bank payout.</p>}
   <div className="observability-navigation">
    <Link href="/preview/contracts">Review Soroban source interfaces</Link>
    <Link href="/preview/corridors">Inspect configured corridors</Link>
    <Link href="/explorer">Look up a Testnet transaction</Link>
   </div>
  </main>
  <footer className="workspace-footer">StealthBridge · Public Testnet metadata only · No signing or transfers</footer>
 </div>;
}
