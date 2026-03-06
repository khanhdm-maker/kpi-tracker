# KPI Performance Tracker 2026

React + Vite app — tracks monthly & daily revenue, cost, profit vs KPI targets.

## 🚀 Deploy to Cloudflare Pages (step-by-step)

### Bước 1 — Push lên GitHub

```bash
git init
git add .
git commit -m "init: KPI Tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kpi-tracker.git
git push -u origin main
```

### Bước 2 — Connect Cloudflare Pages

1. Vào **dash.cloudflare.com** → **Workers & Pages** → **Create application** → **Pages**
2. Chọn **Connect to Git** → Authorize GitHub → chọn repo `kpi-tracker`
3. Cấu hình build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Click **Save and Deploy** → chờ ~1 phút là xong ✅

### Bước 3 — Auto-deploy

Mỗi lần bạn `git push`, Cloudflare Pages tự động build & deploy lại.

## 🛠 Local development

```bash
npm install
npm run dev
```
