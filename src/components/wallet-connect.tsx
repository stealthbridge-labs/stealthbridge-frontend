"use client";
import {useEffect,useState} from "react";
import {getNetwork,getAddress,isConnected,requestAccess} from "@stellar/freighter-api";
import {Wallet,AlertTriangle,CheckCircle2} from "lucide-react";
import {Button} from "@/components/ui/button";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export function WalletConnect({expectedNetworkPassphrase}:{expectedNetworkPassphrase?:string}){
 const [address,setAddress]=useState<string|null>(null);
 const [network,setNetwork]=useState<string|null>(null);
 const [pending,setPending]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const correct=network===TESTNET_PASSPHRASE;
 const backendMatches=expectedNetworkPassphrase===TESTNET_PASSPHRASE;
 // Wallet context may change in another tab or extension. Never claim the
 // old address/network remain verified after the user switches accounts.
 useEffect(()=>{
  if(!address)return;
  let disposed=false;
  const recheck=async()=>{
   if(document.visibilityState==="hidden")return;
   try{
    const [installed,account,info]=await Promise.all([isConnected(),getAddress(),getNetwork()]);
    if(disposed)return;
    if(installed.error||!installed.isConnected||account.error||!account.address||
      info.error || account.address!==address || info.networkPassphrase!==TESTNET_PASSPHRASE){
       setAddress(null);setNetwork(null);
       setError("Wallet account or network changed. Reconnect Freighter on Testnet.");
    }
   }catch{
    if(!disposed){setAddress(null);setNetwork(null);setError("Cannot verify Freighter state. Reconnect.");}
   }
  };
  window.addEventListener("focus",recheck);
  document.addEventListener("visibilitychange",recheck);
  return ()=>{disposed=true;window.removeEventListener("focus",recheck);document.removeEventListener("visibilitychange",recheck);};
 },[address]);
 const connect=async()=>{
  setPending(true);setError(null);
  try{
   const installed=await isConnected();
   if(installed.error || !installed.isConnected) throw new Error("Freighter is not available. Install the wallet extension before connecting.");
   const access=await requestAccess();
   if(access.error || !access.address) throw new Error(access.error?.message||"Wallet access was not granted.");
   const info=await getNetwork();
   if(info.error) throw new Error(info.error.message);
   const passphrase=info.networkPassphrase??"";
   setNetwork(passphrase);
   setAddress(access.address);
   if(passphrase!==TESTNET_PASSPHRASE) setError("Switch Freighter to Stellar Testnet. StealthBridge cannot use another network.");
   else if(!backendMatches) setError("Wallet is connected locally, but the backend Testnet network is not verified.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to connect wallet.");setAddress(null);setNetwork(null);}
  finally{setPending(false);}
 };
 return <div className="wallet-section">
 <div className="wallet-top"><div><h3>Wallet authorization</h3><p>Freighter connection uses your wallet extension. No secret keys enter StealthBridge.</p></div><Wallet size={23} aria-hidden/></div>
 {address&&correct&&backendMatches?<div className="wallet-connected"><CheckCircle2 aria-hidden size={18}/><div><strong>Connected on Testnet</strong><code title={address}>{address}</code></div></div>:null}
 <Button variant="outline" disabled={pending} onClick={connect} type="button">{pending?"Connecting…":address?"Recheck wallet":"Connect Freighter"}</Button>
 {address&&correct&&!backendMatches?<p className="wallet-error" role="status">Freighter is on Testnet, but the backend RPC network has not yet been verified. No signing is available.</p>:null}
 {error?<p className="wallet-error" role="alert"><AlertTriangle size={15} aria-hidden/>{error}</p>:null}
 </div>;
}
