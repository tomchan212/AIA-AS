import { decryptJson, encryptJson } from "./draft-crypto.js";

const KEY_DB = "aia-portfolio-key";
const DRAFT_DB = "aia-portfolio-draft";

function openDb(name, store) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbSet(db, store, key, value) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readwrite").objectStore(store).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function draftKey() {
  const db = await openDb(KEY_DB, "keys");
  const existing = await idbGet(db, "keys", "draft");
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await idbSet(db, "keys", "draft", key);
  return key;
}

export async function loadDraft() {
  const key = await draftKey();
  const db = await openDb(DRAFT_DB, "drafts");
  const payload = await idbGet(db, "drafts", "current");
  if (!payload) return null;
  return decryptJson(key, payload);
}

export async function saveDraft(draft) {
  const key = await draftKey();
  const db = await openDb(DRAFT_DB, "drafts");
  await idbSet(db, "drafts", "current", await encryptJson(key, draft));
}

export async function clearDraft() {
  const draftDb = await openDb(DRAFT_DB, "drafts");
  await new Promise((resolve, reject) => {
    const request = draftDb.transaction("drafts", "readwrite").objectStore("drafts").delete("current");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
