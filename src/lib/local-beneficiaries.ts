import { parseStellarAddress } from "./stellar-address.ts";

export interface LocalBeneficiary {
  address: string;
  label: string;
  savedAtUnix: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_PREFIX = "sb:beneficiaries:v1:";
const MAX_BENEFICIARIES = 25;
const MAX_LABEL_LENGTH = 48;

function resolveStorage(override?: StorageLike | null): StorageLike | null {
  if (override !== undefined) return override;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function storageKey(ownerAddress: string): string | null {
  const parsed = parseStellarAddress(ownerAddress);
  if (!parsed) return null;
  return `${STORAGE_PREFIX}${parsed.address}`;
}

function sanitizeLabel(label: string): string {
  return label.replace(/[\r\n\t]+/g, " ").trim().slice(0, MAX_LABEL_LENGTH);
}

/**
 * Loads recipient addresses saved only on this browser for a given signed-in wallet.
 * Never transmitted to StealthBridge or treated as identity verification.
 */
export function loadLocalBeneficiaries(
  ownerAddress: string,
  storage?: StorageLike | null,
): LocalBeneficiary[] {
  const key = storageKey(ownerAddress);
  const store = resolveStorage(storage);
  if (!key || !store) return [];
  try {
    const raw = store.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid: LocalBeneficiary[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const rec = item as Record<string, unknown>;
      if (typeof rec.address !== "string") continue;
      const addr = parseStellarAddress(rec.address);
      if (!addr || seen.has(addr.address)) continue;
      const cleanLabel =
        typeof rec.label === "string" ? sanitizeLabel(rec.label) : "";
      const savedAtUnix =
        typeof rec.savedAtUnix === "number" &&
        Number.isSafeInteger(rec.savedAtUnix) &&
        rec.savedAtUnix > 0
          ? rec.savedAtUnix
          : 0;
      seen.add(addr.address);
      valid.push({
        address: addr.address,
        label: cleanLabel || `${addr.address.slice(0, 6)}…${addr.address.slice(-4)}`,
        savedAtUnix,
      });
      if (valid.length >= MAX_BENEFICIARIES) break;
    }
    return valid;
  } catch {
    return [];
  }
}

export function saveLocalBeneficiary(
  ownerAddress: string,
  recipientAddress: string,
  label: string,
  storage?: StorageLike | null,
): LocalBeneficiary[] {
  const key = storageKey(ownerAddress);
  const store = resolveStorage(storage);
  const parsedRecipient = parseStellarAddress(recipientAddress);
  if (!key || !store || !parsedRecipient) {
    return loadLocalBeneficiaries(ownerAddress, store);
  }
  const cleanLabel =
    sanitizeLabel(label) ||
    `${parsedRecipient.address.slice(0, 6)}…${parsedRecipient.address.slice(-4)}`;
  const existing = loadLocalBeneficiaries(ownerAddress, store).filter(
    (entry) => entry.address !== parsedRecipient.address,
  );
  const next: LocalBeneficiary[] = [
    {
      address: parsedRecipient.address,
      label: cleanLabel,
      savedAtUnix: Math.floor(Date.now() / 1000),
    },
    ...existing,
  ].slice(0, MAX_BENEFICIARIES);
  try {
    store.setItem(key, JSON.stringify(next));
  } catch {
    return existing;
  }
  return next;
}

export function removeLocalBeneficiary(
  ownerAddress: string,
  recipientAddress: string,
  storage?: StorageLike | null,
): LocalBeneficiary[] {
  const key = storageKey(ownerAddress);
  const store = resolveStorage(storage);
  if (!key || !store) return [];
  const next = loadLocalBeneficiaries(ownerAddress, store).filter(
    (entry) => entry.address !== recipientAddress.trim(),
  );
  try {
    if (next.length === 0) {
      store.removeItem(key);
    } else {
      store.setItem(key, JSON.stringify(next));
    }
  } catch {
    return next;
  }
  return next;
}
