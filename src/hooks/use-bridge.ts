"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {readBridge,readCorridorPage,type Capabilities,type Corridor,type NetworkStatus,type ServiceReadiness,type ObservedLedgerCheckpoint} from "@/lib/bridge-api";

type Remote<T> = { data: T | null; error: string | null; loading: boolean };
const initial = <T,>():Remote<T>=>({data:null,error:null,loading:true});
const errorText=(e:unknown)=> e instanceof Error?e.message:"The request failed.";
export function useBridge() {
  const [network,setNetwork]=useState<Remote<NetworkStatus>>(initial());
  const [corridors,setCorridors]=useState<Remote<Corridor[]>>(initial());
  const [capabilities,setCapabilities]=useState<Remote<Capabilities>>(initial());
  const [readiness,setReadiness]=useState<Remote<ServiceReadiness>>(initial());
  const [observer,setObserver]=useState<Remote<ObservedLedgerCheckpoint>>(initial());
  const [observer,setObserver]=useState<Remote<ObservedLedgerCheckpoint>>(initial());
  const [revision,setRevision]=useState(0);
  const [nextCursor,setNextCursor]=useState<string|null>(null);
  const [loadingMore,setLoadingMore]=useState(false);
  const [pageError,setPageError]=useState<string|null>(null);
  const pageController=useRef<AbortController|null>(null);
  const refresh=useCallback(()=>{pageController.current?.abort();setRevision(n=>n+1);},[]);
  useEffect(()=>{
    const controller=new AbortController();
    const load=<T,>(key:"network"|"corridors"|"capabilities"|"ready"|"observer",update:(r:Remote<T>)=>void)=>{
      update({data:null,error:null,loading:true});
      readBridge<T>(key,controller.signal)
        .then(data=>{if(!controller.signal.aborted)update({data,error:null,loading:false});})
        .catch(e=>{if(!controller.signal.aborted)update({data:null,error:errorText(e),loading:false});});
    };
    load("network",setNetwork);
    setCorridors(initial<Corridor[]>());
    setNextCursor(null);
    setPageError(null);
    setLoadingMore(false);
    readCorridorPage(undefined,controller.signal)
      .then(page=>{if(!controller.signal.aborted){setCorridors({data:page.items,error:null,loading:false});setNextCursor(page.next_cursor);}})
      .catch(e=>{if(!controller.signal.aborted)setCorridors({data:null,error:errorText(e),loading:false});});
    load("capabilities",setCapabilities);
    load("ready",setReadiness);
    load("observer",setObserver);
    load("observer",setObserver);
    return ()=>{controller.abort();pageController.current?.abort();};
  },[revision]);

  const loadMore=useCallback(()=>{
    if(!nextCursor||loadingMore)return;
    pageController.current?.abort();
    const controller=new AbortController();
    pageController.current=controller;
    setLoadingMore(true);
    setPageError(null);
    readCorridorPage(nextCursor,controller.signal)
      .then(page=>{
        if(controller.signal.aborted)return;
        setCorridors(previous=>({...previous,data:[...(previous.data??[]),...page.items]}));
        setNextCursor(page.next_cursor);
      })
      .catch(error=>{if(!controller.signal.aborted)setPageError(errorText(error));})
      .finally(()=>{if(!controller.signal.aborted)setLoadingMore(false);});
  },[nextCursor,loadingMore]);
  return {network,corridors,capabilities,readiness,observer,refresh,nextCursor,loadingMore,pageError,loadMore};
}
