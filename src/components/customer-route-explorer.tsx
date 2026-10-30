"use client";

import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {ArrowRight,Check,Clock3,Globe2,LockKeyhole,RefreshCw,Search,ShieldCheck} from "lucide-react";
import {Button} from "@/components/ui/button";
import {COUNTRIES,countryName} from "@/lib/customer-countries";
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
const privacyText=(rail:CustomerCorridor["privacy_rail"])=>
 rail==="private-payments"?"Payment relationship protection under review":"Amount protection under review";
const formattedTime=()=>new Date().toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
function urlFilters():CustomerCorridorFilters|null{
 const params=new URLSearchParams(window.location.search);
 const keys=["origin_country","destination_country","privacy_rail"];
 if([...params.keys()].some(key=>!keys.includes(key)||params.getAll(key).length!==1))return null;
 const filter=Object.fromEntries(keys.filter(key=>params.has(key)).map(key=>[key,params.get(key)]));
 return validCustomerCorridorFilters(filter)?filter:null;
}
export function CustomerRouteExplorer(){
 const [intent,setIntent]=useState<"personal"|"business">("personal");
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
   setValidation("Choose valid sending and receiving countries.");
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
    <div className="route-mini-label"><Search size={16} aria-hidden/> FIND YOUR WAY</div>
    <h2 id="routes-filter-title">Where are you sending money?</h2>
    <p className="route-filter-description">Choose where money starts and where it needs to go. We only show routes we can verify—never invented prices or availability.</p>
    <div className="route-intent" role="group" aria-label="What are you planning?">
     <button type="button" aria-pressed={intent==="personal"}
      onClick={()=>setIntent("personal")}>For myself</button>
     <button type="button" aria-pressed={intent==="business"}
      onClick={()=>setIntent("business")}>For my business</button>
    </div>
    <form onSubmit={apply} className="route-filter-form">
     <label htmlFor="route-origin">Sending from</label>
     <select id="route-origin" value={origin} onChange={e=>setOrigin(e.target.value)}>
      <option value="">Any sending country</option>
      {COUNTRIES.map(([code,name])=><option key={code} value={code}>{name}</option>)}
     </select>
     <label htmlFor="route-destination">Receiving in</label>
     <select id="route-destination" value={destination} onChange={e=>setDestination(e.target.value)}>
      <option value="">Any receiving country</option>
      {COUNTRIES.map(([code,name])=><option key={code} value={code}>{name}</option>)}
     </select>

     {validation?<p role="alert" className="route-filter-error">{validation}</p>:null}
     <div className="route-filter-actions">
      <Button type="submit">Check this route <ArrowRight size={16} aria-hidden/></Button>
      <Button type="button" variant="outline" onClick={reset}>Clear</Button>
     </div>
    </form>
    <div className="route-filter-footnote"><ShieldCheck size={17} aria-hidden/>
     <span>No account needed to explore. Your recipient and amount stay private.</span>
    </div>
   </section>
   <section className="route-results" aria-labelledby="routes-results-title">
    <div className="route-results-heading">
     <div><div className="route-mini-label"><Globe2 size={16} aria-hidden/> PAYMENT ROUTES</div>
      <h2 id="routes-results-title">Your route information</h2>
      <p>We show only configurations we can verify. A listed route is not yet an open payment service.</p>
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
     <Clock3 size={26} aria-hidden/><p>Checking current route configurations.</p>
    </div>:null}
    {state.status==="error"?<div className="route-state route-state-error" role="alert">
     <Globe2 size={28} aria-hidden/>
     <h3>We can't verify routes right now.</h3>
     <p>{state.error} We won't show made-up availability or rates.</p>
     <Button type="button" variant="outline" onClick={refresh}>Try again</Button>
    </div>:null}
    {state.status==="ready"&&state.rows.length===0?<div className="route-state" role="status">
     <Globe2 size={29} aria-hidden/>
     <h3>{narrowed?"We aren’t ready to offer this route yet.":"We’re preparing our first payment routes."}</h3>
     <p>{narrowed?"Try another sending or receiving country. We do not show routes that have not been configured.":"As we verify partners and routes, they will appear here. We are not accepting transfers yet."}</p>
    </div>:null}
    {state.status==="ready"&&state.rows.length>0?<div className="route-results-list">
     {state.rows.map(row=><article className="route-card" key={row.id}>
      <div className="route-card-top"><span className="route-record-tag"><Check size={14} aria-hidden/> Configured for review</span>
       <span className="route-record-network">Transfers not open yet</span></div>
      <h3 aria-label={row.origin_country+" to "+row.destination_country}>
       <span className="route-city">{countryName(row.origin_country)}</span>
       <span aria-hidden className="route-city-arrow">→</span>
       <span className="route-city">{countryName(row.destination_country)}</span></h3>
      <p className="route-card-detail">Sending asset: <strong>{row.asset_code}</strong></p>
      <p className="route-card-detail"><LockKeyhole size={14} aria-hidden/> {privacyText(row.privacy_rail)}</p>
      <div className="route-card-availability"><Clock3 size={16} aria-hidden/>
       <span>Pricing and transfers are not open on this route yet.</span></div>
      <Link className="route-card-prepare" href={"/login?"+new URLSearchParams({
       next:(intent==="business"?"/app/business":"/app/send")+"?corridor="+row.id
      }).toString()}>{intent==="business"?"Review for my business":"Review personal transfer"} <ArrowRight size={15} aria-hidden/></Link>
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
    <h2>What will my recipient actually receive?</h2>
    <p>You deserve to see the exact receiving amount, exchange rate, fees and delivery estimate before paying. We are not issuing quotes or accepting transfers until those can be confirmed with real providers.</p>
    <div className="route-note-links"><Link href="/send">About personal transfers <ArrowRight size={14} aria-hidden/></Link>
     <Link href="/business">For businesses <ArrowRight size={14} aria-hidden/></Link></div>
   </div>
  </aside>
 </div>;
}
