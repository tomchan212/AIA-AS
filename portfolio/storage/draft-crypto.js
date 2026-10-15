export async function encryptJson(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { iv: Array.from(iv), cipher: Array.from(new Uint8Array(cipher)) };
}

export async function decryptJson(key, payload) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
    key,
    new Uint8Array(payload.cipher)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}
