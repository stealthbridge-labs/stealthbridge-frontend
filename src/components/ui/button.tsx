import * as React from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva,type VariantProps} from "class-variance-authority";
import {cn} from "@/lib/utils";

/** Accessible product buttons; asChild also styles Next.js links without nested buttons. */
export const buttonVariants=cva(
 "relative isolate inline-flex select-none items-center justify-center gap-3 overflow-hidden whitespace-normal text-center rounded-full border text-sm font-bold tracking-[-0.01em] outline-none transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-300 ease-out focus-visible:ring-[3px] focus-visible:ring-[#8cfce6]/70 focus-visible:ring-offset-[3px] focus-visible:ring-offset-[#031419] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none",
 {
  variants:{
   variant:{
    primary:"border-[#8cfce6] bg-[#8cfce6] text-[#031e23] shadow-[0_8px_32px_-14px_rgba(111,242,211,.65)] hover:-translate-y-0.5 hover:border-[#d1fff0] hover:bg-[#d1fff0] hover:shadow-[0_14px_42px_-14px_rgba(111,242,211,.65)]",
    secondary:"border-[#1b555c] bg-[#17434c] text-[#e8fffa] hover:-translate-y-0.5 hover:bg-[#205861] hover:border-[#70e7cf]",
    outline:"border-white/30 bg-white/[.045] text-[#eefcf8] shadow-[inset_0_1px_0_rgba(255,255,255,.06)] hover:-translate-y-0.5 hover:border-[#91f7de]/70 hover:bg-[#a2f7e8]/[.12]",
    glass:"border-[#90ead6]/25 bg-[#0d363f]/75 text-[#eafffa] backdrop-blur-xl hover:-translate-y-0.5 hover:border-[#8af7dc]/70 hover:bg-[#1b5257]",
    ghost:"border-transparent bg-transparent text-[#c6e5de] hover:bg-white/10 hover:text-white",
    danger:"border-[#fa9888]/45 bg-[#692c34]/35 text-[#ffd1c8] hover:border-[#ffb4a9] hover:bg-[#78353d]/60"
   },
   size:{
    sm:"min-h-9 gap-1.5 px-4 py-2 text-xs",
    default:"min-h-11 px-5 py-2.5",
    lg:"min-h-13 px-7 py-3.5 text-[14px] sm:min-h-14 sm:px-8 sm:text-[15px]",
    icon:"h-11 w-11 p-0"
   }
  },
  defaultVariants:{variant:"primary",size:"default"}
 }
);
export function Button({
 asChild=false,variant,size,className,type,...props
}:React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {asChild?:boolean}){
 const Comp=asChild?Slot:"button";
 return <Comp data-slot="button" data-variant={variant??"primary"} type={asChild?undefined:(type??"button")}
  className={cn(buttonVariants({variant,size}),className)} {...props}/>;
}
