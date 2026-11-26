import * as React from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva,type VariantProps} from "class-variance-authority";
import {cn} from "@/lib/utils";

/** Accessible product buttons; asChild also styles Next.js links without nested buttons. */
export const buttonVariants=cva(
 "relative isolate inline-flex select-none items-center justify-center gap-3 overflow-hidden whitespace-normal text-center rounded-full border text-sm font-semibold tracking-[-0.01em] outline-none transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-300 ease-out focus-visible:ring-[3px] focus-visible:ring-[var(--sb-brand)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-canvas)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none",
 {
  variants:{
   variant:{
    primary:"border-[var(--sb-ink)] bg-[var(--sb-ink)] text-white hover:bg-[#183139] hover:border-[#183139]",
    secondary:"border-[var(--sb-brand)] bg-[var(--sb-brand)] text-white hover:bg-[var(--sb-brand-strong)] hover:border-[var(--sb-brand-strong)]",
    outline:"border-[var(--sb-line-strong)] bg-[var(--sb-surface)] text-[var(--sb-ink)] hover:bg-[var(--sb-surface-2)]",
    glass:"border-[var(--sb-line)] bg-[var(--sb-surface)]/90 text-[var(--sb-ink)] backdrop-blur-xl hover:bg-[var(--sb-surface-2)]",
    ghost:"border-transparent bg-transparent text-[var(--sb-ink-2)] hover:bg-[var(--sb-surface-2)] hover:text-[var(--sb-ink)]",
    danger:"border-[var(--sb-danger)]/30 bg-[var(--sb-danger-soft)] text-[var(--sb-danger)] hover:border-[var(--sb-danger)]/60"
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
