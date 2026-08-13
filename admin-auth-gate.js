import { initFirebase, getAuthInstance } from "./firebase-api.js";

const bootEl = document.getElementById("admin-boot");
window.__adminBooted = false;

function fail(msg) {
  window.__adminBooted = true;
  if (!bootEl) return;
  bootEl.innerHTML =
    '<div class="alert-warn" style="max-width:360px;margin:0 auto;text-align:left">' +
    msg +
    '<br><br><button type="button" id="admin-boot-retry" style="margin-right:0.75rem;font-weight:700">再試一次</button><a href="admin-login.html?v=88" style="color:var(--color-primary);font-weight:700">返回登入頁</a></div>';
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
  return new URL("admin-login.html?v=88", window.location.href).href;
}

async function start() {
  try {
    setLoading("連接 Firebase…", 25, "讀取專案設定");
    await withTimeout(initFirebase(), 10000, "Firebase 初始化逾時，請重新整理");

    const auth = getAuthInstance();
    if (!auth) throw new Error("Auth 未初始化");

    setLoading("檢查登入狀態…", 45, "確認目前帳戶");
    await withTimeout(auth.authStateReady(), 7000, "登入檢查逾時，請重新登入");
    const user = auth.currentUser;

    if (!user) {
      setLoading("前往登入頁…", 70, "尚未登入");
      window.location.replace(loginUrl_());
      return;
    }

    setLoading("載入後台…", 70, "準備 Dashboard");
    const appUrl = new URL("./admin-app.js", import.meta.url);
    appUrl.searchParams.set("v", "88");
    await import(appUrl.href);
  } catch (err) {
    fail("載入失敗：" + (err?.message || "請重新整理"));
  }
}

start();
