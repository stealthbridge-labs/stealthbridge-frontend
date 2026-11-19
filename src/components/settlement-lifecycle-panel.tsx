"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  advanceSettlementLifecycle,
  canonicalCustomerAuthorizationDigest,
  createSettlementLifecycle,
  listSettlementLifecycles,
  type SettlementLifecycleRecord,
} from "@/lib/settlement-lifecycle";
import { fingerprintInstructionRoute } from "@/lib/payment-instructions";
import type { CustomerCorridor } from "@/lib/customer-corridors";

type Props = {
  address: string;
  route: CustomerCorridor | null;
  recipientAddress: string;
  amount: string;
};

function toMinorUnits(amount: string): number | null {
  if (!/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,7})?$/.test(amount)) return null;
  const [whole, frac = ""] = amount.split(".");
  const padded = (frac + "0000000").slice(0, 7);
  const val = Number(whole) * 10_000_000 + Number(padded);
  return Number.isSafeInteger(val) && val > 0 ? val : null;
}

export function SettlementLifecyclePanel({
  address,
  route,
  recipientAddress,
  amount,
}: Props) {
  const [rows, setRows] = useState<SettlementLifecycleRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [txInput, setTxInput] = useState<Record<string, string>>({});

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const dir = await listSettlementLifecycles(address, signal);
        if (!signal?.aborted) {
          setRows(dir.items);
          setStatus("ready");
          setError("");
        }
      } catch {
        if (!signal?.aborted) {
          setStatus("unavailable");
        }
      }
    },
    [address],
  );

  useEffect(() => {
    const ctl = new AbortController();
    void refresh(ctl.signal);
    return () => ctl.abort();
  }, [refresh]);

  async function initiate() {
    const minor = toMinorUnits(amount);
    if (!route || !minor || !recipientAddress || busy) return;
    setBusy(true);
    setError("");
    try {
      const id = crypto.randomUUID();
      await createSettlementLifecycle({
        id,
        organization_id: null,
        instruction_id: null,
        corridor_id: route.id,
        route_fingerprint: await fingerprintInstructionRoute(route),
        idempotency_key: `sb-${id}`,
        asset_code: route.asset_code,
        asset_issuer: route.asset_issuer,
        amount_minor_units: minor,
        recipient_address: recipientAddress,
        privacy_rail: route.privacy_rail,
        expires_in_seconds: 3600,
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not initialize lifecycle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="payment-card instruction-workspace"
      aria-label="Controlled Testnet settlement lifecycle"
    >
      <div className="payment-card-heading">
        <div>
          <span className="payment-eyebrow">End-to-end Testnet workflow</span>
          <h2>Settlement lifecycle & reconciliation</h2>
        </div>
        <ShieldCheck size={22} aria-hidden />
      </div>
      <p className="payment-hint">
        Tracks instruction verification, explicit FX quote status (halts at{" "}
        <code>quote_unavailable</code> when no provider is configured),
        policy/customer authorization, independent Testnet ledger finality, and
        separate fiat payout status. On-chain Testnet finality never equals
        fiat payout completion.
      </p>
      <div className="payment-action-row">
        <Button
          type="button"
          size="sm"
          disabled={
            busy ||
            status !== "ready" ||
            !route ||
            !toMinorUnits(amount) ||
            !recipientAddress
          }
          onClick={() => void initiate()}
        >
          Start controlled Testnet lifecycle
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCw size={14} aria-hidden /> Refresh lifecycle
        </Button>
      </div>
      {error ? (
        <p role="alert" className="state-error">
          {error}
        </p>
      ) : null}
      {status === "unavailable" ? (
        <p className="payment-hint">
          Controlled Testnet settlement lifecycle backend is disabled or not
          configured in this preview environment.
        </p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="instruction-list">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="instruction-row-heading">
                <strong>
                  {row.asset_code} · {(row.amount_minor_units / 10_000_000).toFixed(7)}
                </strong>
                <span className="instruction-state">{row.state}</span>
              </div>
              <dl>
                <div>
                  <dt>Privacy rail</dt>
                  <dd>
                    {row.privacy_rail} (
                    {row.privacy_rail_verified ? "proof verified" : "unverified / transparent Testnet leg"})
                  </dd>
                </div>
                <div>
                  <dt>Quote status</dt>
                  <dd>{row.quote_status}</dd>
                </div>
                <div>
                  <dt>On-chain Testnet</dt>
                  <dd>
                    {row.chain_status
                      ? `${row.chain_status} · ledger ${row.observed_ledger ?? "—"}`
                      : row.testnet_tx_hash
                        ? `submitted ${row.testnet_tx_hash.slice(0, 10)}…`
                        : "not submitted"}
                  </dd>
                </div>
                <div>
                  <dt>Fiat payout status</dt>
                  <dd>{row.payout_status}</dd>
                </div>
                <div>
                  <dt>Reconciliation</dt>
                  <dd>{row.reconciliation_status}</dd>
                </div>
              </dl>
              <div className="customer-vault-actions">
                {row.state === "quote_unavailable" || row.state === "quoted" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await advanceSettlementLifecycle({
                          action: "verify_policy",
                          id: row.id,
                          expected_revision: row.revision,
                          policy_commitment_sha256: row.request_sha256,
                        });
                        await refresh();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Verify policy
                  </Button>
                ) : null}
                {row.state === "policy_verified" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const authDigest = await canonicalCustomerAuthorizationDigest(
                          address,
                          row.request_sha256,
                        );
                        await advanceSettlementLifecycle({
                          action: "authorize",
                          id: row.id,
                          expected_revision: row.revision,
                          customer_auth_sha256: authDigest,
                          acknowledge_transparent_testnet_only: true,
                          privacy_rail_proof_verified: false,
                        });
                        await refresh();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Authorize (disclosed Testnet leg)
                  </Button>
                ) : null}
                {row.state === "privacy_proof_verified" ? (
                  <div className="payment-action-row">
                    <input
                      className="payment-input"
                      placeholder="64-hex Testnet tx hash"
                      value={txInput[row.id] ?? ""}
                      onChange={(e) =>
                        setTxInput((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || !(txInput[row.id] ?? "").match(/^[0-9a-f]{64}$/)}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await advanceSettlementLifecycle({
                            action: "submit_tx",
                            id: row.id,
                            expected_revision: row.revision,
                            testnet_tx_hash: txInput[row.id],
                          });
                          await refresh();
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Record tx hash
                    </Button>
                  </div>
                ) : null}
                {row.state === "tx_submitted" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await advanceSettlementLifecycle({
                          action: "observe_tx",
                          id: row.id,
                          expected_revision: row.revision,
                        });
                        await refresh();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Observe Testnet ledger
                  </Button>
                ) : null}
                {row.state === "chain_finalized" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await advanceSettlementLifecycle({
                          action: "reconcile",
                          id: row.id,
                          expected_revision: row.revision,
                        });
                        await refresh();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Reconcile Testnet leg (payout unavailable)
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
