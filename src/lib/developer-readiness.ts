/**
 * Developer preflight for public Testnet observations.
 * This is an integration diagnostic, never a security release gate or payment authorization.
 * Private witnesses, wallet signatures and personal identities must not be supplied.
 */
export type DeveloperCheckId = "network" | "database" | "product-catalog" | "soroban" | "execution";
export type DeveloperCheckState = "observed" | "unavailable" | "unsafe";
export interface DeveloperCheck {
  id: DeveloperCheckId;
  state: DeveloperCheckState;
  detail: string;
}
export interface DeveloperReadiness {
  verdict: "read-only-ready" | "degraded" | "unsafe-claim";
  checks: DeveloperCheck[];
  wallet_signing_enabled: false;
  funds_movement_enabled: false;
  fiat_payouts_enabled: false;
}
export interface DeveloperObservation {
  network?: unknown;
  readiness?: unknown;
  capabilities?: unknown;
  catalog?: unknown;
  contracts?: unknown;
}
const passphrase = "Test SDF Network ; September 2015";
function obj(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function hasFalseFlags(value: unknown, flags: readonly string[]): boolean {
  return obj(value) && flags.every(flag => value[flag] === false);
}
function result(id: DeveloperCheckId, state: DeveloperCheckState, detail: string): DeveloperCheck {
  return {id, state, detail};
}
/** Always bound the input clock; fail closed for malformed or future observations. */
export function assessDeveloperReadiness(
  observations: DeveloperObservation,
  nowUnix: number,
): DeveloperReadiness {
  const network = observations.network;
  const ready = observations.readiness;
  const caps = observations.capabilities;
  const catalog = observations.catalog;
  const contracts = observations.contracts;
  const clockValid = Number.isSafeInteger(nowUnix) && nowUnix > 0;
  const rpcClaim = obj(network) && network.network === "testnet" &&
    network.passphrase === passphrase && network.source === "stellar-rpc" &&
    Number.isSafeInteger(network.ledger_sequence) &&
    Number(network.ledger_sequence) > 0 &&
    typeof network.ledger_closed_at_unix === "string" &&
    /^[0-9]{1,20}$/.test(network.ledger_closed_at_unix);
  const closed = rpcClaim ? Number(network.ledger_closed_at_unix) : NaN;
  const rpcFresh = clockValid && rpcClaim && Number.isSafeInteger(closed) &&
    nowUnix - closed >= -30 && nowUnix - closed <= 180;
  const wrongNetwork = obj(network) && (
    network.network !== "testnet" || network.passphrase !== passphrase ||
    network.source !== "stellar-rpc"
  );
  const readinessValid = obj(ready) && ready.payments === "disabled" &&
    ["ready", "degraded"].includes(String(ready.status)) &&
    ["connected", "unavailable"].includes(String(ready.stellar_rpc)) &&
    ["connected", "unavailable", "not-configured"].includes(String(ready.database)) &&
    (ready.status === "ready") === (
      ready.stellar_rpc === "connected" && ready.database === "connected"
    );
  const dbAvailable = readinessValid && ready.database === "connected";
  const capabilitiesValid = hasFalseFlags(caps, [
    "payments_enabled", "confidential_token_verified",
    "private_payments_verified", "fiat_payouts_enabled"
  ]);
  const catalogValid = obj(catalog) && catalog.product === "StealthBridge" &&
    catalog.network === "testnet" &&
    hasFalseFlags(catalog, ["payment_execution_enabled", "privacy_verified", "mainnet_enabled"]) &&
    Array.isArray(catalog.modules) && catalog.modules.length === 11 &&
    catalog.modules.filter(item => obj(item) && item.availability === "metadata-only").length === 1 &&
    catalog.modules.some(item => obj(item) && item.id === "corridors" && item.availability === "metadata-only") &&
    catalog.modules.every(item => obj(item) && (
      item.id === "corridors" || item.availability === "blocked" || item.availability === "planned"
    ));
  const contractsValid = obj(contracts) &&
    contracts.on_chain_verified === false && contracts.payment_execution_enabled === false &&
    obj(contracts.manifest) && contracts.manifest.network === "testnet" &&
    contracts.manifest.status === "not-deployed" && contracts.manifest.verified === false;
  const unsafe = Boolean(wrongNetwork ||
    (obj(ready) && !readinessValid) ||
    (obj(caps) && !capabilitiesValid) ||
    (obj(catalog) && !catalogValid) ||
    (obj(contracts) && !contractsValid));
  const checks: DeveloperCheck[] = [
    result("network", wrongNetwork ? "unsafe" : rpcFresh ? "observed" : "unavailable",
      rpcFresh ? "Fresh public Stellar Testnet ledger" : "Fresh Testnet RPC identity and ledger not confirmed"),
    result("database", obj(ready) && !readinessValid ? "unsafe" : dbAvailable ? "observed" : "unavailable",
      dbAvailable ? "Backend reported connected dependencies; not payment readiness" : "Backend dependency readiness not confirmed"),
    result("product-catalog", obj(catalog) && !catalogValid ? "unsafe" : catalogValid ? "observed" : "unavailable",
      catalogValid ? "Product inventory received; only corridor metadata is discoverable" : "Safe product module inventory not confirmed"),
    result("soroban", obj(contracts) && !contractsValid ? "unsafe" : contractsValid ? "observed" : "unavailable",
      contractsValid ? "Soroban source inventory is explicitly not deployed" : "Safe undeployed Soroban inventory not confirmed"),
    result("execution", obj(caps) && !capabilitiesValid ? "unsafe" : capabilitiesValid ? "observed" : "unavailable",
      capabilitiesValid ? "Payment, confidential rails and fiat payout remain disabled" : "Financial execution denial not confirmed"),
  ];
  return {
    verdict: unsafe ? "unsafe-claim" :
      rpcFresh && dbAvailable && catalogValid && contractsValid && capabilitiesValid ?
        "read-only-ready" : "degraded",
    checks,
    wallet_signing_enabled: false,
    funds_movement_enabled: false,
    fiat_payouts_enabled: false,
  };
}
