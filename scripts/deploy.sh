#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 檢查 Firebase 登入..."
if ! npx firebase-tools projects:list --project aia-as-bd7e3 >/dev/null 2>&1; then
  echo "請先登入 Firebase CLI："
  echo "  npx firebase-tools login"
  exit 1
fi

echo "==> 設定 email Secret（若未設定）..."
if ! npx firebase-tools functions:secrets:access SMTP_PASS --project aia-as-bd7e3 >/dev/null 2>&1; then
  echo "請輸入 aiaagentbookingas@gmail.com 的 App Password："
  read -rs SMTP_PASS_INPUT
  printf '%s' "$SMTP_PASS_INPUT" | npx firebase-tools functions:secrets:set SMTP_PASS --project aia-as-bd7e3
  echo ""
fi

echo "==> 部署 Firestore rules、Hosting、Functions..."
npx firebase-tools deploy --only firestore:rules,hosting,functions --project aia-as-bd7e3

echo ""
echo "完成！網站："
echo "  https://aia-as-bd7e3.web.app"
echo "  https://aia-as-bd7e3.firebaseapp.com"
