import type { LifecycleState, SettlementLifecycleRecord } from "./settlement-lifecycle.ts";

export interface LifecycleStageStep {
  key: string;
  label: string;
  status: "done" | "current" | "halted" | "upcoming";
}

const ORDERED_STAGES: Array<{ key: string; label: string; states: LifecycleState[] }> = [
  {
    key: "prepare",
    label: "1. Quote & corridor",
    states: [
      "instruction_created",
      "corridor_verified",
      "asset_recipient_verified",
      "quote_unavailable",
      "quoted",
    ],
  },
  {
    key: "policy",
    label: "2. Policy check",
    states: ["policy_verified"],
  },
  {
    key: "authorize",
    label: "3. Authorize",
    states: ["customer_authorized"],
  },
  {
    key: "privacy",
    label: "4. Privacy leg",
    states: ["privacy_proof_pending", "privacy_proof_verified"],
  },
  {
    key: "submit",
    label: "5. Testnet tx",
    states: ["tx_submitted"],
  },
  {
    key: "finalize",
    label: "6. Ledger finality",
    states: ["chain_finalized", "chain_failed"],
  },
  {
    key: "reconcile",
    label: "7. Reconcile",
    states: [
      "payout_pending",
      "payout_completed",
      "payout_failed",
      "dispute_open",
      "reversal_pending",
      "reversed",
      "reconciled",
    ],
  },
];

const HALTED_STATES = new Set<LifecycleState>([
  "quote_unavailable",
  "chain_failed",
  "payout_failed",
  "dispute_open",
  "reversed",
  "expired",
  "cancelled",
]);

export function stageProgressForLifecycle(state: LifecycleState): LifecycleStageStep[] {
  if (state === "expired" || state === "cancelled") {
    return ORDERED_STAGES.map((stage, index) => ({
      key: stage.key,
      label: stage.label,
      status: index === 0 ? "halted" : "upcoming",
    }));
  }

  const activeIndex = ORDERED_STAGES.findIndex((stage) => stage.states.includes(state));
  const resolvedIndex = activeIndex === -1 ? 0 : activeIndex;

  return ORDERED_STAGES.map((stage, index) => {
    if (index < resolvedIndex) {
      return { key: stage.key, label: stage.label, status: "done" };
    }
    if (index === resolvedIndex) {
      return {
        key: stage.key,
        label: stage.label,
        status: HALTED_STATES.has(state) ? "halted" : state === "reconciled" ? "done" : "current",
      };
    }
    return { key: stage.key, label: stage.label, status: "upcoming" };
  });
}

export function plainLanguageLifecycleSummary(row: SettlementLifecycleRecord): string {
  switch (row.state) {
    case "quote_unavailable":
      return "Corridor & recipient validated. Paused before execution because no live FX or fee provider is configured — you may inspect or run controlled Testnet policy steps.";
    case "quoted":
      return "Corridor and route quote recorded. Verify Testnet policy constraints next.";
    case "policy_verified":
      return "Corridor & policy checks completed. Explicit wallet/customer disclosure acknowledgement required next.";
    case "customer_authorized":
    case "privacy_proof_pending":
      return "Customer acknowledgement recorded. Verifying declared privacy rail capabilities.";
    case "privacy_proof_verified":
      return "Ready to record an independently submitted 64-character Stellar Testnet transaction hash for ledger observation.";
    case "tx_submitted":
      return "Testnet transaction hash recorded. Trigger observation to confirm finality on Stellar Testnet Horizon/RPC.";
    case "chain_finalized":
      return "Stellar Testnet transaction finalized on-chain. Reconcile the Testnet leg separately (fiat payout remains unavailable).";
    case "reconciled":
      return "Testnet leg reconciled in backend audit journal. Off-chain fiat payout remains unavailable and has not occurred.";
    case "chain_failed":
      return "Observed Stellar Testnet transaction did not succeed on-chain.";
    case "expired":
      return "Instruction window expired without Testnet finality.";
    case "cancelled":
      return "Cancelled before submission.";
    default:
      return `Controlled Testnet lifecycle state: ${row.state}.`;
  }
}

function escapeCsvCell(raw: string): string {
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Generates an RFC-4180 CSV summary strictly from actual backend lifecycle rows.
 * Never invents FX rates, balances, or fiat payout confirmations.
 */
export function buildReconciliationCsv(rows: readonly SettlementLifecycleRecord[]): string {
  const header = [
    "id",
    "created_at_iso",
    "network",
    "asset_code",
    "amount_display",
    "recipient_address",
    "recipient_kind",
    "state",
    "quote_status",
    "privacy_rail",
    "privacy_rail_verified",
    "testnet_tx_hash",
    "observed_ledger",
    "chain_status",
    "payout_status",
    "reconciliation_status",
    "fiat_payouts_enabled",
    "mainnet_enabled",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    const cells = [
      row.id,
      new Date(row.created_at_unix * 1000).toISOString(),
      "testnet",
      row.asset_code,
      (row.amount_minor_units / 10_000_000).toFixed(7),
      row.recipient_address,
      row.recipient_kind,
      row.state,
      row.quote_status,
      row.privacy_rail,
      String(row.privacy_rail_verified),
      row.testnet_tx_hash ?? "",
      row.observed_ledger === null ? "" : String(row.observed_ledger),
      row.chain_status ?? "",
      row.payout_status,
      row.reconciliation_status,
      "false",
      "false",
    ].map(escapeCsvCell);
    lines.push(cells.join(","));
  }
  return lines.join("\n") + "\n";
}

export function buildReconciliationReportJson(
  accountAddress: string,
  rows: readonly SettlementLifecycleRecord[],
): string {
  return JSON.stringify(
    {
      schema_version: 1,
      exported_at_iso: new Date().toISOString(),
      network: "testnet",
      account_address: accountAddress,
      mainnet_enabled: false,
      live_fx_enabled: false,
      fiat_payouts_enabled: false,
      record_count: rows.length,
      items: rows,
    },
    null,
    2,
  );
}
