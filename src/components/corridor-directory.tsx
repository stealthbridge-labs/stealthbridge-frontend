"use client";
import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {AlertTriangle,ArrowLeft,ArrowRight,Database,Filter,Globe2,RefreshCw,ShieldCheck} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {readFilteredCorridorPage,type Corridor,type CorridorFilters,type PrivacyRail} from "@/lib/bridge-api";

type DirectoryState={
 rows:Corridor[];cursor:string|null;loading:boolean;moreLoading:boolean;
 error:string|null;pageError:string|null;
};
const empty:DirectoryState={rows:[],cursor:null,loading:true,moreLoading:false,error:null,pageError:null};
const formatError=(e:unknown)=>e instanceof Error?e.message:"The corridor catalog is unavailable.";
export function CorridorDirectory(){
 const [origin,setOrigin]=useState("");
 const [destination,setDestination]=useState("");
 const [rail,setRail]=useState("");
 const [filters,setFilters]=useState<CorridorFilters>({});
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState<DirectoryState>(empty);
 const [validation,setValidation]=useState<string|null>(null);
 const moreController=useRef<AbortController|null>(null);
 const refresh=useCallback(()=>{moreController.current?.abort();setRevision(n=>n+1);},[]);
 useEffect(()=>{
  const controller=new AbortController();
  moreController.current?.abort();
  setState({...empty});
  readFilteredCorridorPage(filters,undefined,controller.signal)
   .then(page=>{
    if(!controller.signal.aborted)setState({rows:page.items,cursor:page.next_cursor,loading:false,moreLoading:false,error:null,pageError:null});
   })
   .catch(error=>{
    if(!controller.signal.aborted)setState({rows:[],cursor:null,loading:false,moreLoading:false,error:formatError(error),pageError:null});
   });
  return ()=>{controller.abort();moreController.current?.abort();};
 },[filters,revision]);
 function apply(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const a=origin.trim().toUpperCase(),b=destination.trim().toUpperCase();
  if((a&&!/^[A-Z]{2}$/.test(a))||(b&&!/^[A-Z]{2}$/.test(b))){
   setValidation("Use two-letter country codes, such as NG or GH.");return;
  }
  if(rail!==""&&rail!=="confidential-token"&&rail!=="private-payments"){
   setValidation("Select a supported privacy rail.");return;
  }
  setValidation(null);
  setOrigin(a);setDestination(b);
  setFilters({...(a?{originCountry:a}:{}),...(b?{destinationCountry:b}:{}),
   ...(rail?{privacyRail:rail as PrivacyRail}:{})});
 }
 function clear(){
  setOrigin("");setDestination("");setRail("");setValidation(null);setFilters({});
  setRevision(n=>n+1);
 }
 async function loadMore(){
  if(!state.cursor||state.loading||state.moreLoading)return;
  moreController.current?.abort();
  const controller=new AbortController();
  moreController.current=controller;
  setState(previous=>({...previous,moreLoading:true,pageError:null}));
  try{
   const page=await readFilteredCorridorPage(filters,state.cursor,controller.signal);
   if(controller.signal.aborted)return;
   setState(previous=>({...previous,rows:[...previous.rows,...page.items],cursor:page.next_cursor,moreLoading:false}));
  }catch(error){
   if(!controller.signal.aborted)setState(previous=>({...previous,moreLoading:false,pageError:formatError(error)}));
  }
 }
 const active=[filters.originCountry,filters.destinationCountry,filters.privacyRail].filter(Boolean);
 return <div className="workspace-page corridor-shell">
  <header className="workspace-header"><Brand/><span className="network-chip"><i/> Stellar Testnet</span>
   <Link href="/preview" className="back-link">Workspace hub <ArrowRight size={15} aria-hidden/></Link><Link href="/preview/business" className="back-link">Business <ArrowRight size={15} aria-hidden/></Link>
   <Link href="/preview/contracts" className="back-link">Soroban registry <ArrowRight size={15} aria-hidden/></Link>
   <Link href="/" className="back-link"><ArrowLeft size={16} aria-hidden/> Home</Link>
  </header>
  <main id="main-content" className="workspace-main">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / Network catalog</span>
    <h1>Corridor Directory</h1>
    <p>Search real operator-configured corridor records from PostgreSQL. All filtering and pagination happens through the protected, read-only Rust API. Nothing is prefilled or priced.</p>
   </div>
   <div className="corridor-directory">
    <section className="registry-panel corridor-query" aria-label="Corridor directory filters">
     <div className="registry-panel-heading"><Filter size={21} aria-hidden/><div><h2>Filter the catalog</h2><p>Server-side metadata search</p></div></div>
     <form onSubmit={apply}>
      <label htmlFor="origin-code">Origin country (optional)</label>
      <input id="origin-code" name="origin" value={origin} onChange={e=>setOrigin(e.target.value.toUpperCase())}
       placeholder="NG" maxLength={2} autoCapitalize="characters" autoComplete="off" spellCheck={false}/>
      <label htmlFor="destination-code">Destination country (optional)</label>
      <input id="destination-code" name="destination" value={destination} onChange={e=>setDestination(e.target.value.toUpperCase())}
       placeholder="GH" maxLength={2} autoCapitalize="characters" autoComplete="off" spellCheck={false}/>
      <label htmlFor="rail-code">Privacy research rail</label>
      <select id="rail-code" value={rail} onChange={e=>setRail(e.target.value)}>
       <option value="">All declared rails</option>
       <option value="confidential-token">Confidential Tokens</option>
       <option value="private-payments">Private Payments</option>
      </select>
      {validation&&<p role="alert" className="state-error">{validation}</p>}
      <div className="corridor-query-actions">
       <Button type="submit" disabled={state.loading}>Apply filters <ArrowRight size={15} aria-hidden/></Button>
       <Button type="button" variant="outline" onClick={clear} disabled={state.loading}>Clear</Button>
      </div>
     </form>
     <div className="registry-security-note"><ShieldCheck size={17} aria-hidden/>
      <p>A corridor row does not verify an actual bank, issued asset, privacy rail, liquidity, or legal eligibility. Money movement is unavailable.</p>
     </div>
    </section>
    <section className="registry-panel corridor-results" aria-label="Filtered corridor results">
     <div className="registry-panel-heading"><Globe2 size={21} aria-hidden/><div><h2>Enabled corridor records</h2><p>Exact backend query · Maximum 25 records per page</p></div></div>
     <div className="corridor-results-top">
      <span role="status">{state.loading?"Querying PostgreSQL…":state.error?"Query unavailable":`${state.rows.length} real records loaded`}</span>
      <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={state.loading||state.moreLoading}>
       <RefreshCw size={15} aria-hidden/> Refresh records
      </Button>
     </div>
     {active.length>0&&<div className="corridor-applied" aria-label="Applied server filters">{active.map(value=><span key={value}>{value}</span>)}</div>}
     {state.error&&<p className="state-error corridor-result-error" role="alert"><AlertTriangle size={17} aria-hidden/> {state.error} No synthetic results were substituted.</p>}
     {state.loading&&<p className="state-muted" role="status">Loading actual enabled corridor records…</p>}
     {!state.loading&&!state.error&&(state.rows.length===0?
      <div className="corridor-empty"><Database size={28} aria-hidden/><h3>No enabled corridors match</h3><p>The database returned an empty page. Operators must independently verify and activate real configurations before they appear here.</p></div>:
      <div className="corridor-result-list">
       {state.rows.map(record=><article className="corridor-result" key={record.id}>
        <div><span className="section-index">Public configuration only</span>
         <h3>{record.origin_country} <span>→</span> {record.destination_country}</h3>
         <p>Asset: <strong>{record.asset_code}</strong> · Declared rail: {record.privacy_rail}</p>
         {record.asset_issuer?<p>Public issuer: <code>{record.asset_issuer}</code></p>:<p>Issuer not configured</p>}
        </div>
        <span className="corridor-record-id">ID: {record.id}</span>
       </article>)}
      </div>)}
     {state.pageError&&<p className="state-error" role="alert">{state.pageError} Existing rows remain visible.</p>}
     {state.cursor&&!state.error&&<Button type="button" variant="outline" onClick={()=>void loadMore()} disabled={state.moreLoading} className="corridor-more">
      {state.moreLoading?"Loading more records…":"Load next page"} <ArrowRight size={15} aria-hidden/>
     </Button>}
    </section>
   </div>
   <div className="registry-boundary"><AlertTriangle size={19} aria-hidden/>
    <p>These are operator-controlled database rows, not settlement quotations. The API supports GET catalog queries only; authenticated wallet sessions, on-chain governance verification, and fund-moving actions remain unavailable.</p>
   </div>
  </main>
  <footer className="workspace-footer">StealthBridge · Filtered Testnet configuration catalog · No payouts enabled</footer>
 </div>;
}
