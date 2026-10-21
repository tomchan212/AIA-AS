import type { ScorePoint } from "@/types";

const ITERATIONS = 120_000;

function bytesToBase64(bytes: Uint8Array) {
  let text = "";
  bytes.forEach((value) => { text += String.fromCharCode(value); });
  return btoa(text);
}

function base64ToBytes(value: string) {
  const text = atob(value);
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index);
  return bytes;
}

function bufferOf(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function keyFromPassphrase(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: bufferOf(salt), iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptHistory(passphrase: string, history: ScorePoint[]) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFromPassphrase(passphrase, salt);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: bufferOf(iv) }, key, new TextEncoder().encode(JSON.stringify(history)));
  return {
    kind: "pyramid-score-history",
    v: 1,
    kdf: "PBKDF2-SHA-256",
    iterations: ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    cipher: bytesToBase64(new Uint8Array(cipher)),
  };
}

export async function decryptHistory(passphrase: string, file: unknown): Promise<ScorePoint[]> {
  if (!file || typeof file !== "object") throw new Error("unreadable");
  const payload = file as { kind?: string; salt?: string; iv?: string; cipher?: string };
  if (payload.kind !== "pyramid-score-history" || !payload.salt || !payload.iv || !payload.cipher) throw new Error("unreadable");
  const key = await keyFromPassphrase(passphrase, base64ToBytes(payload.salt));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bufferOf(base64ToBytes(payload.iv)) }, key, bufferOf(base64ToBytes(payload.cipher)));
  const history = JSON.parse(new TextDecoder().decode(plain)) as ScorePoint[];
  if (!Array.isArray(history)) throw new Error("unreadable");
  return history.filter((point) => point && typeof point.at === "string" && typeof point.score === "number");
}
