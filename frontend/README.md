# Stayzy Web Application — Next.js 16 & React 19

The web application for **Stayzy**, a unified PG and flexible co-living accommodation platform supporting **Hourly**, **Daily**, **Weekly**, and **Monthly** stays.

Built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **Prisma ORM (SQLite)**, and **Firebase Authentication**.

---

## 🌟 Key Features & Persona Consoles

Stayzy includes 3 integrated personas accessible with a 1-click switcher in the top navigation bar:

| Role | Persona | Default Route | Key Functionalities |
| :--- | :--- | :--- | :--- |
| **Resident (`CUSTOMER`)** | **Aarav Sharma** | `/` | Accommodation catalog with multi-duration filters, booking sheet, Keyless Door Lock PIN (`8921#`), 300 Mbps Wi-Fi pass, rent receipts, and maintenance tickets. |
| **PG Host (`OWNER`)** | **Rajesh Sharma** | `/owner` | Real-time occupancy monitor (92%), gross monthly collections (₹3.42L), bed inventory toggle, and walkthrough tour request approvals. |
| **Platform Admin (`ADMIN`)** | **Vikramaditya** | `/admin` | Platform GMV (₹48.5L), 10% commission take-rate, property KYC & safety audits, and financial ledger. |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.18+ or v20+ (Node v22+ recommended)
- **npm**: v9+

### 2. Install Dependencies
Run from the `frontend/` directory:
```bash
cd frontend
npm install
```
*(Or from the repository root: `npm run install:web`)*

### 3. Configure Environment Variables
Create a `.env` file from the provided `.env.example`:
```bash
cp .env.example .env
```

Key environment configurations:
```env
# Database (SQLite out-of-the-box)
DATABASE_URL="file:./dev.db"

# Application Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_DEMO_MODE="true"
NEXT_PUBLIC_DEFAULT_TIMEZONE="Asia/Kolkata"

# Authentication & Admin Access
AUTH_SECRET="your-secure-random-secret-here"
ADMIN_PIN="123456"

# Payment Adapter Configuration (Demo Adapter active by default)
PAYMENT_PROVIDER="DEMO_ADAPTER"

# Firebase Client Configuration (Pre-configured for demo)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyAjUnuYLvCGfYJEqQ7unkYxAmWbDrwhy6E"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="pg-rooms-60c83.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="pg-rooms-60c83"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="pg-rooms-60c83.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="27796929578"
NEXT_PUBLIC_FIREBASE_APP_ID="1:27796929578:web:c9018be5ea6e29db88d753"
```

### 4. Initialize Database & Seed Listings
Generate the Prisma Client, push the SQLite database schema, and seed realistic Bangalore PG listings:
```bash
# Generate Prisma Client
npx prisma generate

# Create and sync SQLite schema (dev.db)
npx prisma db push

# Seed 18+ comprehensive Bangalore PG rooms and physical beds
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available NPM Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `next dev` | Start Next.js development server on port 3000 with Turbopack. |
| `npm run build` | `next build` | Create optimized production build. |
| `npm run build:export` | `tsx scripts/build-export.ts` | Generate static export for Firebase Hosting into `out/`. |
| `npm run start` | `next start` | Run Next.js production server. |
| `npm run seed` | `tsx prisma/seed.ts` | Seed database with sample properties, rooms, beds, and users. |
| `npm run lint` | `eslint` | Run ESLint static code analysis. |

---

## 🚢 Production Deployment to Firebase Hosting

The frontend is configured for deployment to Firebase Hosting:

1. **Build Static Export**:
   ```bash
   npm run build:export
   ```
2. **Deploy to Firebase**:
   ```bash
   npx firebase-tools deploy --only hosting --project stayzy-83375
   ```
* **Live Deployment URL**: [https://stayzy-83375.web.app](https://stayzy-83375.web.app)

---

## 🧩 Folder Structure

```text
frontend/
├── prisma/
│   ├── schema.prisma         # SQLite database schema (Users, Rooms, Bookings, Visits)
│   └── seed.ts               # Bangalore PG properties & room seeds
├── public/                   # Static assets, brand logos, badges
├── scripts/
│   ├── build-export.ts       # Automated Next.js static HTML export orchestrator
│   └── provision-admin.ts    # Admin provisioning utility
├── src/
│   ├── app/                  # Next.js App Router (Customer, Owner, Admin routes)
│   ├── components/           # UI components, modals, sheets, navigation
│   ├── lib/                  # Prisma client, Firebase auth helpers, formatters
│   └── styles/               # Tailwind CSS v4 stylesheets
├── .env.example              # Environment variables template
├── next.config.ts            # Next.js build and routing configuration
└── package.json
```
