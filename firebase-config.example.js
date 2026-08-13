// 複製此檔為 firebase-config.js，並填入 Firebase Console 的專案設定。
// Firebase Console → 專案設定 → 一般 → 你的應用程式 → SDK 設定與配置
//
// 若網站託管在 Firebase Hosting 的 *.web.app，authDomain 請用同一個網域
//（例如 your-project.web.app），唔好用 *.firebaseapp.com，否則 Google 登入
// 喺封鎖第三方儲存嘅瀏覽器會白畫面／登入失敗。
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.web.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
