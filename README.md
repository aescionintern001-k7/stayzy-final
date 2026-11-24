# 🏨 Stayzy — Premium PG & Flexible Co-Living Platform

**Stayzy** is an enterprise-grade, multi-role accommodation and co-living platform supporting **Hourly**, **Daily**, **Weekly**, and **Monthly** stays. It seamlessly connects **Residents (`CUSTOMER`)**, **PG Hosts (`OWNER`)**, and **Platform Administrators (`ADMIN`)** across Web and Mobile.

---

## 📁 Clean Monorepo Architecture

The repository is organized into **3 distinct, dedicated workspaces** with independent dependency trees to guarantee clean separation of concerns and prevent package version conflicts:

```text
stayzy/
├── frontend/               # 🌐 Next.js 16 (App Router) + React 19 + Tailwind CSS v4 Web Portal
├── backend/                # ⚙️ Node.js + Express + TypeScript + Prisma ORM REST API Server (Port 5000)
├── mobile/                 # 📱 React Native 0.76 + Expo SDK 52 + Native Android Project (Gradle)
├── .github/                # 🤖 CI/CD Workflows (Firebase Hosting Auto-Deployment)
├── .env.example            # 🔑 Root environment configuration template
├── firebase.json           # 🔥 Firebase hosting & cloud rules configuration
└── package.json            # 📦 Monorepo workspace orchestrator
```

### Workspace Highlights
| Workspace | Tech Stack | Purpose | Default Port / Access |
| :--- | :--- | :--- | :--- |
| **`frontend/`** | Next.js 16, React 19, Tailwind CSS v4, Prisma | Customer booking portal, PG Owner dashboard, Platform Admin console | `http://localhost:3000` |
| **`backend/`** | Express, TypeScript, Prisma ORM, SQLite / PostgreSQL | Core REST API for bookings, rooms, amenities, authentication & payments | `http://localhost:5000` |
| **`mobile/`** | React Native 0.76.9, Expo SDK 52, Android Native (Gradle) | Cross-platform mobile app for Android (APK / Play Store) and iOS | Metro Bundler: `8081` |

---

## ⚡ 3 Integrated Personas & Roles

Stayzy includes an instant 1-tap switching capsule across both Web and Mobile:

| Role | Persona | Key Features & Access | Default Web Route |
| :--- | :--- | :--- | :--- |
| **Resident (`CUSTOMER`)** | **Aarav Sharma** | Browse catalog, multi-duration filters (Hourly to Monthly), Keyless Door Lock PIN (`8921#`), 300 Mbps Wi-Fi pass, rent receipts, and maintenance tickets. | `http://localhost:3000/` |
| **PG Host (`OWNER`)** | **Rajesh Sharma** | Real-time occupancy monitor (92%), gross monthly collections (₹3.42L), bed inventory toggle, and walkthrough tour request approvals. | `http://localhost:3000/owner` |
| **Platform Admin (`ADMIN`)** | **Vikramaditya** | Platform GMV (₹48.5L), 10% commission take-rate, property KYC & safety audits, and financial ledger. | `http://localhost:3000/admin` |

---

## 🛠️ Prerequisites

Before building and running the projects, ensure you have the following installed:

- **Node.js**: `v18.18+` or `v20+` (`Node v22+` recommended)
- **npm**: `v9+` or `v10+`
- **Java Development Kit (JDK)**: **JDK 17** (Required for Android Studio and Gradle builds)
- **Android Studio**: Ladybug, Koala, Hedgehog, or latest with:
  - Android SDK Platform (API 34 / API 35)
  - Android SDK Build-Tools
  - Android SDK Command-line Tools
  - Android Virtual Device (AVD) for emulation

---

## 🚀 Quick Start (Zero to Running)

### 1. Configure Environment Files
Copy the `.env.example` templates to `.env` across workspaces:

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env
Copy-Item backend\.env.example backend\.env
Copy-Item mobile\.env.example mobile\.env
```

**macOS / Linux:**
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp mobile/.env.example mobile/.env
```

### 2. Install & Seed Database
Run the single root setup orchestrator to install dependencies, generate Prisma clients, sync the database schemas, and seed realistic Bangalore PG listings:

```bash
# Sets up Web & Backend dependencies + Prisma database
npm run setup

# Install Mobile dependencies
npm run install:mobile
```

### 3. Start the Services
Run each service in a separate terminal:

```bash
# Terminal 1: Start Frontend Web Portal (http://localhost:3000)
npm run dev:frontend

# Terminal 2: Start Backend REST API (http://localhost:5000)
npm run dev:backend

# Terminal 3: Start Mobile Expo Bundler (http://localhost:8081)
npm run dev:mobile
```

---

## 📱 Mobile App: Android Studio & APK Build Guide

The mobile application (`mobile/`) is built with **Expo SDK 52 / React Native 0.76** and includes a complete, pre-configured native Android project inside `mobile/android/`.

You can build an installable Android APK using **3 different methods**:
1. **Android Studio (GUI)** — Recommended for full native debugging and development.
2. **Gradle Command Line (CLI)** — Fastest local build without opening the IDE.
3. **EAS Cloud Build** — Builds the APK on Expo cloud without requiring local Android SDK or Java.

---

### Method 1: Build APK via Android Studio (Step-by-Step GUI)

#### Step 1: Configure Android Studio & JDK 17
1. Open **Android Studio**.
2. Open **Settings** (Windows/Linux: `File > Settings`, macOS: `Android Studio > Settings`).
3. Navigate to **Build, Execution, Deployment > Build Tools > Gradle**.
4. Set **Gradle JDK** to **Java 17 (JDK 17)**. *(React Native 0.76 requires JDK 17)*.
5. Navigate to **Languages & Frameworks > Android SDK**:
   - Under **SDK Platforms**, ensure **Android 14.0 ("UpsideDownCake" / API 34)** or **Android 15 (API 35)** is checked.
   - Under **SDK Tools**, ensure **Android SDK Build-Tools**, **Android SDK Command-line Tools**, and **Android Emulator** are installed.
6. Click **Apply** and **OK**.

#### Step 2: Open the Native Android Project
1. In Android Studio, click **File > Open...** (or select **Open** from the welcome screen).
2. Browse to the repository and select the **`mobile/android`** folder:
   ```text
   stayzy/mobile/android
   ```
   > ⚠️ **IMPORTANT**: Select the `mobile/android` folder itself, NOT the root `stayzy` folder!
3. Click **OK**.
4. Android Studio will open the native project and start the **Gradle Sync**. Wait for the sync to complete (shown as *"Gradle sync finished"* in the bottom status bar).

#### Step 3: Run the App on an Android Emulator or Physical Phone
1. Start the Metro JavaScript bundler in a terminal:
   ```powershell
   cd mobile
   npx expo start
   ```
2. In Android Studio:
   - **For Emulator**: Open **Device Manager**, launch an Android Virtual Device (e.g., Pixel 8 API 34).
   - **For Physical Phone**: Connect your phone via USB with **Developer Options > USB Debugging** enabled.
3. Select your device from the target device dropdown in Android Studio's top toolbar.
4. Click the green **Run (▶)** button (or press `Shift + F10`).
5. Android Studio compiles the native code, installs the app, and opens it on your device.

#### Step 4: Generate Debug APK (Installable on any Android phone)
1. In the Android Studio top menu bar, click:
   ```text
   Build  ➜  Build Bundle(s) / APK(s)  ➜  Build APK(s)
   ```
2. Android Studio will execute the Gradle task `assembleDebug`.
3. When the build finishes, a notification appears in the bottom-right corner:
   ```text
   Build APK(s): APK(s) generated successfully for 1 module.
   ```
4. Click the blue **locate** link inside the notification.
5. The generated installable APK is located at:
   ```text
   stayzy/mobile/android/app/build/outputs/apk/debug/app-debug.apk
   ```
6. You can copy this `app-debug.apk` directly to any Android smartphone via WhatsApp, Google Drive, or USB and tap to install!

#### Step 5: Generate Signed Production Release APK
1. In the Android Studio top menu bar, click:
   ```text
   Build  ➜  Generate Signed Bundle / APK...
   ```
2. Select **APK** and click **Next**.
3. Under **Key store path**:
   - If you have an existing keystore, browse to it.
   - If you need a new keystore, click **Create new...**:
     - Choose a keystore storage path (e.g., `stayzy-release.keystore`).
     - Enter a password for the keystore and the key.
     - Set Key Alias to `stayzy-key`.
     - Fill in your organization or name details and click **OK**.
4. Click **Next**.
5. Select the **release** build variant.
6. Check both **V1 (Jar Signature)** and **V2 (Full APK Signature)** check boxes.
7. Click **Finish**.
8. The signed release APK will be generated at:
   ```text
   stayzy/mobile/android/app/build/outputs/apk/release/app-release.apk
   ```

---

### Method 2: Build APK via Command Line (Fast Gradle CLI)

You can build the APK directly from your terminal without opening Android Studio.

#### Build Debug APK:
**Windows PowerShell:**
```powershell
cd mobile\android
.\gradlew.bat assembleDebug
```

**macOS / Linux:**
```bash
cd mobile/android
chmod +x gradlew
./gradlew assembleDebug
```

**Output APK location:**
```text
stayzy/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

#### Build Release APK:
**Windows PowerShell:**
```powershell
cd mobile\android
.\gradlew.bat assembleRelease
```

**Output APK location:**
```text
stayzy/mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

### Method 3: Cloud Build via EAS (Zero Local SDK Setup)

If you do not have Android Studio or the Android SDK installed on your computer, Expo Application Services (EAS) can build the APK on the cloud:

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Navigate to `mobile/` and log in:
   ```bash
   cd mobile
   eas login
   ```
3. Trigger the preview APK build:
   ```bash
   eas build -p android --profile preview
   ```
4. EAS will compile the APK on Expo's high-speed cloud builders in ~5 minutes.
5. When complete, terminal displays a direct download link and a QR code to download the `.apk` straight to your phone.

---

## 🛠️ Troubleshooting Mobile & Android Studio

### 1. `SDK location not found` Error
If Gradle complains about missing Android SDK location, create a file named `local.properties` inside `mobile/android/`:

**Windows (`mobile/android/local.properties`):**
```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```
*(Replace `YOUR_USERNAME` with your Windows user name)*

**macOS / Linux (`mobile/android/local.properties`):**
```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

### 2. Java / Gradle Version Incompatibility
- **Symptom**: `Unsupported class file major version` or `Could not find tools.jar`.
- **Solution**: Android Studio must use **Java 17**. Go to `Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK` and choose **17**.

### 3. Metro Bundler Not Connecting (`Unable to load script`)
- When running the app on a physical phone connected via USB, run:
  ```bash
  adb reverse tcp:8081 tcp:8081
  ```
- Make sure Metro bundler is running in terminal: `cd mobile && npx expo start`.

### 4. Build Architecture Mismatch (Emulator vs Physical Device)
In `mobile/android/gradle.properties`, the architectures are configured to support both physical devices and emulators:
```properties
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
```

---

## 📋 Root Command Reference

All primary commands can be run from the repository root:

| Command | Action |
| :--- | :--- |
| `npm run setup` | Complete setup: installs packages, generates Prisma clients, and seeds databases for Web & Backend. |
| `npm run install:all` | Installs dependencies across all 3 workspaces (`frontend`, `backend`, `mobile`). |
| `npm run install:frontend` | Installs dependencies in `frontend/`. |
| `npm run install:backend` | Installs dependencies in `backend/`. |
| `npm run install:mobile` | Installs dependencies in `mobile/`. |
| `npm run dev:frontend` | Starts Next.js Web Application (`http://localhost:3000`). |
| `npm run dev:backend` | Starts Express REST API Server (`http://localhost:5000`). |
| `npm run dev:mobile` | Starts Expo Metro Bundler for Mobile (`http://localhost:8081`). |
| `npm run dev:mobile:android` | Builds and runs the mobile app on connected Android device / emulator. |
| `npm run dev:mobile:web` | Runs the mobile app in web browser mode. |
| `npm run seed:all` | Re-seeds both frontend and backend databases. |
| `npm run build:frontend` | Creates production build of Next.js frontend. |
| `npm run build:backend` | Compiles TypeScript backend to `dist/`. |
| `npm run build:apk` | Triggers cloud APK build via EAS CLI. |
| `npm run deploy:frontend` | Deploys frontend static bundle to Firebase Hosting. |

---

## 🔒 Security & Environment Variables

- **`.env` files**: All sample `.env.example` templates contain safe, working demo credentials out of the box.
- **Production Credentials**: For production deployment, set your own `AUTH_SECRET`, custom `DATABASE_URL` (PostgreSQL), and Firebase service account keys.
- **Android Signing Keystore**: Keep your release `.keystore` secure and never commit private signing keys to public version control.

---

## 📄 License

This project is proprietary and confidential. Developed for **Stayzy Co-Living & PG Management Platform**.
