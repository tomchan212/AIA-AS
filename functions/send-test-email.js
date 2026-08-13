/**
 * 本地測試寄信（不需部署 Cloud Functions）
 *
 * 用法：
 *   cd functions
 *   SMTP_PASS=你的Gmail應用程式密碼 node send-test-email.js
 *
 * 或先建立 functions/.env（參考 .env.example），再執行：
 *   node send-test-email.js
 */
require("dotenv").config();
const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const NOTIFY_TO = process.env.NOTIFY_TO || "";
const NOTIFY_FROM = process.env.NOTIFY_FROM || (SMTP_USER ? `AIA 預約系統 <${SMTP_USER}>` : "");

async function main() {
  if (!SMTP_USER || !NOTIFY_TO) {
    console.error("請在 functions/.env 設定 SMTP_USER（專用寄信 Gmail）同 NOTIFY_TO（收通知 email）。");
    process.exit(1);
  }
  if (!SMTP_PASS) {
    console.error("缺少 SMTP_PASS（aia-booking@gmail.com 的 Gmail 應用程式密碼）。");
    console.error("請到新 Gmail 帳戶 → 安全性 → 應用程式密碼，建立後再執行：");
    console.error("  SMTP_PASS=xxxx node send-test-email.js");
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const fakeAppointment = {
    code: "AP-TEST-001",
    date: "2026-08-12",
    start: "10:00",
    end: "10:15",
    name: "測試客戶",
    contact: NOTIFY_TO,
    status: "First meet",
  };

  const info = await transporter.sendMail({
    from: NOTIFY_FROM,
    to: NOTIFY_TO,
    subject: `[AIA 預約測試] 新預約 - ${fakeAppointment.name}`,
    text: [
      "這是一封測試 email（AIA 預約系統）。",
      "",
      `代碼：${fakeAppointment.code}`,
      `日期：${fakeAppointment.date}`,
      `時間：${fakeAppointment.start} - ${fakeAppointment.end}`,
      `姓名：${fakeAppointment.name}`,
      `聯絡：${fakeAppointment.contact}`,
      "",
      "若你收到此信，代表 email 通知設定成功。",
    ].join("\n"),
    html: "<p>這是一封<strong>測試 email</strong>（AIA 預約系統）。</p><p>若你收到此信，代表 email 通知設定成功。</p>",
  });

  console.log("已寄出測試 email");
  console.log("  寄件：", SMTP_USER);
  console.log("  收件：", NOTIFY_TO);
  console.log("  Message ID:", info.messageId);
}

main().catch((err) => {
  console.error("寄信失敗:", err.message || err);
  process.exit(1);
});
