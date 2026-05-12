function decodeB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toB64(u8: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptNote(plaintext: string): Promise<string> {
  const b64 = Deno.env.get("BISHOP_NOTES_AES_KEY");
  if (!b64) throw new Error("BISHOP_NOTES_AES_KEY not set");
  const raw = decodeB64(b64);
  if (raw.byteLength !== 16 && raw.byteLength !== 24 && raw.byteLength !== 32) {
    throw new Error("BISHOP_NOTES_AES_KEY must be 16, 24, or 32 bytes (base64)");
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesKey(raw);
  const enc = new TextEncoder().encode(plaintext);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc),
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return toB64(combined);
}

export async function decryptNote(payloadB64: string): Promise<string> {
  const b64 = Deno.env.get("BISHOP_NOTES_AES_KEY");
  if (!b64) throw new Error("BISHOP_NOTES_AES_KEY not set");
  const raw = decodeB64(b64);
  const key = await importAesKey(raw);
  const combined = decodeB64(payloadB64);
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ct,
  );
  return new TextDecoder().decode(pt);
}
