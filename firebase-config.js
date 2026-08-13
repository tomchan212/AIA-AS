function resolveAuthDomain(fallback) {
  // Same-origin authDomain is required for Google redirect/popup login when
  // browsers block third-party storage (Chrome/Safari/Firefox).
  // App is hosted on *.web.app; using *.firebaseapp.com here causes blank /
  // white-screen returns after Google sign-in.
  try {
    const host = globalThis.location?.hostname;
    if (host === "aia-as-bd7e3.web.app" || host === "aia-as-bd7e3.firebaseapp.com") {
      return host;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export const firebaseConfig = {
  apiKey: "AIzaSyC5RJCi0hwJ6U6CIy074raGmWxTi-j91nc",
  authDomain: resolveAuthDomain("aia-as-bd7e3.web.app"),
  projectId: "aia-as-bd7e3",
  storageBucket: "aia-as-bd7e3.firebasestorage.app",
  messagingSenderId: "1080457864530",
  appId: "1:1080457864530:web:7b50c1febd1dc07a3f468b",
};
