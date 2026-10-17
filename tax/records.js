import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { firebaseConfig } from "../firebase-config.js";

const COLLECTION = "tax_calculations";
const recordsConfig = {
  apiKey: "AIzaSyBS2a0sbZrj4tXLzw9fihI72aQ4Lhl60FQ",
  authDomain: "aia-as.firebaseapp.com",
  projectId: "aia-as",
  storageBucket: "aia-as.firebasestorage.app",
  messagingSenderId: "1067649874122",
  appId: "1:1067649874122:web:107e342004699b32d91c33",
};

function recordsApp() {
  return getApps().find((item) => item.name === "tax-records") || initializeApp(recordsConfig, "tax-records");
}

function authApp() {
  return getApps().find((item) => item.name === "[DEFAULT]") || initializeApp(firebaseConfig);
}

function db() {
  return getFirestore(recordsApp());
}

function whole(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number));
}

export async function saveTaxCalculation(input) {
  const payload = {
    kind: input.kind === "treasure" ? "treasure" : "salary",
    job: String(input.job || "未填").slice(0, 40),
    mode: input.mode === "annual" ? "annual" : "monthly",
    method: input.method === "standard" ? "standard" : "progressive",
    gross: whole(input.gross),
    mpf: whole(input.mpf),
    allowance: whole(input.allowance),
    chargeable: whole(input.chargeable),
    tax: whole(input.tax),
    provisional: whole(input.provisional),
    firstInstalment: whole(input.firstInstalment),
    secondInstalment: whole(input.secondInstalment),
    annuity: whole(input.annuity),
    vhis: whole(input.vhis),
    tvc: whole(input.tvc),
    vhisPeople: Math.min(9, Math.max(1, whole(input.vhisPeople) || 1)),
    taxAfter: whole(input.taxAfter ?? input.tax),
    savedAmount: whole(input.savedAmount),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db(), COLLECTION), payload);
  return ref.id;
}

export function watchAuth(callback) {
  return onAuthStateChanged(getAuth(authApp()), callback);
}

export async function listTaxCalculations() {
  const snap = await getDocs(query(collection(db(), COLLECTION), orderBy("createdAt", "desc"), limit(100)));
  return snap.docs.map((item) => {
    const data = item.data();
    const created = data.createdAt?.toDate?.();
    return {
      id: item.id,
      ...data,
      createdAtIso: created ? created.toISOString() : "",
    };
  });
}

export async function deleteTaxCalculation(id) {
  await deleteDoc(doc(db(), COLLECTION, id));
}
