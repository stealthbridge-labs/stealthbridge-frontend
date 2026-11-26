"use client";
/**
 * One source of truth for the signed-in customer's money data: deployed smart
 * accounts, live on-chain balances and payment history. Everything comes from
 * the backend (which reads Stellar); nothing is computed or invented here.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { listDeployments, type DeploymentDirectory, type SmartAccountDeployment } from "@/lib/smart-account-deployments";
import { listBalances, listPayments, type AccountBalances, type PaymentDirectory, type PaymentRecord } from "@/lib/smart-account-payments";

export type MoneyState = {
  status: "loading" | "ready" | "error";
  error: string;
  directory: DeploymentDirectory | null;
  accounts: SmartAccountDeployment[];
  balances: AccountBalances[] | null;
  balanceError: boolean;
  payments: PaymentDirectory | null;
  /** True when payment history could not be read: never present that as "no payments". */
  paymentsError: boolean;
  refresh: () => Promise<void>;
};

export function useMoney(address: string, opts: { pollWhilePending?: boolean } = {}): MoneyState {
  const [status, setStatus] = useState<MoneyState["status"]>("loading");
  const [error, setError] = useState("");
  const [directory, setDirectory] = useState<DeploymentDirectory | null>(null);
  const [balances, setBalances] = useState<AccountBalances[] | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const [payments, setPayments] = useState<PaymentDirectory | null>(null);
  const [paymentsError, setPaymentsError] = useState(false);
  const polls = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([
        listDeployments(address),
        listPayments(address).catch(() => null),
      ]);
      setDirectory(d);
      setPayments(p);
      setPaymentsError(p === null);
      setStatus("ready");
      setError("");
      if (d.deployments.some((x) => x.status === "deployed")) {
        listBalances()
          .then((b) => { setBalances(b); setBalanceError(false); })
          .catch(() => setBalanceError(true));
      } else {
        setBalances([]);
      }
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "We couldn't load your accounts.");
    }
  }, [address]);

  // Initial load is scheduled, not run synchronously inside the effect body.
  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  const pending =
    (payments?.payments.some((p) => p.status === "submitted" || p.status === "submitting") ?? false) ||
    (directory?.deployments.some((d) => d.status === "submitted") ?? false);
  useEffect(() => {
    if (!opts.pollWhilePending || !pending || polls.current >= 30) return;
    const t = setTimeout(() => { polls.current += 1; void refresh(); }, 3000);
    return () => clearTimeout(t);
  }, [opts.pollWhilePending, pending, payments, directory, refresh]);

  const accounts = directory?.deployments.filter((d) => d.status === "deployed") ?? [];
  return { status, error, directory, accounts, balances, balanceError, payments, paymentsError, refresh };
}

/** Sum of one asset's balance across accounts, as a BigInt of stroops. */
export function totalOf(balances: AccountBalances[] | null, asset: string): bigint | null {
  if (!balances) return null;
  let sum = BigInt(0);
  let seen = false;
  for (const a of balances) {
    for (const b of a.balances) {
      if (b.asset === asset && b.balance_stroops !== null) { sum += BigInt(b.balance_stroops); seen = true; }
    }
  }
  return seen ? sum : null;
}

export function statusMeta(status: PaymentRecord["status"]): { tone: string; label: string } {
  switch (status) {
    case "confirmed": return { tone: "success", label: "Completed" };
    case "submitted": case "submitting": return { tone: "warning", label: "Processing" };
    case "prepared": return { tone: "neutral", label: "Awaiting approval" };
    case "expired": return { tone: "neutral", label: "Expired" };
    case "failed": return { tone: "danger", label: "Failed" };
  }
}

export const EXPLORER = "https://stellar.expert/explorer/testnet";
export const short = (v: string, n = 6) => `${v.slice(0, n)}…${v.slice(-n)}`;
export function when(unix: number) {
  return new Date(unix * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
