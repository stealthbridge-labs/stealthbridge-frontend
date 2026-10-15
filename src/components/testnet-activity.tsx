"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {
 Activity,AlertTriangle,ArrowLeft,ArrowUpRight,BookOpen,Clock3,
 Database,ExternalLink,RefreshCw,ShieldCheck
} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {
 readBridge,readObserverActivity,type NetworkStatus,type PublicActivityPage
} from "@/lib/bridge-api";

const PAGE_SIZE=10;
const PASSPHRASE="Test SDF Network ; September 2015";
function shortId(value:string){return value.slice(0,9)+"…"+value.slice(-7);}
function utcTime(raw:string){
 const seconds=Number(raw);
 if(!Number.isSafeInteger(seconds)||seconds<=0)return "Unknown observation time";
 const date=new Date(seconds*1000);
 if(!Number.isFinite(date.valueOf()))return "Unknown observation time";
 return date.toLocaleString("en-GB",{timeZone:"UTC",day:"2-digit",month:"short",
  year:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"});
}
function verifiedFreshNetwork(value:NetworkStatus|null){
 if(!value||value.passphrase!==PASSPHRASE)return false;
 const close=Number(value.ledger_closed_at_unix);
 const age=Math.floor(Date.now()/1000)-close;
 return Number.isSafeInteger(close)&&close>0&&age>=-30&&age<=180;
}
export function TestnetActivity(){
 const [revision,setRevision]=useState(0);
 const [selected,setSelected]=useState("");
 const [page,setPage]=useState<PublicActivityPage|null>(null);
 const [network,setNetwork]=useState<NetworkStatus|null>(null);
 const [loading,setLoading]=useState(true);
 const [moreLoading,setMoreLoading]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>{
  const request=new AbortController();
  controller.current=request;
  setLoading(true);setMoreLoading(false);setError(null);setPage(null);setNetwork(null);
  Promise.allSettled([
   readObserverActivity({limit:PAGE_SIZE,...selected?{contractId:selected}:{}},request.signal),
   readBridge<NetworkStatus>("network",request.signal)
  ]).then(([activity,status])=>{
   if(request.signal.aborted)return;
   if(status.status==="fulfilled")setNetwork(status.value);
   if(activity.status==="fulfilled")setPage(activity.value);
   else setError(activity.reason instanceof Error?activity.reason.message:
       "Unable to inspect stored public Testnet activity.");
   setLoading(false);
  });
  return ()=>request.abort();
 },[revision,selected]);
 async function nextPage(){
  const current=page;
  if(!current?.next_cursor||moreLoading||loading)return;
  const request=controller.current;
  if(!request||request.signal.aborted)return;
  const cursor=current.next_cursor;
  setMoreLoading(true);setError(null);
  try{
   const next=await readObserverActivity({
    limit:PAGE_SIZE,before:cursor,...selected?{contractId:selected}:{}
   },request.signal);
   if(request.signal.aborted)return;
   setPage(previous=>{
    if(!previous||previous.next_cursor!==cursor)return previous;
    // A newer observation may have arrived while paging. Never silently
    // duplicate or reorder historical identifiers across adjacent pages.
    const seen=new Set(previous.items.map(item=>item.id+"."+item.contract_id));
    if(next.items.some(item=>seen.has(item.id+"."+item.contract_id)))return previous;
    return {...next,items:[...previous.items,...next.items]};
   });
  }catch(failure){
   if(!request.signal.aborted)setError(
    failure instanceof Error?failure.message:"Unable to load the next public activity page.");
  }finally{
   if(!request.signal.aborted)setMoreLoading(false);
  }
 }
 const active=page?.observation_status==="checkpoint-present";
 const networkFresh=verifiedFreshNetwork(network);
 return <div className="workspace-page activity-shell">
  <header className="workspace-header">
   <Brand/><span className="network-chip"><i/> Stellar Testnet</span>
   <Link className="back-link" href="/preview"><ArrowLeft size={16} aria-hidden/> Workspace hub</Link>
   <Link className="back-link" href="/preview/contracts"><BookOpen size={16} aria-hidden/> Soroban source</Link>
   <Link className="back-link" href="/explorer"><ArrowUpRight size={16} aria-hidden/> Transaction lookup</Link>
  </header>
  <main id="main-content" className="workspace-main">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / Network observability</span>
    <h1>Testnet Activity</h1>
    <p>Follow real public event identifiers retained by our PostgreSQL observer. See what is actually recorded, where the ledger checkpoint stopped, and what still requires independent verification.</p>
   </div>
   <div className="registry-status-strip" aria-live="polite">
    <div><span>Public RPC observation</span><strong>{loading?"Checking…":networkFresh?"Fresh Testnet":"Not confirmed"}</strong></div>
    <div><span>Observer checkpoint</span><strong>{loading?"Checking…":active?"Recorded":page?"Not configured":"Unavailable"}</strong></div>
    <div><span>Observed contracts</span><strong>{loading?"Checking…":page?String(page.contracts.length):"Unavailable"}</strong></div>
    <div><span>Financial execution</span><strong>Disabled</strong></div>
   </div>
   <section className="activity-toolbar" aria-label="Public activity controls">
    <div>
     <h2>Public contract events</h2>
     <p>Stored event IDs only. Historical journal entries are not proof of successful private transfers.</p>
    </div>
    <div className="activity-actions">
     <label htmlFor="activity-contract-filter">Observed contract</label>
     <select id="activity-contract-filter" value={selected} disabled={loading&&!page}
       onChange={e=>setSelected(e.target.value)}>
      <option value="">All observed contracts</option>
      {page?.contracts.map(item=><option key={item.contract_id} value={item.contract_id}>
       {shortId(item.contract_id)}
      </option>)}
      {selected&&!page?.contracts.some(item=>item.contract_id===selected)&&
        <option value={selected}>{shortId(selected)}</option>}
     </select>
     <Button variant="outline" size="sm" onClick={()=>setRevision(n=>n+1)} disabled={loading}>
      <RefreshCw size={16} aria-hidden/> Refresh
     </Button>
    </div>
   </section>
   {error&&<div className="activity-alert" role="alert">
    <AlertTriangle size={18} aria-hidden/>
    <p>{error} No events have been fabricated. Check the Preview API and staging PostgreSQL.</p>
   </div>}
   <div className="activity-layout">
    <section className="activity-feed" aria-label="Public Testnet event timeline" aria-busy={loading||moreLoading}>
     {loading&&<div className="activity-empty" role="status"><Clock3 size={24} aria-hidden/>
      <h3>Reading the public observer journal…</h3>
      <p>Only the configured Testnet database and API are queried.</p>
     </div>}
     {!loading&&page?.observation_status==="no-checkpoint"&&<div className="activity-empty" role="status">
      <Database size={26} aria-hidden/><h3>No observer checkpoint configured</h3>
      <p>This is an honest empty state. No StealthBridge contract deployment or private transfer is implied.</p>
      <Link href="/preview/contracts" className="text-link">Inspect Soroban source interfaces <ArrowUpRight size={15} aria-hidden/></Link>
     </div>}
     {!loading&&page?.observation_status==="checkpoint-present"&&page.items.length===0&&
      <div className="activity-empty" role="status">
       <Activity size={26} aria-hidden/><h3>No public events in this selection</h3>
       <p>{selected?"This contract has no retained public event entries.":"A checkpoint exists, but the journal currently has no retained public events."}</p>
      </div>}
     {!loading&&page&&page.items.length>0&&<>
      <div className="activity-feed-label"><span>{page.items.length} stored event{page.items.length===1?"":"s"} loaded</span>
       <span>Latest first · Testnet</span></div>
      <ol className="activity-list">
       {page.items.map(event=><li key={event.id+"."+event.contract_id} className="activity-entry">
        <div className="activity-marker"><span aria-hidden="true"/></div>
        <article>
         <div className="activity-entry-top">
          <span className="activity-tag">Public event metadata</span>
          <span>Ledger #{event.ledger_sequence.toLocaleString()}</span>
         </div>
         <h3>Contract event <code>{event.id}</code></h3>
         <dl>
          <div><dt>Contract</dt><dd><code title={event.contract_id}>{event.contract_id}</code></dd></div>
          <div><dt>Transaction hash</dt><dd><code title={event.tx_hash}>{event.tx_hash}</code></dd></div>
          <div><dt>Stored at</dt><dd>{utcTime(event.observed_at_unix)}</dd></div>
         </dl>
         <a className="text-link" target="_blank" rel="noopener noreferrer"
          href={"https://stellar.expert/explorer/testnet/tx/"+event.tx_hash}>
          Inspect public Testnet transaction <ExternalLink size={14} aria-hidden/>
         </a>
        </article>
       </li>)}
      </ol>
      {page.next_cursor&&<div className="activity-pagination">
       <Button variant="outline" disabled={moreLoading} onClick={()=>void nextPage()}>
        {moreLoading?"Loading older events…":"Load older public events"} <ArrowUpRight size={16} aria-hidden/>
       </Button>
      </div>}
     </>}
     {!loading&&!page&&!error&&<div role="status" className="activity-empty">
      <AlertTriangle size={25} aria-hidden/><h3>Activity not available</h3>
      <p>Only reviewed public Testnet journal records are displayed.</p>
     </div>}
    </section>
    <aside className="activity-aside" aria-label="Observation and privacy boundaries">
     <div className="activity-aside-head"><ShieldCheck size={21} aria-hidden/>
      <h2>What this can prove</h2>
      <p>Public journal data gives visibility into identifiers and the observer’s historical checkpoint. It is not a cryptographic proof.</p>
     </div>
     <div className="activity-explainer">
      <div><strong>Public identifiers</strong><p>Contract, event and transaction IDs are stored without raw XDR, memo, amounts or private witness material.</p></div>
      <div><strong>Historical observation</strong><p>A checkpoint may be stale. Compare its recorded time to the live Testnet ledger before relying on its freshness.</p></div>
      <div><strong>Unverified privacy</strong><p>No verified confidential transfers, fiat payouts, protocol signatures or deployed StealthBridge payment rails are implied.</p></div>
     </div>
     {!!page?.contracts.length&&<div className="activity-contracts">
      <h3>Recorded checkpoints</h3>
      {page.contracts.map(contract=><div key={contract.contract_id}>
       <code>{contract.contract_id}</code>
       <span>Next resume ledger: {contract.next_start_ledger.toLocaleString()}</span>
       <span>Last stored: {utcTime(contract.observed_at_unix)}</span>
      </div>)}
     </div>}
    </aside>
   </div>
  </main>
  <footer className="workspace-footer">StealthBridge · Public Stellar Testnet metadata · No signing, private witness or payment execution</footer>
 </div>;
}
