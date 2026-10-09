# PrivacyGuard v2: "Understand Before You Trust"
**AI-Powered Permission Auditing Framework for Assessing Privacy Risk in Android Applications**  
*HackBIOS Cybersecurity Hackathon — Team "Shadow"*

---

## 1. System Architecture

```text
               +-------------------------------------------------------------+
               |                     PrivacyGuard v2 Ecosystem               |
               +-------------------------------------------------------------+
                                     |                             |
                       +-------------+-------------+               |
                       |                           |               |
              [React + Vite Web]         [Kotlin Android App]     |
              • 3D R3F Visualizer        • Jetpack Compose 3D UI   |
              • APK Drag-and-Drop        • SQLite Offline Storage  |
              • Live Pipeline Tracking   • Foreground Monitor FGS  |
              • Parent Guardian Portal   • SHA-256 APK Cache       |
                       |                           |               |
                       +-------------+-------------+               |
                                     | (REST API / JSON / Upload)  |
                                     v                             |
                      +-----------------------------+              |
                      |  FastAPI Backend (Port 8000)|              |
                      +-----------------------------+              |
                                     |                             |
      +------------------------------+-----------------------------+
      |                              |                             |
      v                              v                             v
[RiskInDroid ML]             [MobSF REST API]            [Privacy Heuristics]
• Logistic Sigmoid           • Static Security Scan      • Mic + Camera combos
• 40% Dynamic Weight         • static_risk = 100 - score • BG Location + Network
• 0-100 Risk Direction       • 35% Dynamic Weight        • Cleartext HTTP / DEX
      |                              |                             |
      +------------------------------+-----------------------------+
                                     |
                                     v
                       [Weighted Score Synthesis]
                       Risk Score = 0.40(ML) + 0.35(Static) + 0.25(Heuristic)
                       (Auto-renormalized if MobSF is pending or offline)
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
    [Parent Email Alerts]                        [PostgreSQL / SQLite]
    • Under-18 users                             • 11 Relational Tables
    • Triggered if Risk >= 80                    • Sync & Audit Registry
    • Plain-English risk factors
```

---

## 2. The 3-Component Explainable Score Engine

PrivacyGuard enforces **higher score = higher privacy risk** (0 to 100):

| Component | Weight | Technology | Direction & Formula |
| :--- | :---: | :--- | :--- |
| **RiskInDroid ML** | **40%** | Feature vector analysis + Logistic Sigmoid | Empirical permission weighting directly producing risk $0 \dots 100$. |
| **MobSF Static Risk** | **35%** | MobSF REST API integration | $\text{static\_risk} = 100 - \text{mobsf\_security\_score}$. Inverted to align with risk. |
| **Privacy Heuristics** | **25%** | Static rule-based AST & Manifest inspector | High-risk combos (Mic + Cam, Location + Background), cleartext HTTP, debuggable flags. |

*Dynamic Fallback Renormalization:* If MobSF is pending asynchronous completion or offline, weights rebalance seamlessly across available components without blocking immediate results.

---

## 3. Real Data Rule & Honest Android Platform Disclosures

PrivacyGuard **strictly forbids mock data**. Signals are labeled with their factual origin and confidence:

| Evidence Level | Platform API Used | Meaning & Limitations |
| :--- | :--- | :--- |
| **Observed** | `UsageStatsManager.queryEvents`<br>`ACTION_PACKAGE_ADDED` | **Direct platform signal.** Verified system transition (e.g. `ACTIVITY_RESUMED`, package install broadcast). |
| **Inferred** | `CameraManager.AvailabilityCallback`<br>`AudioManager.AudioRecordingCallback` | **Hardware sensor active correlated with foreground app.** Android does not expose cross-app sensor history; PrivacyGuard correlates live hardware bus triggers with the active foreground package. |
| **Declared** | `PackageManager.GET_PERMISSIONS`<br>`AppOpsManager` mode check | **Granted capability without active execution.** The permission is granted in the OS manifest, but no current runtime sensor trigger is active. |

---

## 4. Run Steps & Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Android SDK 34 / Android Studio (for Android app)
- Docker & Docker Compose (optional for PostgreSQL + MobSF)

### 4.1 Running the Backend
```bash
cd backend

# Create virtual environment & install dependencies
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run migrations (or runs out-of-the-box on SQLite fallback)
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be live at `http://localhost:8000/docs`.

### 4.2 Running the Web Application
```bash
cd web

# Install dependencies (or link existing node_modules)
npm install

# Start Vite dev server
npm run dev

# Or build for production
npm run build
```
Web app will be live at `http://localhost:5173`.

### 4.3 Running with Docker Compose (Engine + PostgreSQL + MobSF)
```bash
docker-compose up -d
```

### 4.4 Running the Android Agent
1. Open `/android` in Android Studio.
2. Ensure minimum SDK is 26 and target SDK is 34.
3. Build and install on an Android Emulator or device.
4. On first launch, select age category and grant **Usage Access** (`Settings > Usage Access`) to enable foreground/background monitoring.

---

## 5. API Reference

- `POST /analyze` — Upload APK for 3-component analysis (multipart file, claim, category).
- `GET /analyze/{id}` — Poll for preliminary and final score with component breakdown.
- `GET /apps/search?q={query}` — Search Google Play metadata & existing audits.
- `POST /devices/register` — Register Android device.
- `POST /devices/{id}/events` — Batch ingest runtime sensor & usage events.
- `POST /users/onboard` — User onboarding with self-declared age category.
- `POST /parent/link` — Link parent Gmail address and dispatch magic token.
- `POST /parent/verify` — Verify parent code and accept consent agreement.
- `GET /parent/portal/{token}` — Magic token parent portal alert feed.
- `GET /alerts` — List security and parental alerts.
- `DELETE /users/{id}/data` — GDPR/CCPA "Delete My Data" purge.
- `GET /health` — Health status of Androguard, ML model, MobSF, DB, and SMTP.

---

## 6. Verification & Test Checklist

- [x] **Backend Score Engine:** All 11 unit & integration tests passing (`tests/test_v2_engine.py`, `tests/test_api_endpoints.py`).
- [x] **Web Build:** TypeScript compilation & Vite bundle complete with 0 errors (`npm run build`).
- [x] **3D Scene:** React Three Fiber interactive floating shield & phone with reduced-motion fallback.
- [x] **Under-18 Rule:** Threshold &ge; 80 sends HTML email to verified parent and logs alert.
- [x] **Empty State Compliance:** Real data only; zero hardcoded mock apps, mock charts, or fake stats.
