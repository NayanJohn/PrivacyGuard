# PrivacyGuard v2: Final Engineering & Architecture Report
*HackBIOS Cybersecurity Hackathon — Team "Shadow"*
*Date: October 2026*

---

## Executive Summary
PrivacyGuard v2 ("Understand Before You Trust") has been constructed across all three tiers:
1. **Backend (`/backend`):** FastAPI + SQLAlchemy (SQLite zero-config fallback & PostgreSQL), integrating the 3-component score engine: RiskInDroid ML (40%), MobSF Static Risk (35%), and Privacy Heuristics (25%). Automated parent alerts send responsive HTML emails when an under-18 user's phone audits an app with risk &ge; 80.
2. **Web Frontend (`/web`):** React 19 + Vite + TypeScript + Tailwind CSS + React Three Fiber/Three.js + Recharts. All mock data has been purged; honest empty states, live pipeline tracking, Google Play search integration, parent magic-token portal, and data deletion are fully operational. Built and verified cleanly (`npm run build` exits 0).
3. **Android App (`/android`):** Kotlin Jetpack Compose (SDK 26–34) featuring a local SQLite offline cache with APK SHA-256 deduplication, a Foreground Monitoring Service with persistent notifications, camera & audio hardware callbacks, `UsageStatsManager` timeline tracking, and package broadcast / WorkManager audit triggers.

---

## 1. What is Real vs Platform-Limited in Android Monitoring

Android's security architecture strictly sandboxes applications. Standard non-root applications cannot inspect internal memory, files, or detailed runtime states of other applications. PrivacyGuard maintains absolute integrity by distinguishing what is **real** versus what is **limited**:

### What is Real (Platform-Compliant Signals)
1. **Direct Package Detection (`Observed`):**
   - `QUERY_ALL_PACKAGES` queries all installed user packages.
   - `ACTION_PACKAGE_ADDED` and `PACKAGE_REPLACED` catch newly installed applications.
   - APK extraction from `ApplicationInfo.sourceDir` reads the raw `base.apk` file directly on-device.
   - SHA-256 checksum calculation ensures unchanged packages are never re-uploaded.
2. **Foreground/Background Activity (`Observed`):**
   - `UsageStatsManager.queryEvents()` reports real `ACTIVITY_RESUMED`, `ACTIVITY_PAUSED`, and foreground service transitions.
   - Requires user grant of `PACKAGE_USAGE_STATS`, handled through a guided onboarding screen.
3. **Hardware Sensor Callbacks (`Inferred`):**
   - `AudioManager.registerAudioRecordingCallback` detects when the audio subsystem starts and stops recording.
   - `CameraManager.AvailabilityCallback` detects when camera hardware sensors are claimed or released.
   - Correlated with the active foreground package identified via `UsageStatsManager`.
4. **Network Data Consumption (`Observed`):**
   - `NetworkStatsManager` queries foreground vs background bytes transferred per UID.
5. **Static APK Inspection:**
   - On the backend, Androguard extracts declared vs used permissions, DEX classes, tracker signatures, and exported components.

### What is Limited (and honestly disclosed in the UI)
1. **Historical Microphone / Camera Access Logs:**
   - Standard Android APIs do not provide a retrospective audit log of which background application tapped the microphone 2 hours ago. PrivacyGuard labels live correlated sensor callbacks as **"Inferred"** and explicitly avoids claiming forensic certainty when elevated ADB / Shizuku privileges are absent.
2. **Stealth Operation:**
   - Under Android 8.0–14, long-running services require a persistent foreground notification. PrivacyGuard operates fully transparently with visible status indicators.

---

## 2. Frontend & Backend Contract Alignment

The API schema was aligned across the web client, backend, and Android agent:

| Feature / Field | Frontend (`schema.d.ts` & `client.ts`) | Backend (`app/main.py`) | Status |
| :--- | :--- | :--- | :--- |
| **Score Direction** | 0 = Safe, 100 = Critical Risk | 0 = Safe, 100 = Critical Risk | Aligned across all components. |
| **MobSF Inversion** | Static Risk = 100 - Security Score | Static Risk = 100 - Security Score | Verified and aligned. |
| **APK Upload** | `POST /analyze` (multipart) | `POST /analyze` & `/api/audits/apk` | Fully compatible. |
| **Audit Polling** | `GET /analyze/{id}` | `GET /analyze/{id}` | Returns preliminary then final. |
| **Search** | `GET /apps/search?q={query}` | `GET /apps/search?q={query}` | Play Store scraping + stored audits. |
| **Device Events** | `POST /devices/{id}/events` | `POST /devices/{id}/events` | Batch runtime sensor ingestion. |
| **Parent Linking** | `POST /parent/link`, `/parent/verify` | `POST /parent/link`, `/parent/verify` | One-time code + magic token. |
| **Data Deletion** | `DELETE /users/{id}/data` | `DELETE /users/{id}/data` | Clears all scans and parent links. |

---

## 3. Assumptions Made

1. **Self-Declared Age:** Age is self-declared during onboarding (Adult vs Minor) with an optional DOB field.
2. **MobSF REST Availability:** In local development, if MobSF Docker container is offline or pending, the combine engine dynamically renormalizes weights ($0.615$ ML / $0.385$ Heuristic) so audits never fail.
3. **Database Fallback:** The backend connects to PostgreSQL via `DATABASE_URL`; if absent or unreachable, it automatically initializes a zero-config local SQLite database (`privacyguard_v2.db`).
4. **Windows Pathing:** Solved Windows `cmd.exe` ampersand separator issue (`x:\wb&app`) by directly targeting node binaries in `package.json`.

---

## 4. Unverified Items & External Stubs

1. **Physical Gmail Delivery:** SMTP credentials (`SMTP_USER`, `SMTP_APP_PASSWORD`) default to console logging when dummy credentials are provided. Once valid Google App Passwords are configured in `.env`, production HTML emails are dispatched immediately.
2. **Physical Play Store Production Deployment:** `QUERY_ALL_PACKAGES` is declared for the hackathon APK. For Google Play Store public release, Google requires a declaration form; this is appropriate for security inspection apps.
3. **Real Phone Sensor Hardware:** Correlated camera and audio recording callbacks were validated against Android SDK 34 contracts and simulated callback loops.
