# BuildSpark 🏗️
### Spark Construction Limited – Site Management System

A full-featured Progressive Web App (PWA) for managing construction sites, finances, inventory, team assignments, and more.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Fill in your values in .env
```

### 3. Set up database
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Default Login Credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| System Admin | admin@sparkconst.co.ug | Admin@2024! |
| Site Manager | manager@sparkconst.co.ug | Manager@2024! |
| Accountant | accounts@sparkconst.co.ug | Account@2024! |

> **Change these immediately after first login!**

---

## 🌐 Deploy to Render

### Prerequisites
1. Push this repo to your GitHub account
2. Sign up at [render.com](https://render.com)

### Steps
1. Go to Render Dashboard → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render will detect `render.yaml` automatically
4. Set environment variables:
   - `NEXTAUTH_URL` → your Render URL (e.g. `https://buildspark.onrender.com`)
   - `NEXTAUTH_SECRET` → any random 32+ char string
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` → from Google Cloud Console
   - `GEMINI_API_KEY` → your Gemini API key
   - `PESAPAL_CONSUMER_KEY` / `PESAPAL_CONSUMER_SECRET` → from PesaPal dashboard
   - `NEXT_PUBLIC_APP_URL` → same as `NEXTAUTH_URL`
5. Click **Apply**

### Post-deploy
After first deploy, run the seed:
```bash
# In Render shell
npx prisma db seed
```

---

## 📱 PWA Installation

### Android
1. Open the app in Chrome
2. Tap the menu (⋮) → **Add to Home screen**
3. Tap **Add**

### iOS
1. Open in Safari
2. Tap **Share** → **Add to Home Screen**
3. Tap **Add**

### Desktop (Chrome/Edge)
1. Click the install icon (⊕) in the address bar
2. Click **Install**

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| Database | PostgreSQL (Render) |
| ORM | Prisma |
| Auth | NextAuth.js v5 |
| Payments | PesaPal v3 |
| AI | Google Gemini 1.5 Flash |
| Maps | OpenStreetMap (Leaflet) |
| Charts | Recharts |
| State | React Query + Zustand |
| PWA | next-pwa |

---

## 👥 User Roles

### System Admin
- Full system access
- Create/manage user accounts
- Assign site managers to projects
- Send money to site managers (PesaPal)
- View audit logs
- Configure company settings

### Site Manager
- Manage assigned projects only
- Record money received, purchases, expenses
- Upload receipts (AI-verified)
- Send material/fund requests
- Upload site progress photos
- View project reports and analytics

### Accountant
- View all financial data (read)
- Generate and download reports (PDF/Excel/Word)
- Add office expenses
- View receipts and audit trails
- Create balance sheets

---

## 🔐 Security Features

- JWT-based authentication with NextAuth.js
- Role-based access control (RBAC)
- Fine-grained per-user permission overrides
- 24-hour edit lock for site managers
- Complete audit logging of all actions
- Input validation with Zod
- SQL injection prevention via Prisma ORM
- Secure file upload with type/size validation
- HTTPS enforced in production

---

## 📊 Features

- ✅ Real-time dashboard with charts
- ✅ Project management with GPS coordinates
- ✅ Inventory tracking with low-stock alerts
- ✅ Purchase recording with AI receipt verification
- ✅ Installment payments with receipt per payment
- ✅ Request workflow (create → review → approve)
- ✅ Money transfers via PesaPal (MTN/Airtel)
- ✅ Financial reports (PDF, Excel, Word)
- ✅ Balance sheet generation
- ✅ Site progress photos with collections
- ✅ Interactive map (OpenStreetMap)
- ✅ Notifications system
- ✅ Audit logs
- ✅ Dark/Light/System theme
- ✅ PWA (installable on any device)
- ✅ Mobile-first responsive design

---

## 📁 Project Structure

```
buildspark/
├── app/                    # Next.js App Router
│   ├── (auth)/login/       # Login page
│   ├── api/                # API routes
│   └── dashboard/          # Dashboard pages
├── components/             # React components
│   ├── charts/             # Recharts components
│   ├── dashboard/          # Dashboard UI
│   ├── layout/             # Shell, navigation
│   ├── map/                # Leaflet map
│   ├── projects/           # Project components
│   └── purchases/          # Purchase modals
├── lib/                    # Utilities
│   ├── auth.ts             # NextAuth config
│   ├── prisma.ts           # DB client
│   ├── gemini.ts           # AI integration
│   ├── pesapal.ts          # Payment integration
│   ├── errors.ts           # Error handling
│   └── utils.ts            # Helpers
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Initial data
└── public/
    ├── icons/              # PWA icons
    └── uploads/            # User uploads
```

---

## 🛠️ Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:generate  # Regenerate Prisma client
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
npm run lint         # Run ESLint
```

---

## 🆘 Support

For issues or questions:
- Email: admin@sparkconst.co.ug
- System: BuildSpark v1.0.0

---

*Built with ❤️ for Spark Construction Limited*
