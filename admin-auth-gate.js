import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const bootEl = document.getElementById("admin-boot");
window.__adminBooted = false;

function fail(msg) {
  window.__adminBooted = true;
  if (!bootEl) return;
  bootEl.innerHTML =
    '<div class="alert-warn" style="max-width:360px;margin:0 auto;text-align:left">' +
    msg +
    '<br><br><button type="button" id="admin-boot-retry" style="margin-right:0.75rem;font-weight:700">再試一次</button><a href="admin-login.html?v=89" style="color:var(--color-primary);font-weight:700">返回登入頁</a></div>';
  bootEl.querySelector("#admin-boot-retry")?.addEventListener("click", () => {
    window.location.reload();
  });
}

function setLoading(message, percent, subtext) {
  if (!bootEl) return;
  bootEl.innerHTML = `
    <div class="loading-card" style="--loading-progress:${percent}%">
      <div class="loading-row">
        <div class="loading-spinner" aria-hidden="true"></div>
        <div class="loading-copy">
          <strong>${message}</strong>
          <span>${subtext || "請稍候"}</span>
        </div>
        <div class="loading-percent">${percent}%</div>
      </div>
      <div class="loading-progress"><span class="loading-progress-bar"></span></div>
    </div>`;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ]);
}

function loginUrl_() {
  return new URL("admin-login.html?v=89", window.location.href).href;
}

function getOrInitAuth(app) {
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
}

function warmAdminBundles_() {
  const files = ["./admin-app.js", "./firebase-api.js", "./shared.js", "./timeline.js"];
  for (const file of files) {
    const url = new URL(file, import.meta.url);
    url.searchParams.set("v", "89");
    const link = document.createElement("link");
    link.rel = "modulepreload";
    link.href = url.href;
    document.head.appendChild(link);
  }
}

async function start() {
  // Warm cache only — do not evaluate admin-app until auth is confirmed.
  warmAdminBundles_();

  try {
    if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
      throw new Error("Firebase 設定不完整");
    }

    setLoading("檢查登入…", 30, "連接帳戶");
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getOrInitAuth(app);

    await withTimeout(auth.authStateReady(), 5000, "登入檢查逾時，請重新登入");
    const user = auth.currentUser;

    if (!user) {
      setLoading("前往登入頁…", 70, "尚未登入");
      window.location.replace(loginUrl_());
      return;
    }

    setLoading("載入後台…", 70, "準備 Dashboard");
    const appUrl = new URL("./admin-app.js", import.meta.url);
    appUrl.searchParams.set("v", "89");
    await withTimeout(import(appUrl.href), 12000, "後台腳本載入逾時，請重新整理");
  } catch (err) {
    fail("載入失敗：" + (err?.message || "請重新整理"));
  }
}

start();
