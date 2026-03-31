import S from './state.js';

const MAGIC = new Uint8Array([0x44, 0x57, 0x53, 0x31]); // DWS1
const HEADER_LEN = 14;

/** Serialized `sil` query value and layout key it belongs to (kept in sync with address bar). */
let cachedSilParam = null;
let cachedSilLayoutKey = null;

function layoutKeyFromDom() {
  const vcw = document.getElementById('variableColWidth');
  return [
    (document.getElementById('name1')?.value || '').trim(),
    (document.getElementById('name2')?.value || '').trim(),
    document.getElementById('fnt1')?.value || '',
    document.getElementById('fnt2')?.value || '',
    String(S.CELL),
    S.padChar,
    vcw && vcw.checked ? '1' : '0',
  ].join('\x1e');
}

export function syncSilCacheFromLocation() {
  const p = new URLSearchParams(window.location.search);
  const sil = p.get('sil');
  if (sil) {
    cachedSilParam = sil;
    cachedSilLayoutKey = null;
  }
}

export function onSilAppliedFromUrl() {
  cachedSilLayoutKey = layoutKeyFromDom();
}

export function updateSilCacheAfterShare(encodedSil) {
  cachedSilParam = encodedSil;
  cachedSilLayoutKey = layoutKeyFromDom();
}

export function invalidateSilCache() {
  cachedSilParam = null;
  cachedSilLayoutKey = null;
}

/** Append `sil` to params if it still matches current layout (or not yet bound after load). */
export function appendSilParamIfValid(p) {
  if (!cachedSilParam) return;
  const key = layoutKeyFromDom();
  if (cachedSilLayoutKey != null && key !== cachedSilLayoutKey) {
    invalidateSilCache();
    return;
  }
  p.set('sil', cachedSilParam);
}

let pendingSilParam = null;

export function setPendingSilFromSearchParams(searchParams) {
  pendingSilParam = searchParams.get('sil') || null;
}

function bytesToBase64Url(u8) {
  const CHUNK = 0x8000;
  let s = '';
  for (let i = 0; i < u8.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
  }
  const b64 = btoa(s);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str) {
  let b = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deflateRaw(raw) {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'));
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

async function inflateRaw(deflated) {
  if (typeof DecompressionStream === 'undefined') return null;
  const stream = new Blob([deflated]).stream().pipeThrough(new DecompressionStream('deflate'));
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

export function canEncodeSilUrl() {
  return typeof CompressionStream !== 'undefined';
}

/**
 * Encode both silhouettes for a share URL. Returns null if compression unsupported or no data.
 */
export async function encodeSilForShare() {
  if (!canEncodeSilUrl() || !S.sil1?.length || !S.sil2?.length) return null;
  const len1 = S.sil1.length;
  const len2 = S.sil2.length;
  const raw = new Uint8Array(len1 + len2);
  raw.set(S.sil1, 0);
  raw.set(S.sil2, len1);
  const deflated = await deflateRaw(raw);
  if (!deflated) return null;
  const header = new Uint8Array(HEADER_LEN);
  header.set(MAGIC, 0);
  const dv = new DataView(header.buffer);
  dv.setUint16(4, 1, false);
  dv.setUint32(6, len1, false);
  dv.setUint32(10, len2, false);
  const out = new Uint8Array(HEADER_LEN + deflated.length);
  out.set(header, 0);
  out.set(deflated, HEADER_LEN);
  return bytesToBase64Url(out);
}

async function decodeSilPayload(b64) {
  const all = base64UrlToBytes(b64);
  if (all.length < HEADER_LEN) return null;
  for (let i = 0; i < 4; i++) {
    if (all[i] !== MAGIC[i]) return null;
  }
  const dv = new DataView(all.buffer, all.byteOffset, HEADER_LEN);
  const ver = dv.getUint16(4, false);
  if (ver !== 1) return null;
  const len1 = dv.getUint32(6, false);
  const len2 = dv.getUint32(10, false);
  const deflated = all.subarray(HEADER_LEN);
  const inflated = await inflateRaw(deflated);
  if (!inflated || inflated.length !== len1 + len2) return null;
  return {
    len1,
    len2,
    sil1: inflated.subarray(0, len1),
    sil2: inflated.subarray(len1),
  };
}

/**
 * If a `sil` URL param is pending and lengths match current buffers, copy into S and clear pending.
 * @returns {boolean}
 */
export async function tryApplyPendingSilFromUrl() {
  if (!pendingSilParam || !S.sil1?.length || !S.sil2?.length) return false;
  if (typeof DecompressionStream === 'undefined') {
    pendingSilParam = null;
    invalidateSilCache();
    return false;
  }
  try {
    const rawParam = pendingSilParam;
    const decoded = await decodeSilPayload(rawParam);
    pendingSilParam = null;
    if (!decoded) {
      invalidateSilCache();
      return false;
    }
    if (decoded.len1 !== S.sil1.length || decoded.len2 !== S.sil2.length) {
      invalidateSilCache();
      return false;
    }
    S.sil1.set(decoded.sil1);
    S.sil2.set(decoded.sil2);
    cachedSilParam = rawParam;
    onSilAppliedFromUrl();
    return true;
  } catch (e) {
    console.warn('[url-sil] decode failed', e);
    pendingSilParam = null;
    invalidateSilCache();
    return false;
  }
}
