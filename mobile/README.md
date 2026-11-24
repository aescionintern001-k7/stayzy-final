# 📱 Stayzy Mobile Application

Cross-platform mobile application for **Stayzy** connecting **Residents (`CUSTOMER`)**, **PG Hosts (`OWNER`)**, and **Platform Administrators (`ADMIN`)** across Android, iOS, and Tablets. Built with **React Native (0.76.9)**, **Expo (SDK 52)**, **TypeScript**, **Expo Router**, and a native Android project (`android/`).

---

## ⚡ Key Features & Multi-Role Architecture

1. **Resident Mode (`CUSTOMER` — Aarav Sharma)**:
   - Multi-duration accommodation catalog: **Hourly**, **Daily**, **Weekly**, **Monthly**.
   - Category filter (Private Studio, 2-Sharing, 3-Sharing) & Gender filter (Co-Living, Female Only, Male Only).
   - Interactive booking checkout sheet with transparent price breakdown (Base rent, Security deposit, Taxes).
   - Property walkthrough tour scheduling with date & time picker.
   - **Resident Access Pass**:
     - 1-Tap Reveal/Hide for **Keyless Smart Door Lock PIN (`8921#`)**.
     - High-speed **300 Mbps Wi-Fi Credentials** (SSID & Password with one-tap copy).
     - Stay validity & Rent receipt status.
     - 1-Tap Stay Extension request modal.
     - Maintenance ticket dispatcher (Housekeeping, Wi-Fi, Plumbing, AC, Electrical).
   - **Saved / Favorites** with persistent local storage.

2. **PG Host Mode (`OWNER` — Rajesh Sharma)**:
   - Real-time occupancy tracker (92% occupancy).
   - Monthly gross rent collections (₹3.42 Lakh).
   - Property portfolio cards across Koramangala, HSR Layout, Indiranagar.
   - Tenant Walkthrough Visit requests approval queue.
   - Quick "Add Bed Unit" modal.

3. **Platform Admin Mode (`ADMIN` — Lead Admin Vikramaditya)**:
   - Platform Overview: Total GMV (₹48.5 Lakh), 10% Commission take-rate (₹4.85 Lakh).
   - 142 Active beds under management & 0 open disputes SLA.
   - Compliance & KYC safety audit queue for newly listed properties.

4. **Universal 1-Tap Role Switcher**:
   - Persistent top capsule allowing instant toggle between **Resident**, **Host**, and **Admin** personas on the fly.

---

## 🛠️ Prerequisites

- **Node.js**: `v18.18+` or `v20+` (`v22+` recommended)
- **npm**: `v9+` or `v10+`
- **Java Development Kit**: **JDK 17** (Required for Android Studio and Gradle)
- **Android Studio**: With Android SDK (API 34 / 35), Build Tools, and Android Virtual Device (AVD)

---

## 🚀 Setup & Environment

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
# Windows
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Configuration variables (`.env`):
```env
# Firebase Web / Mobile Client Configuration (Pre-configured for demo)
EXPO_PUBLIC_FIREBASE_API_KEY="AIzaSyAjUnuYLvCGfYJEqQ7unkYxAmWbDrwhy6E"
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN="pg-rooms-60c83.firebaseapp.com"
EXPO_PUBLIC_FIREBASE_PROJECT_ID="pg-rooms-60c83"
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET="pg-rooms-60c83.firebasestorage.app"
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="27796929578"
EXPO_PUBLIC_FIREBASE_APP_ID="1:27796929578:web:c9018be5ea6e29db88d753"

# Backend REST API Server Target:
# - For Android Studio Emulator: http://10.0.2.2:5000
# - For iOS Simulator / Web Preview: http://localhost:5000
# - For Physical Device (same Wi-Fi): http://<YOUR_PC_LAN_IP>:5000
EXPO_PUBLIC_API_URL="http://10.0.2.2:5000"
```

---

## 📱 Running the Mobile App

### Option A: Standard Metro Bundler
```bash
npx expo start
```
- Press **`a`** to open in connected Android emulator / device.
- Press **`w`** to open web preview in browser.
- Scan QR code with the **Expo Go** app on your physical phone.

### Option B: Direct Run via Native Android Toolchain
```bash
npm run android
```
*(Automatically starts Metro, builds the native Android app, installs it on your running emulator or connected phone, and launches it).*

---

## 📦 How to Build the Android APK

You can build the installable APK using **Android Studio (GUI)**, **Gradle (CLI)**, or **EAS (Cloud)**.

---

### Method 1: Android Studio (GUI Step-by-Step)

1. **Verify Gradle JDK 17**:
   - Open Android Studio.
   - Go to `Settings > Build, Execution, Deployment > Build Tools > Gradle`.
   - Ensure **Gradle JDK** is set to **Java 17 / JDK 17**.

2. **Open the Project**:
   - Go to `File > Open...`.
   - Select the **`mobile/android`** folder (NOT the root directory!).
   - Click **OK** and wait for Gradle Sync to finish.

3. **Build Debug APK**:
   - Click `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
   - When finished, click **locate** on the popup notification in bottom right.
   - Output file:
     ```text
     mobile/android/app/build/outputs/apk/debug/app-debug.apk
     ```

4. **Build Signed Release APK**:
   - Click `Build > Generate Signed Bundle / APK...`.
   - Choose **APK** > Click **Next**.
   - Create or select your keystore file, enter keystore passwords, alias, and key password.
   - Select **release** variant, check **V1** and **V2** signature boxes, click **Finish**.
   - Output file:
     ```text
     mobile/android/app/build/outputs/apk/release/app-release.apk
     ```

---

### Method 2: Command Line (Fast Gradle CLI)

Build directly without opening the Android Studio GUI:

#### Debug APK:
**Windows:**
```powershell
cd android
.\gradlew.bat assembleDebug
```
**macOS / Linux:**
```bash
cd android
./gradlew assembleDebug
```
*Output: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`*

#### Release APK:
**Windows:**
```powershell
cd android
.\gradlew.bat assembleRelease
```
**macOS / Linux:**
```bash
cd android
./gradlew assembleRelease
```
*Output: `mobile/android/app/build/outputs/apk/release/app-release.apk`*

---

### Method 3: Cloud EAS Build (Zero Native Setup)

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to your Expo account
eas login

# 3. Build Preview APK on Expo Cloud
eas build -p android --profile preview
```
Download link and QR code will appear in terminal once build completes in ~5 minutes.

---

## 🏗️ Directory Structure

```text
mobile/
├── android/                  # Native Android project (Gradle, build.gradle, settings.gradle, gradlew)
│   ├── app/                  # Android application module & manifests
│   └── gradle/               # Gradle wrapper
├── app/                      # Expo Router File-Based Routing
│   ├── _layout.tsx           # Root Stack layout with RoleProvider & status bar
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Bottom tab bar with top RoleSwitcherBar
│   │   ├── index.tsx         # Active role router (Customer Explore, Owner Hub, Admin Ops)
│   │   ├── stays.tsx         # My Stay Pass (Keyless PIN, 300 Mbps Wi-Fi, tickets, extension)
│   │   ├── saved.tsx         # Saved / Favorite accommodations
│   │   ├── content.tsx       # Admin content & editorial editor
│   │   ├── people.tsx        # Directory & resident manager
│   │   ├── search.tsx        # Filterable search view
│   │   └── profile.tsx       # Profile, Firebase status, Persona switch, Sign out
│   ├── login.tsx             # Sign In with Firebase & 1-tap persona buttons
│   ├── register.tsx          # Account creation with validation
│   └── room/
│       └── [id].tsx          # Comprehensive Room Details with multi-duration pricing & booking
├── assets/                   # App icons, splash screens, adaptive icons
├── functions/                # Firebase Cloud Functions (stayzy-mobile operations)
├── src/                      # Reusable Components, Context, and Theme
│   ├── components/           # Header, RoleSwitcherBar, RoomCardMobile, DateField, StayAction
│   ├── config/               # Firebase SDK initialization with AsyncStorage persistence
│   ├── context/              # 3-Persona context, Firebase auth, and favorites
│   ├── data/                 # Bangalore PG catalog with hourly/daily/weekly/monthly rates
│   ├── screens/              # Customer, Owner, and Admin screen views
│   └── theme/                # Stayzy Forest, Ivory, and typography tokens
├── .easignore                # Files ignored by EAS cloud build
├── .env.example              # Environment variables template
├── app.json                  # Expo config (package: com.stayzy.app, scheme: stayzy)
├── directory.rules           # Firestore security rules
├── eas.json                  # EAS Build configuration (preview APK & production AAB/IPA)
├── firebase.directory.json   # Firebase deployment configuration
├── package.json
└── tsconfig.json
```

---

## 🛠️ Troubleshooting Common Issues

1. **`SDK location not found`**:
   Create `mobile/android/local.properties`:
   ```properties
   sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
   ```
2. **Java Version Error**: Ensure Android Studio Gradle JDK is configured with **JDK 17**.
3. **Physical Phone USB Connection**: Run `adb reverse tcp:8081 tcp:8081` to forward Metro port.
