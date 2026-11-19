/**
 * Pure offline SEP-23 / CAP-84 Stellar StrKey validation and parsing.
 * Supports G... (Ed25519 account), C... (Soroban contract),
 * M... (muxed classic account), and W... (CAP-84 muxed contract).
 * No network requests, wallet permissions, private keys, or address persistence.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const VERSION_G = 6 << 3;
const VERSION_C = 2 << 3;
const VERSION_M = 12 << 3;
const VERSION_W = 22 << 3;
const G_ACCOUNT = /^G[A-Z2-7]{55}$/;
const C_CONTRACT = /^C[A-Z2-7]{55}$/;
const M_MUXED_ACCOUNT = /^M[A-Z2-7]{68}$/;
const W_MUXED_CONTRACT = /^W[A-Z2-7]{68}$/;

export type StellarAddressKind =
  | "classic"
  | "muxed-classic"
  | "contract"
  | "muxed-contract";

export interface ParsedStellarAddress {
  address: string;
  kind: StellarAddressKind;
  baseAddress: string;
  muxedId: string | null;
}

function crc16XModem(bytes: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]! << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

function decodeStrKey(address: string, expectedVersion: number, payloadLength: number): Uint8Array | null {
  const totalBytes = 1 + payloadLength + 2;
  const decoded = new Uint8Array(totalBytes);
  let accumulator = 0;
  let bits = 0;
  let offset = 0;
  for (const char of address) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) return null;
    accumulator = (accumulator << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      if (offset >= totalBytes) return null;
      decoded[offset++] = (accumulator >>> bits) & 0xff;
      accumulator &= (1 << bits) - 1;
    }
  }
  const expectedUnusedBits = (address.length * 5) % 8;
  // CAP-84 / SEP-23 require unused Base32 trailing bits to be zero for unique encoding.
  if (offset !== totalBytes || bits !== expectedUnusedBits || accumulator !== 0) return null;
  if (decoded[0] !== expectedVersion) return null;
  const crcOffset = totalBytes - 2;
  const expectedCrc = crc16XModem(decoded.subarray(0, crcOffset));
  const actualCrc = decoded[crcOffset]! | (decoded[crcOffset + 1]! << 8);
  return actualCrc === expectedCrc ? decoded.subarray(1, 1 + payloadLength) : null;
}

function encodeStrKey32(version: number, payload32: Uint8Array): string {
  const raw = new Uint8Array(35);
  raw[0] = version;
  raw.set(payload32, 1);
  const crc = crc16XModem(raw.subarray(0, 33));
  raw[33] = crc & 0xff;
  raw[34] = (crc >>> 8) & 0xff;
  let out = "";
  let accumulator = 0;
  let bits = 0;
  for (const byte of raw) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(accumulator >>> bits) & 31]!;
    }
  }
  return out;
}

function readUint64Be(bytes: Uint8Array): string {
  const shift = BigInt(8);
  let id = BigInt(0);
  for (let i = 0; i < 8; i++) {
    id = (id << shift) | BigInt(bytes[i]!);
  }
  return id.toString();
}

export function canonicalStellarAccountAddress(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const address = raw.trim().toUpperCase();
  if (!G_ACCOUNT.test(address)) return null;
  return decodeStrKey(address, VERSION_G, 32) ? address : null;
}

export function canonicalMuxedAccountAddress(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const address = raw.trim().toUpperCase();
  if (!M_MUXED_ACCOUNT.test(address)) return null;
  return decodeStrKey(address, VERSION_M, 40) ? address : null;
}

export function canonicalMuxedContractAddress(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const address = raw.trim().toUpperCase();
  if (!W_MUXED_CONTRACT.test(address)) return null;
  return decodeStrKey(address, VERSION_W, 40) ? address : null;
}

export function parseStellarAddress(raw: unknown): ParsedStellarAddress | null {
  if (typeof raw !== "string" || raw.length > 128) return null;
  const address = raw.trim().toUpperCase();
  if (G_ACCOUNT.test(address) && decodeStrKey(address, VERSION_G, 32)) {
    return { address, kind: "classic", baseAddress: address, muxedId: null };
  }
  if (C_CONTRACT.test(address) && decodeStrKey(address, VERSION_C, 32)) {
    return { address, kind: "contract", baseAddress: address, muxedId: null };
  }
  if (M_MUXED_ACCOUNT.test(address)) {
    const payload = decodeStrKey(address, VERSION_M, 40);
    if (!payload) return null;
    return {
      address,
      kind: "muxed-classic",
      baseAddress: encodeStrKey32(VERSION_G, payload.subarray(0, 32)),
      muxedId: readUint64Be(payload.subarray(32, 40)),
    };
  }
  if (W_MUXED_CONTRACT.test(address)) {
    const payload = decodeStrKey(address, VERSION_W, 40);
    if (!payload) return null;
    return {
      address,
      kind: "muxed-contract",
      baseAddress: encodeStrKey32(VERSION_C, payload.subarray(0, 32)),
      muxedId: readUint64Be(payload.subarray(32, 40)),
    };
  }
  return null;
}
