const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineString, defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

const smtpHost = defineString("SMTP_HOST", { default: "smtp.gmail.com" });
const smtpPort = defineString("SMTP_PORT", { default: "587" });
const smtpUser = defineString("SMTP_USER");
const smtpPass = defineSecret("SMTP_PASS");
const notifyTo = defineString("NOTIFY_TO");
const notifyFrom = defineString("NOTIFY_FROM", { default: "" });

function looksLikeEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function buildAdminEmail_(data) {
  const lines = [
    "你有新的預約：",
    "",
    `代碼：${data.code || "-"}`,
    `日期：${data.date || "-"}`,
    `時間：${data.start || "-"} - ${data.end || "-"}`,
    `姓名：${data.name || "-"}`,
    `聯絡：${data.contact || "-"}`,
    `地區：${data.district || "-"}`,
    `狀態：${data.status || "-"}`,
    "",
    "— AIA 預約系統",
  ];
  return {
    subject: `[AIA 預約] 新預約 - ${data.name || "客戶"} (${data.date || ""} ${data.start || ""})`,
    text: lines.join("\n"),
    html: lines.map((line) => `<p>${line || "&nbsp;"}</p>`).join(""),
  };
}

function buildCustomerEmail_(data) {
  const lines = [
    `${data.name || "您好"}，`,
    "",
    "你的預約已成功提交，詳情如下：",
    "",
    `預約代碼：${data.code || "-"}`,
    `日期：${data.date || "-"}`,
    `時間：${data.start || "-"} - ${data.end || "-"}`,
    `地區：${data.district || "-"}`,
    "",
    "請保存此代碼以便日後查詢預約。",
    "",
    "— AIA 預約系統",
  ];
  return {
    subject: `[AIA 預約確認] ${data.date || ""} ${data.start || ""}`,
    text: lines.join("\n"),
    html: lines.map((line) => `<p>${line || "&nbsp;"}</p>`).join(""),
  };
}

function createTransporter_() {
  const user = smtpUser.value();
  const pass = smtpPass.value();
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: smtpHost.value(),
    port: Number(smtpPort.value()),
    secure: Number(smtpPort.value()) === 465,
    auth: { user, pass },
  });
}

exports.sendAppointmentEmail = onDocumentCreated(
  {
    document: "appointments/{appointmentId}",
    region: "asia-east1",
    secrets: [smtpPass],
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const adminEmail = notifyTo.value();
    const transporter = createTransporter_();
    if (!transporter || !adminEmail) {
      console.warn("Email skipped: set SMTP_USER, SMTP_PASS, NOTIFY_TO.");
      return;
    }

    const from = notifyFrom.value() || smtpUser.value();
    const adminMail = buildAdminEmail_(data);

    await transporter.sendMail({
      from,
      to: adminEmail,
      subject: adminMail.subject,
      text: adminMail.text,
      html: adminMail.html,
    });

    const customerEmail = looksLikeEmail_(data.contact) ? String(data.contact).trim() : "";
    if (customerEmail) {
      const customerMail = buildCustomerEmail_(data);
      await transporter.sendMail({
        from,
        to: customerEmail,
        subject: customerMail.subject,
        text: customerMail.text,
        html: customerMail.html,
      });
    }
  }
);
