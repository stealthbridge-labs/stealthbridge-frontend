"use client";

import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {ArrowRight,Check,Clock3,Globe2,LockKeyhole,RefreshCw,Search,ShieldCheck} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
 loadCustomerCorridors,validCustomerCorridorFilters,
 type CustomerCorridor,type CustomerCorridorFilters
} from "@/lib/customer-corridors";

type ResultState={
 status:"loading"|"ready"|"error";
 rows:CustomerCorridor[];
 next:string|null;
 paging:boolean;
 error:string|null;
 pageError:string|null;
 checkedAt:string|null;
};
const initial:ResultState={
 status:"loading",rows:[],next:null,paging:false,error:null,pageError:null,checkedAt:null
};
const countryCode=(value:string)=>value.trim().toUpperCase();
const railLabel=(rail:CustomerCorridor["privacy_rail"])=>
 rail==="private-payments"?"Private payments (research)":"Confidential tokens (research)";
const formattedTime=()=>new Date().toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
function urlFilters():CustomerCorridorFilters|null{
 const params=new URLSearchParams(window.location.search);
 const keys=["origin_country","destination_country","privacy_rail"];
 if([...params.keys()].some(key=>!keys.includes(key)||params.getAll(key).length!==1))return null;
 const filter=Object.fromEntries(keys.filter(key=>params.has(key)).map(key=>[key,params.get(key)]));
 return validCustomerCorridorFilters(filter)?filter:null;
}
export function CustomerRouteExplorer(){
 const [origin,setOrigin]=useState("");
 const [destination,setDestination]=useState("");
 const [rail,setRail]=useState("");
 const [filters,setFilters]=useState<CustomerCorridorFilters>({});
 const [hydrated,setHydrated]=useState(false);
 const [revision,setRevision]=useState(0);
 const [validation,setValidation]=useState<string|null>(null);
 const [state,setState]=useState<ResultState>(initial);
 const pageRequest=useRef<AbortController|null>(null);
 useEffect(()=>{
  const parsed=urlFilters();
  if(parsed){
   setOrigin(parsed.origin_country??"");
   setDestination(parsed.destination_country??"");
   setRail(parsed.privacy_rail??"");
   setFilters(parsed);
  }else{
   setValidation("The link included unsupported filters. The full catalog is shown instead.");
  }
  setHydrated(true);
 },[]);
 useEffect(()=>{
  if(!hydrated)return;
  pageRequest.current?.abort();
  const controller=new AbortController();
  setState(initial);
  void loadCustomerCorridors(controller.signal,undefined,filters)
   .then(page=>{
    if(!controller.signal.aborted)setState({
     status:"ready",rows:page.items,next:page.next_cursor,paging:false,error:null,
     pageError:null,checkedAt:formattedTime()
    });
   })
   .catch(()=>{
    if(!controller.signal.aborted)setState({
     status:"error",rows:[],next:null,paging:false,error:"We couldn't reach the live corridor catalog.",
     pageError:null,checkedAt:null
    });
   });
  return ()=>{controller.abort();pageRequest.current?.abort();};
 },[filters,hydrated,revision]);
 const refresh=useCallback(()=>{
  pageRequest.current?.abort();
  setRevision(current=>current+1);
 },[]);
 const apply=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const next:CustomerCorridorFilters={
   ...(origin.trim()?{origin_country:countryCode(origin)}:{}),
   ...(destination.trim()?{destination_country:countryCode(destination)}:{}),
   ...(rail?{privacy_rail:rail as CustomerCorridorFilters["privacy_rail"]}:{})
  };
  if(!validCustomerCorridorFilters(next)){
   setValidation("Enter two-letter country codes and select a supported research rail.");
   return;
  }
  setValidation(null);
  setOrigin(next.origin_country??"");
  setDestination(next.destination_country??"");
  pageRequest.current?.abort();
  const params=new URLSearchParams();
  if(next.origin_country)params.set("origin_country",next.origin_country);
  if(next.destination_country)params.set("destination_country",next.destination_country);
  if(next.privacy_rail)params.set("privacy_rail",next.privacy_rail);
  const suffix=params.toString();
  window.history.replaceState(window.history.state,"",window.location.pathname+(suffix?"?"+suffix:""));
  setFilters(next);
  setRevision(current=>current+1);
 };
 const reset=()=>{
  setOrigin("");setDestination("");setRail("");
  setValidation(null);pageRequest.current?.abort();
  window.history.replaceState(window.history.state,"",window.location.pathname);
  setFilters({});
  setRevision(current=>current+1);
 };
 const nextPage=async()=>{
  if(!state.next||state.paging||state.status!=="ready")return;
  const cursor=state.next;
  pageRequest.current?.abort();
  const controller=new AbortController();
  pageRequest.current=controller;
  setState(previous=>({...previous,paging:true,pageError:null}));
  try{
   const page=await loadCustomerCorridors(controller.signal,cursor,filters);
   if(controller.signal.aborted)return;
   setState(previous=>{
    const existing=new Set(previous.rows.map(row=>row.id.toLowerCase()));
    // A backend pagination inconsistency must never silently duplicate a
    // route or lead users to believe all records were searched.
    if(page.items.some(item=>existing.has(item.id.toLowerCase()))||
      page.next_cursor===cursor||page.items.length===0&&page.next_cursor!==null)
     return {...previous,paging:false,next:null,
      pageError:"The catalog changed while browsing. Refresh to verify the results."};
    return {...previous,rows:[...previous.rows,...page.items],next:page.next_cursor,
     paging:false,pageError:null,checkedAt:formattedTime()};
   });
  }catch{
   if(!controller.signal.aborted)setState(previous=>({...previous,paging:false,
    pageError:"The next page couldn't be verified. Your earlier results are still visible."}));
  }
 };
 const narrowed=Boolean(filters.origin_country||filters.destination_country||filters.privacy_rail);
 return <div className="route-explorer">
  <div className="route-explorer-grid">
   <section className="route-filter-panel" aria-labelledby="routes-filter-title">
    <div className="route-mini-label"><Search size={16} aria-hidden/> YOUR SEARCH</div>
    <h2 id="routes-filter-title">Find a route worth exploring.</h2>
    <p className="route-filter-description">Browse real operator-configured corridors. A route being listed does not mean payments are open.</p>
    <form onSubmit={apply} className="route-filter-form">
     <label htmlFor="route-origin">Sending from</label>
     <input id="route-origin" value={origin} onChange={e=>setOrigin(e.target.value.toUpperCase())}
      placeholder="Country code, e.g. NG" autoComplete="off" autoCapitalize="characters"
      maxLength={2} pattern="[A-Za-z]{2}" title="Two-letter country code"/>
     <label htmlFor="route-destination">Receiving in</label>
     <input id="route-destination" value={destination}
      onChange={e=>setDestination(e.target.value.toUpperCase())}
      placeholder="Country code, e.g. GH" autoComplete="off" autoCapitalize="characters"
      maxLength={2} pattern="[A-Za-z]{2}" title="Two-letter country code"/>
     <label htmlFor="route-privacy">Payment technology</label>
     <select id="route-privacy" value={rail} onChange={e=>setRail(e.target.value)}>
      <option value="">All researched technologies</option>
      <option value="private-payments">Private payments</option>
      <option value="confidential-token">Confidential tokens</option>
     </select>
     {validation?<p role="alert" className="route-filter-error">{validation}</p>:null}
     <div className="route-filter-actions">
      <Button type="submit">Explore routes <ArrowRight size={16} aria-hidden/></Button>
      <Button type="button" variant="outline" onClick={reset}>Clear</Button>
     </div>
    </form>
    <div className="route-filter-footnote"><ShieldCheck size={17} aria-hidden/>
     <span>Searches only public corridor metadata. No wallet, recipient details, or funds required.</span>
    </div>
   </section>
   <section className="route-results" aria-labelledby="routes-results-title">
    <div className="route-results-heading">
     <div><div className="route-mini-label"><Globe2 size={16} aria-hidden/> STELLAR TESTNET</div>
      <h2 id="routes-results-title">Corridors in the catalog</h2>
      <p>Real backend records, not live payment offers or a guarantee of delivery.</p>
     </div>
     <Button type="button" variant="outline" size="sm"
      disabled={state.status==="loading"||state.paging} onClick={refresh}>
      <RefreshCw size={15} aria-hidden/> Refresh
     </Button>
    </div>
    <div className="route-result-meta" role="status" aria-live="polite">
     {state.status==="loading"?"Checking the live catalog…":
      state.status==="error"?"Catalog unavailable":
      `${state.rows.length} configured route${state.rows.length===1?"":"s"} loaded`}
     {state.checkedAt?<span>Last checked at {state.checkedAt}</span>:null}
    </div>
    {state.status==="loading"?<div className="route-state" role="status">
     <Clock3 size={26} aria-hidden/><p>Checking actual corridor records. No routes are preloaded.</p>
    </div>:null}
    {state.status==="error"?<div className="route-state route-state-error" role="alert">
     <Globe2 size={28} aria-hidden/>
     <h3>We can't verify routes right now.</h3>
     <p>{state.error} We won't replace live data with sample corridors.</p>
     <Button type="button" variant="outline" onClick={refresh}>Try again</Button>
    </div>:null}
    {state.status==="ready"&&state.rows.length===0?<div className="route-state" role="status">
     <Globe2 size={29} aria-hidden/>
     <h3>{narrowed?"No configured routes match these filters.":"No configured routes are listed yet."}</h3>
     <p>{narrowed?"Try clearing a filter. This is the result of the actual catalog search, not a claim that no financial route exists worldwide.":"Operators haven't enabled a corridor in the public catalog. StealthBridge cannot quote or send funds through these routes."}</p>
    </div>:null}
    {state.status==="ready"&&state.rows.length>0?<div className="route-results-list">
     {state.rows.map(row=><article className="route-card" key={row.id}>
      <div className="route-card-top"><span className="route-record-tag"><Check size={14} aria-hidden/> Catalog record</span>
       <span className="route-record-network">Testnet only</span></div>
      <h3 aria-label={row.origin_country+" to "+row.destination_country}>{row.origin_country} <span aria-hidden>→</span> {row.destination_country}</h3>
      <p className="route-card-detail">Declared asset: <strong>{row.asset_code}</strong></p>
      <p className="route-card-detail">{railLabel(row.privacy_rail)}</p>
      <div className="route-card-availability"><LockKeyhole size={16} aria-hidden/>
       <span>Transfers, quotes and payouts are not enabled.</span></div>
      <p className="route-card-reference">Record ID: <code>{row.id}</code></p>
      <Link className="route-card-prepare" href={"/login?"+new URLSearchParams({
       next:"/app/send?corridor="+row.id
      }).toString()}>Review this route in your account <ArrowRight size={15} aria-hidden/></Link>
     </article>)}
    </div>:null}
    {state.status==="ready"&&state.pageError?<p role="alert" className="route-filter-error">
     {state.pageError}</p>:null}
    {state.status==="ready"&&state.next?<div className="route-pagination">
     <p>There are more matching records to load. Results so far are not the full catalog.</p>
     <Button type="button" variant="outline" disabled={state.paging} onClick={()=>void nextPage()}>
      {state.paging?"Loading more…":"Load more routes"} <ArrowRight size={16} aria-hidden/>
     </Button>
    </div>:null}
    {state.status==="ready"&&state.rows.length>0&&!state.next&&!state.pageError?
     <p className="route-end-note">You've reached the end of the matching configured records.</p>:null}
   </section>
  </div>
  <aside className="route-explorer-note" aria-label="Route availability and pricing">
   <LockKeyhole size={23} aria-hidden/><div>
    <h2>What about exchange rates and fees?</h2>
    <p>No executable quote, exchange rate, fee breakdown or delivery estimate is available. Catalog entries are not a promise of liquidity, regulated provider support, cryptographic privacy, or an actual payout.</p>
    <div className="route-note-links"><Link href="/send">About personal transfers <ArrowRight size={14} aria-hidden/></Link>
     <Link href="/business">For businesses <ArrowRight size={14} aria-hidden/></Link></div>
   </div>
  </aside>
 </div>;
}
