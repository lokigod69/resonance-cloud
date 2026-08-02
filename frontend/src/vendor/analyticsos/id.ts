/** VENDORED from analytics-os @ b53d154 (2026-08-02). Do NOT hand-edit. */

/**
 * Default anonymous/session id generator. Uses the platform's WebCrypto
 * randomUUID when available (Node >=19, all evergreen browsers); falls back
 * to a non-cryptographic id so capture never fails to initialize over this.
 */
export function defaultRandomId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Namespace UUID for `deterministicUuid` (RFC 4122 §4.3 UUIDv5 namespace
 * slot). Pinned so the same seed always yields the same id across every
 * caller in the portfolio.
 */
const DETERMINISTIC_UUID_NAMESPACE = "aa051cc0-31a5-45f2-8de9-2f47f7f5f5aa";

function uuidStringToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Number.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToUuidString(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * RFC 3174 SHA-1, pure TypeScript. No `node:crypto` import — this package
 * also runs in browsers — so `deterministicUuid` can stay synchronous
 * instead of requiring `crypto.subtle.digest`'s async WebCrypto API.
 */
function sha1(bytes: Uint8Array): Uint8Array {
  const h = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);

  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen >>> 0);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));

  const w = new Uint32Array(80);
  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(chunk + i * 4);
    }
    for (let i = 16; i < 80; i++) {
      const v = w[i - 3]! ^ w[i - 8]! ^ w[i - 14]! ^ w[i - 16]!;
      w[i] = (v << 1) | (v >>> 31);
    }

    let a = h[0]!;
    let b = h[1]!;
    let c = h[2]!;
    let d = h[3]!;
    let e = h[4]!;
    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]!) >>> 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = temp;
    }

    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
  }

  const digest = new Uint8Array(20);
  const digestView = new DataView(digest.buffer);
  for (let i = 0; i < 5; i++) {
    digestView.setUint32(i * 4, h[i]!);
  }
  return digest;
}

/**
 * Deterministic UUIDv5-style id: SHA-1 of (namespace bytes + seed bytes),
 * with version/variant bits set per RFC 4122 §4.3, namespaced to
 * `DETERMINISTIC_UUID_NAMESPACE`. The same seed always yields the same
 * UUID; different seeds yield different UUIDs (birthday-bound collision
 * odds, same as any UUIDv5).
 *
 * Intended for idempotent event ids — e.g. `deterministicUuid("conversion:" + purchaseId)`
 * — so a webhook replay derives the same `uuid` and PostHog's same-day/
 * same-team dedup on that top-level field absorbs the duplicate.
 */
export function deterministicUuid(seed: string): string {
  const namespaceBytes = uuidStringToBytes(DETERMINISTIC_UUID_NAMESPACE);
  const nameBytes = new TextEncoder().encode(seed);
  const input = new Uint8Array(namespaceBytes.length + nameBytes.length);
  input.set(namespaceBytes);
  input.set(nameBytes, namespaceBytes.length);

  const digest = sha1(input);
  const bytes = digest.slice(0, 16);

  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant RFC 4122

  return bytesToUuidString(bytes);
}
