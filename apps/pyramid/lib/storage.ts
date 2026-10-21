import type { PyramidDraft } from "@/types";

const KEY_DB = "aia-pyramid-key";
const DRAFT_DB = "aia-pyramid-draft";

function openDb(name: string, store: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: string) {
  return new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

function idbSet(db: IDBDatabase, store: string, key: string, value: unknown) {
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(store, "readwrite").objectStore(store).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function draftKey() {
  const db = await openDb(KEY_DB, "keys");
  const existing = await idbGet<CryptoKey>(db, "keys", "draft");
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await idbSet(db, "keys", "draft", key);
  return key;
}

async function encryptJson(key: CryptoKey, value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { iv: Array.from(iv), cipher: Array.from(new Uint8Array(cipher)) };
}

async function decryptJson(key: CryptoKey, payload: { iv: number[]; cipher: number[] }) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
    key,
    new Uint8Array(payload.cipher),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as PyramidDraft;
}

export async function loadDraft() {
  const key = await draftKey();
  const db = await openDb(DRAFT_DB, "drafts");
  const payload = await idbGet<{ iv: number[]; cipher: number[] }>(db, "drafts", "current");
  if (!payload) return null;
  return decryptJson(key, payload);
}

export async function saveDraft(draft: PyramidDraft) {
  const key = await draftKey();
  const db = await openDb(DRAFT_DB, "drafts");
  await idbSet(db, "drafts", "current", await encryptJson(key, draft));
}

export async function clearDraft() {
  const db = await openDb(DRAFT_DB, "drafts");
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction("drafts", "readwrite").objectStore("drafts").delete("current");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
