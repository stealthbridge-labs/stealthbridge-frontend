/**
 * Check a classic Stellar G... public-account StrKey locally.
 * Implements Stellar's version byte and CRC16-XModem checksum; no network
 * requests, wallet permissions, private keys, or address persistence.
 * Muxed M... addresses and C... contract IDs are intentionally excluded.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const G_ACCOUNT = /^G[A-Z2-7]{55}$/;

export function canonicalStellarAccountAddress(raw: string): string | null {
  const address = raw.trim().toUpperCase();
  if (!G_ACCOUNT.test(address)) return null;
  const decoded = new Uint8Array(35);
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
      if (offset >= decoded.length) return null;
      decoded[offset++] = (accumulator >>> bits) & 0xff;
      accumulator &= (1 << bits) - 1;
    }
  }
  if (offset !== 35 || bits !== 0 || decoded[0] !== 6 << 3) return null;
  let crc = 0;
  for (let i = 0; i < 33; i++) {
    crc ^= decoded[i] << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return (decoded[33] | decoded[34] << 8) === crc ? address : null;
}
