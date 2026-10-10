"use client";
import {useEffect,useState} from "react";
import {getNetwork,getAddress,isConnected,requestAccess} from "@stellar/freighter-api";
import {Wallet,AlertTriangle,CheckCircle2,Eye,Unplug} from "lucide-react";
import {Button} from "@/components/ui/button";
import {canonicalStellarAccountAddress} from "@/lib/stellar-address";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

/**
 * Both wallet modes are local to this tab. "Watch" never asks for permissions
 * and Freighter access only reveals a public address on a deliberate click.
 * Neither path signs, submits, or saves account identifiers on our servers.
 */
export function WalletConnect({expectedNetworkPassphrase,backendNetworkVerified=false}:{expectedNetworkPassphrase?:string;backendNetworkVerified?:boolean}){
 const [address,setAddress]=useState<string|null>(null);
 const [network,setNetwork]=useState<string|null>(null);
 const [pending,setPending]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [watchInput,setWatchInput]=useState("");
 const [watchedAddress,setWatchedAddress]=useState<string|null>(null);
 const [watchError,setWatchError]=useState<string|null>(null);
 const correct=network===TESTNET_PASSPHRASE;
 const backendMatches=backendNetworkVerified&&expectedNetworkPassphrase===TESTNET_PASSPHRASE;

 useEffect(()=>{
  if(!address)return;
  let disposed=false;
  const recheck=async()=>{
   if(document.visibilityState==="hidden")return;
   try{
    const [installed,account,info]=await Promise.all([isConnected(),getAddress(),getNetwork()]);
    if(disposed)return;
    if(installed.error||!installed.isConnected||account.error||
      canonicalStellarAccountAddress(account.address??"")!==address||
      info.error||info.networkPassphrase!==TESTNET_PASSPHRASE){
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
  setPending(true);setError(null);setAddress(null);setNetwork(null);
  try{
   const installed=await isConnected();
   if(installed.error||!installed.isConnected)throw new Error("Freighter is not available. Install the wallet extension before connecting.");
   const access=await requestAccess();
   if(access.error||!access.address)throw new Error(access.error?.message||"Wallet access was not granted.");
   const verified=canonicalStellarAccountAddress(access.address);
   if(!verified)throw new Error("Freighter returned an invalid or unsupported Stellar public account.");
   const info=await getNetwork();
   if(info.error)throw new Error(info.error.message);
   if(info.networkPassphrase!==TESTNET_PASSPHRASE){
    throw new Error("Switch Freighter to Stellar Testnet. StealthBridge cannot use another network.");
   }
   setNetwork(info.networkPassphrase);
   setAddress(verified);
   if(!backendMatches)setError("Wallet connected locally, but a fresh backend Testnet observation is not verified.");
  }catch(e){
   setError(e instanceof Error?e.message:"Unable to connect wallet.");
   setAddress(null);setNetwork(null);
  }finally{setPending(false);}
 };

 const watch=()=>{
  const verified=canonicalStellarAccountAddress(watchInput);
  if(!verified){
   setWatchError("Enter a valid 56-character Stellar G-address with a correct checksum.");
   setWatchedAddress(null);
   return;
  }
  setWatchedAddress(verified);
  setWatchError(null);
 };

 return <section className="wallet-section" aria-label="Wallet connection or watch-only address">
  <div className="wallet-top"><div><h3>Wallet connection</h3><p>Choose Freighter to connect, or watch a public Stellar address without connecting. No private keys or seeds are requested.</p></div><Wallet size={23} aria-hidden/></div>
  {address&&correct&&backendMatches?<div className="wallet-connected"><CheckCircle2 aria-hidden size={18}/><div><strong>Freighter connected on Testnet</strong><code title={address}>{address}</code></div></div>:null}
  {address&&correct&&!backendMatches?<p className="wallet-error" role="status">Freighter is on Testnet, but backend RPC readiness or ledger freshness cannot be verified. No signing is available.</p>:null}
  <div className="wallet-address-actions">
   <Button variant="outline" disabled={pending} onClick={connect} type="button">{pending?"Connecting…":address?"Recheck wallet":"Connect Freighter"}</Button>
   {address?<Button type="button" variant="outline" onClick={()=>{setAddress(null);setNetwork(null);setError(null);}}><Unplug size={15} aria-hidden/> Forget connection</Button>:null}
  </div>
  {error?<p className="wallet-error" role="alert"><AlertTriangle size={15} aria-hidden/>{error}</p>:null}
  <div className="wallet-watch">
   <label className="field" htmlFor="watch-stellar-address">Watch-only Stellar public address</label>
   <p id="watch-only-explanation">Paste a public G-address for local reference. This does not verify ownership, connect a wallet, look up balances, or transmit the address.</p>
   <input id="watch-stellar-address" className="tx-input" type="text" spellCheck={false}
    autoCapitalize="characters" autoComplete="off" maxLength={128}
    aria-describedby="watch-only-explanation"
    placeholder="G… public Testnet account address"
    value={watchInput} onChange={event=>{setWatchInput(event.target.value);setWatchError(null);}}/>
   <div className="wallet-address-actions">
    <Button type="button" variant="outline" onClick={watch}><Eye size={16} aria-hidden/> Watch address locally</Button>
    {watchedAddress?<Button type="button" variant="outline" onClick={()=>{setWatchedAddress(null);setWatchInput("");setWatchError(null);}}>Clear watched address</Button>:null}
   </div>
   {watchError?<p className="wallet-error" role="alert"><AlertTriangle size={15} aria-hidden/>{watchError}</p>:null}
   {watchedAddress?<div className="wallet-connected" role="status"><Eye size={18} aria-hidden/><div><strong>Watch-only address · not connected</strong><code>{watchedAddress}</code><a className="wallet-explorer-link" href={"https://stellar.expert/explorer/testnet/account/"+watchedAddress} target="_blank" rel="noopener noreferrer">Open public Testnet explorer (shares address with explorer)</a></div></div>:null}
  </div>
  <p className="wallet-security-note">Connecting Freighter requests public-account access only. There is no transaction signing, payment submission, address upload, or wallet history indexing.</p>
 </section>;
}
