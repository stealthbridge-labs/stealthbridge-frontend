"use client";
import {usePathname} from "next/navigation";
import Link from "next/link";
import {Building2,FileSpreadsheet,House,Send,Settings2,SquarePen} from "lucide-react";

const businessDetail=/^\/app\/business\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const sections=[
 {name:"Your space",items:[{href:"/app",label:"Overview",Icon:House}]},
 {name:"Personal",items:[{href:"/app/send",label:"Transfers",Icon:Send}]},
 {name:"Business",items:[
  {href:"/app/business",label:"Workspace",Icon:Building2},
  {href:"/app/business/payments",label:"Single payment",Icon:SquarePen},
  {href:"/app/business/batch",label:"Batch planner",Icon:FileSpreadsheet}
 ]},
 {name:"Account",items:[{href:"/app/settings",label:"Settings",Icon:Settings2}]}
];
export function AccountNavigation({profilesEnabled}:{profilesEnabled:boolean}){
 const pathname=usePathname();
 return <nav className="account-navigation" aria-label="Product areas">
  <div className="account-nav-scroll">
   {sections.filter(section=>section.name!=="Account"||profilesEnabled).map(section=>
    <div className="account-nav-group" key={section.name}>
     <span className="account-nav-category">{section.name}</span>
     <div className="account-nav-links">
      {section.items.map(({href,label,Icon})=>
       <Link key={href} href={href} aria-current={pathname===href||
        (href==="/app/business"&&businessDetail.test(pathname))?"page":undefined}>
        <Icon size={16} aria-hidden/><span>{label}</span>
       </Link>)}
     </div>
    </div>)}
  </div>
 </nav>;
}
