import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const bootEl = document.getElementById("admin-boot");
window.__adminBooted = false;

function fail(msg) {
  window.__adminBooted = true;
  if (!bootEl) return;
  bootEl.innerHTML =
    '<div class="alert-warn" style="max-width:360px;margin:0 auto;text-align:left">' +
    msg +
    '<br><br><button type="button" id="admin-boot-retry" style="margin-right:0.75rem;font-weight:700">再試一次</button><a href="admin-login.html?v=77" style="color:var(--color-primary);font-weight:700">返回登入頁</a></div>';
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
  return new URL("admin-login.html?v=77", window.location.href).href;
}

async function start() {
  try {
    if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
      throw new Error("Firebase 設定不完整");
    }

    setLoading("連接 Firebase…", 25, "讀取專案設定");
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);

    setLoading("檢查登入狀態…", 45, "確認目前帳戶");

    await withTimeout(auth.authStateReady(), 7000, "登入檢查逾時，請重新登入");
    const user = auth.currentUser;

    if (!user) {
      setLoading("前往登入頁…", 70, "尚未登入");
      window.location.replace(loginUrl_());
      return;
    }

    setLoading("載入後台…", 70, "準備 Dashboard");
    window.__adminBooted = true;
    await import(new URL("./admin-app.js", import.meta.url).href);
  } catch (err) {
    fail("載入失敗：" + (err?.message || "請重新整理"));
  }
}

start();
