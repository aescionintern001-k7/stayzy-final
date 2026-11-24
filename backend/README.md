# Stayzy Backend REST API Server

Node.js, Express, TypeScript, and Prisma ORM REST API serving both the **Stayzy Next.js Web Application** and the **Stayzy React Native Expo Mobile App**.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.18+ or v20+ (Node v22+ recommended)
- **npm**: v9+

### 2. Install Dependencies
Run from the `backend/` directory:
```bash
cd backend
npm install
```
*(Or from the repository root: `npm run install:backend`)*

### 3. Environment Variables Configuration
Copy the template `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configuration details (`.env`):
```env
PORT=5000
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="stayzy_super_secret_jwt_key_2026_stay_flexible"
CORS_ORIGIN="http://localhost:3000,http://localhost:8081,https://stayzy-83375.web.app"
```

### 4. Database Initialization & Seeding
Generate the Prisma Client, push the schema to SQLite (`prisma/dev.db`), and populate the database with realistic Bangalore PG properties:
```bash
# Generate Prisma Client
npx prisma generate

# Create & sync SQLite database schema
npx prisma db push

# Seed 18+ comprehensive listings (Room types, physical units, rates)
npm run seed
```

### 5. Start API Server

#### Development Mode (with hot-reload):
```bash
npm run dev
```
Server runs on **[http://localhost:5000](http://localhost:5000)**.

#### Production Build & Run:
```bash
npm run build
npm start
```

---

## 📡 REST API Reference

### Service & Health
| Method | Endpoint | Description | Sample Query / Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status, version, and supported roles | None |

### Public & Room Catalog
| Method | Endpoint | Description | Sample Query / Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/rooms` | Filterable catalog of room listings with active rate plans | `?city=Bangalore&category=PRIVATE_STUDIO&gender=COLIVING` |
| `GET` | `/api/rooms/:slug` | Detailed room specifications, amenities, and gallery | None (`:slug` e.g. `stanza-living-indiranagar-studio`) |

### Resident / Customer
| Method | Endpoint | Description | Sample Query / Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings/my` | Active user stays, inventory units, and payment receipts | None |
| `POST` | `/api/visits/schedule` | Schedule a free in-person property walkthrough visit | `{"propertyId": "cmvj...", "visitDate": "2026-11-20", "visitTime": "11:00 AM", "guestName": "Aarav", "guestPhone": "+91 98765 43210"}` |

### Host / Owner
| Method | Endpoint | Description | Sample Query / Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/owner/properties` | Host properties, bed inventories, and visit requests | None |

### Platform Super Admin
| Method | Endpoint | Description | Sample Query / Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Platform GMV, 10% commission, active beds, and pending visits | None |

### Authentication & Persona Switcher
| Method | Endpoint | Description | Sample Query / Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/switch` | Instant 1-tap demo persona switcher (`CUSTOMER`, `OWNER`, `ADMIN`) | `{"role": "CUSTOMER"}` |

---

## 📁 Folder Structure

```text
backend/
├── prisma/
│   ├── schema.prisma       # Database schema (Properties, RoomTypes, Bookings, Visits)
│   ├── seed.ts             # Bangalore PG properties & room seeds
│   └── dev.db              # Local SQLite database (created on db push)
├── src/
│   ├── config/
│   │   └── prisma.ts       # Prisma Client singleton
│   └── server.ts           # Express REST API routes & controllers
├── .env.example            # Environment variables template
├── package.json
└── tsconfig.json
```
