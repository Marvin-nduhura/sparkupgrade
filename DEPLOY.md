# 🚀 BuildSpark — Deployment Guide

## Step 1: Push to GitHub

```bash
# Inside the buildspark folder:
git remote add origin https://github.com/YOUR_USERNAME/buildspark.git
git push -u origin main
```

---

## Step 2: Deploy on Render

### 2a. Create Render account
Go to https://render.com and sign up with GitHub.

### 2b. New Blueprint (deploys everything in render.yaml)
1. Dashboard → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render auto-detects `render.yaml` → creates **web service + PostgreSQL database**
4. Click **Apply**

### 2c. Set Environment Variables in Render Dashboard
Go to your web service → **Environment** tab, add:

| Key | Value |
|-----|-------|
| `NEXTAUTH_URL` | `https://YOUR-APP-NAME.onrender.com` |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` and paste result |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GEMINI_API_KEY` | `AIzaSyAQAb8RN6KuMFcpHWYo7qYfbYydZtRDAWOQJ8WJMx1_XKBlRbjPrwNA` |
| `PESAPAL_CONSUMER_KEY` | `aM9ZpI3jTEs7jkSHZHDQUjxmYKeuxO4f` |
| `PESAPAL_CONSUMER_SECRET` | `5QbYtWixPqRvx0vewbzUO8SB2j8=` |
| `PESAPAL_BASE_URL` | `https://pay.pesapal.com/v3` |
| `PESAPAL_IPN_URL` | `https://YOUR-APP-NAME.onrender.com/api/pesapal/ipn` |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-APP-NAME.onrender.com` |

> `DATABASE_URL` is set **automatically** by Render from your PostgreSQL service.

### 2d. Seed the Database (first deploy only)
After the first deploy succeeds, go to your web service → **Shell** tab:
```bash
npx prisma db seed
```

This creates:
- **Admin**: admin@sparkconst.co.ug / Admin@2024!
- **Site Manager**: manager@sparkconst.co.ug / Manager@2024!
- **Accountant**: accounts@sparkconst.co.ug / Account@2024!
- Sample project + 15 inventory items

---

## Step 3: Configure Google OAuth (for "Continue with Google")

1. Go to https://console.cloud.google.com
2. Create project → **APIs & Services** → **Credentials**
3. Create **OAuth 2.0 Client ID** (Web application)
4. Authorized redirect URIs:
   - `https://YOUR-APP-NAME.onrender.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
5. Copy Client ID and Secret to Render env vars

---

## Step 4: Configure PesaPal IPN

1. Log in to your PesaPal merchant account at https://pay.pesapal.com
2. Go to **Developer** → **IPN Settings**
3. Register IPN URL: `https://YOUR-APP-NAME.onrender.com/api/pesapal/ipn`
4. Save the IPN ID and add it to your env as `PESAPAL_IPN_ID`

---

## Step 5: Install as PWA

### Android (Chrome)
1. Open `https://YOUR-APP-NAME.onrender.com` in Chrome
2. Tap ⋮ menu → **Add to Home screen** → **Add**

### iOS (Safari)
1. Open in Safari → Tap **Share** icon → **Add to Home Screen** → **Add**

### Desktop (Chrome / Edge)
1. Click the **⊕** install icon in the address bar → **Install**

---

## Local Development

```bash
# 1. Install PostgreSQL locally and create database
createdb buildspark

# 2. Copy env file
cp .env.example .env
# Edit .env with your local DATABASE_URL

# 3. Install dependencies
npm install

# 4. Run migrations + seed
npx prisma migrate dev --name init
npm run db:seed

# 5. Start dev server
npm run dev
# → http://localhost:3000
```

---

## Useful Commands

```bash
npm run dev              # Development server
npm run build            # Production build
npm run db:migrate       # Run new migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio (database GUI)
npx prisma migrate reset # ⚠️  Reset database (dev only)
```

---

## Render Free Tier Notes

- Web service spins down after 15 min inactivity (cold start ~30s)
- PostgreSQL free tier: 256MB storage, 90-day retention
- Disk for uploads: 5GB (configured in render.yaml)
- Upgrade to paid tier for always-on and more storage

---

*BuildSpark v1.0.0 — Spark Construction Limited*
