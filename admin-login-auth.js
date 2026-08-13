import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  initializeAuth,
  getAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const GOOGLE_REDIRECT_KEY = "aia-admin-google-redirect";
let auth = null;
let redirecting = false;

function mapAuthError(code) {
  const map = {
    "auth/email-already-in-use": "此 Email 已被使用，請直接登入。",
    "auth/invalid-email": "Email 格式不正確。",
    "auth/weak-password": "密碼至少 6 位。",
    "auth/user-not-found": "找不到此帳戶，請先建立管理員。",
    "auth/wrong-password": "密碼錯誤。",
    "auth/invalid-credential": "Email 或密碼錯誤。",
    "auth/operation-not-allowed": "Google / Email 登入尚未啟用。",
    "auth/too-many-requests": "嘗試次數過多，請稍後再試。",
    "auth/network-request-failed": "網絡連線失敗，請檢查網絡後再試。",
    "auth/popup-blocked": "瀏覽器阻擋咗彈窗，請允許彈窗後再試。",
    "auth/popup-closed-by-user": "已取消 Google 登入。",
    "auth/cancelled-popup-request": "Google 登入被中斷，請再試一次。",
    "auth/unauthorized-domain": "此網域未授權 Google 登入。",
    "auth/account-exists-with-different-credential": "此 Email 已用其他方式註冊，請用原本方式登入。",
  };
  return map[code] || "登入失敗，請稍後再試。";
}

function fail(msg) {
  if (window.__authUI?.showLoginError) {
    window.__authUI.showLoginError(msg);
    return;
  }
  const el = document.getElementById("login-error");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden", "auth-msg--status");
  el.classList.add("auth-msg--error");
}

function setStatus(msg) {
  const el = document.getElementById("login-error");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden", "auth-msg--error");
  el.classList.add("auth-msg--status");
}

function goAdmin() {
  if (redirecting) return;
  redirecting = true;
  sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);
  // Full navigation with cache-bust so post-login admin boot is never a stale blank page.
  window.location.replace(`admin.html?v=88&t=${Date.now()}`);
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

async function adminLogin(email, password) {
  try {
    const loginEmail = normalizeLoginEmail(email);
    const cred = await signInWithEmailAndPassword(auth, loginEmail, password);
    goAdmin();
    return { ok: true, user: cred.user };
  } catch (err) {
    return { ok: false, message: mapAuthError(err.code), code: err.code };
  }
}

function normalizeLoginEmail(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("@")) return raw;
  if (raw.toLowerCase() === "admin") return "admin@aia.local";
  return raw;
}

async function adminRegister(email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    goAdmin();
    return { ok: true, user: cred.user };
  } catch (err) {
    return { ok: false, message: mapAuthError(err.code), code: err.code };
  }
}

function shouldPreferRedirect_() {
  return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
}

async function redirectGoogle_(provider) {
  sessionStorage.setItem(GOOGLE_REDIRECT_KEY, "1");
  setStatus("正在跳去 Google 登入…");
  await signInWithRedirect(auth, provider);
  return { ok: true, pending: true };
}

async function adminGoogleLogin() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  provider.addScope("email");
  provider.addScope("profile");

  if (shouldPreferRedirect_()) {
    try {
      return await redirectGoogle_(provider);
    } catch (redirectErr) {
      return {
        ok: false,
        message: mapAuthError(redirectErr.code),
        code: redirectErr.code,
      };
    }
  }

  try {
    setStatus("正在開啟 Google 登入…");
    const cred = await signInWithPopup(auth, provider);
    setStatus("Google 登入成功，進入後台…");
    goAdmin();
    return { ok: true, user: cred.user };
  } catch (err) {
    if (
      err.code === "auth/popup-blocked" ||
      err.code === "auth/popup-closed-by-user" ||
      err.code === "auth/cancelled-popup-request" ||
      err.code === "auth/unauthorized-domain"
    ) {
      try {
        return await redirectGoogle_(provider);
      } catch (redirectErr) {
        return {
          ok: false,
          message: mapAuthError(redirectErr.code),
          code: redirectErr.code,
        };
      }
    }
    return { ok: false, message: mapAuthError(err.code), code: err.code };
  }
}

async function handleRedirectResult() {
  const hadGoogleRedirect = sessionStorage.getItem(GOOGLE_REDIRECT_KEY) === "1";
  if (hadGoogleRedirect) setStatus("正在完成 Google 登入…");

  try {
    const result = await getRedirectResult(auth);
    await auth.authStateReady();

    if (result?.user || (hadGoogleRedirect && auth.currentUser)) {
      setStatus("Google 登入成功，進入後台…");
      goAdmin();
      return;
    }

    if (auth.currentUser) {
      showContinueBanner(auth.currentUser.email || "");
      sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);
      return;
    }

    if (hadGoogleRedirect) {
      fail(
        "Google 登入未完成（常見於瀏覽器封鎖第三方儲存）。請改用 Email/密碼登入，或確認 Firebase authDomain 已設為目前網站網域。"
      );
    }
    sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);
  } catch (err) {
    sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);
    fail(mapAuthError(err.code) || String(err.message || err));
  }
}

function showContinueBanner(email) {
  const el = document.getElementById("login-error");
  if (!el) return;
  el.classList.remove("hidden", "auth-msg--error");
  el.classList.add("auth-msg--status");
  el.innerHTML =
    "已偵測到登入狀態" +
    (email ? `（${email}）` : "") +
    '。<br><button type="button" id="continue-admin-btn" class="btn-cta btn-cta-primary" style="margin-top:0.75rem">進入後台</button>';
  document.getElementById("continue-admin-btn")?.addEventListener("click", goAdmin);
}

async function start() {
  try {
    if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
      fail("Firebase 設定不完整，請重新整理。");
      return;
    }

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getOrInitAuth(app);

    window.__authLogin = adminLogin;
    window.__authRegister = adminRegister;
    window.__authGoogleLogin = adminGoogleLogin;
    window.__authReady = true;

    await handleRedirectResult();
  } catch (err) {
    fail(err?.message || "Firebase SDK 載入失敗，請重新整理頁面。");
  }
}

start();
