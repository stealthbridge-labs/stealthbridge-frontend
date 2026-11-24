import type {Metadata,Viewport} from "next";
import "./globals.css";
import "./design-system.css";
import { SITE_ORIGIN } from "./site-metadata";
import {SiteEnhancements} from "@/components/site-enhancements";
export const metadata:Metadata={
 metadataBase:new URL(SITE_ORIGIN),
 alternates:{canonical:"/"},
 twitter:{card:"summary_large_image"},
 icons:{icon:"/brand/stealthbridge-symbol.svg"},
 title:{default:"StealthBridge | Confidential payments. Without borders.",template:"%s | StealthBridge"},
 description:"StealthBridge is developing more privacy-conscious cross-border payment experiences for businesses and people, built on Stellar.",
 robots:{index:true,follow:true},
 openGraph:{
  title:"StealthBridge — Confidential payments. Without borders.",
  description:"Meet StealthBridge Business, Send and our shared platform vision for more private cross-border value.",
  type:"website",
  url:"/"
 }
};
export const viewport:Viewport={themeColor:"#031419"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
 return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to main content</a>{children}<SiteEnhancements/></body></html>;
}
