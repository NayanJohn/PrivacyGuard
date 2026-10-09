# PrivacyGuard 🛡️ — Understand Before You Trust

> **"Understand Before You Trust."**  
> Explainable Android APK Privacy Risk Analysis with an Immersive 3D Experience and Live Floating Web Interface.

---

## 1. Product Overview

PrivacyGuard gives smartphone users and privacy researchers transparent, explainable insight into Android applications. A visitor uploads an Android APK, optionally declares what the app claims to do, and receives an explainable privacy risk report (scored from 0 to 100).

Everything else—including on-device installed application scanning, live runtime permission monitoring, version history tracking, and security alerts—lives strictly inside the **PrivacyGuard Android App**, and the website honestly invites visitors to install it.

---

## 2. Creative 3D Direction & Experience

- **Live Floating Webpage Panel:** The core functional UI (Upload card, progress pipeline, and report) floats in genuine 3D space with subtle cursor-driven tilt parallax (up to 6°), soft shadows, and cyan/violet glow.
- **Full-Screen 3D WebGL Background (`Three.js` + `@react-three/fiber` + `@react-three/drei`):** Dark navy-to-black space, illuminated by a glowing wireframe + glass shield core with orbiting translucent permission badges (Camera, Microphone, Location, Contacts, Storage, SMS).
- **Camera Choreography Across Routes:**
  - **Home (`/`):** Centered perspective with orbiting permission badges.
  - **Auditing:** Camera smoothly glides closer as the shield core spins and pulses through real backend stages.
  - **Report (`/report/:id`):** Camera frames an expanded 3D score ring around the shield core, tinted dynamically by risk band color.
  - **In-App Locked Features Modal:** Camera glides back into deep space while the install modal floats forward.
- **Performance & Accessibility (`prefers-reduced-motion`):** Caps DPR at 2, lazily loads 3D canvas, and degrades gracefully to a static CSS gradient with zero motion when reduced-motion is requested, when WebGL is unavailable, or on mobile screen widths (< 768px).

---

## 3. Tech Stack

- **Framework:** React 19 + Vite 8 + TypeScript
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`), Custom glassmorphism design system
- **Routing:** `react-router-dom` v7
- **3D Graphics:** `three`, `@react-three/fiber`, `@react-three/drei`
- **Animation & Transitions:** `framer-motion`
- **File Upload:** `react-dropzone`, `axios`
- **Accessible UI:** `@headlessui/react` (Dialog modal with focus-trapping & ESC handling)
- **Visuals & QR Code:** `qrcode.react`, `lucide-react`
- **PDF Generation:** `jspdf`
- **Zero Third-Party Trackers:** No Google Analytics, no Facebook Pixel, no telemetry cookies.

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js 18+ (tested on v24)
- npm 9+

### Installation
```bash
git clone https://github.com/your-username/guard.git
cd guard
npm install
```

### Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of FastAPI backend | `https://api.privacyguard.dev` |
| `VITE_APP_DOWNLOAD_URL` | Direct Android APK download URL | `https://download.privacyguard.dev/PrivacyGuard-v1.4.2.apk` |
| `VITE_APP_SHA256` | SHA-256 fingerprint of mobile APK | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `VITE_MOCK` | Enable offline mock simulation | `true` |

### Running the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Verifying Production Build
```bash
npm run build
```

---

## 5. Mock Mode vs. Real API

### Mock Mode (`VITE_MOCK=true`)
When `VITE_MOCK=true`, PrivacyGuard runs 100% offline without needing a live backend server:
- Simulates real stage-by-stage progression every 1.2s:
  1. `Uploading`
  2. `Reading manifest`
  3. `Comparing claim with permissions`
  4. `Benchmarking against similar apps`
  5. `Calculating risk score`
  6. `Complete`
- Provides pre-configured data for **Demo Notes** with Camera, Microphone, and Precise Location flagged as **Not Obviously Justified**.
- Includes a 1-click **"Load Demo APK"** button on the home page so anyone can test the full flow immediately.

### Switching to the Live Backend
1. Deploy your FastAPI service (or run locally on `http://localhost:8000`).
2. Update `.env`:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_MOCK=false
   ```
3. Restart the dev server (`npm run dev`).

---

## 6. Two-Minute Demo Script

Follow this step-by-step script for live presentations or video recordings:

1. **The Entrance (0:00 - 0:20):**
   - Open [http://localhost:5173](http://localhost:5173).
   - Point out the 3D scene: the glowing wireframe shield core and orbiting permission icons (Camera, Mic, GPS, Contacts, Storage, SMS).
   - Move the cursor gently to showcase the subtle 3D tilt and parallax bobbing on the floating glassmorphism panel.

2. **Loading the Audit (0:20 - 0:40):**
   - Click the **"Load Demo APK"** button on the top right of the card.
   - Show how it populates:
     - File: `DemoNotes.apk`
     - Claim: *"A clean note-taking app that lets users create, edit and save notes with markdown support."*
     - Category: `Notes`
     - Consent checkbox checked.
   - Click **"Start Privacy Audit"**.

3. **Backend Stages Choreography (0:40 - 1:00):**
   - Notice the camera pushes in toward the 3D shield core.
   - Watch the shield core accelerate and pulse as the real backend stages advance:
     - *Uploading (with percentage bar)*
     - *Reading manifest*
     - *Comparing claim with permissions*
     - *Benchmarking against similar apps*
     - *Calculating risk score*

4. **The Money Page: Report Walkthrough (1:00 - 1:30):**
   - Upon completion, the app navigates automatically to `/report/demo-notes`.
   - Point out the 3D score ring orbiting the shield core in the background, tinted in alert amber/orange.
   - Highlight:
     - **Risk Score:** `72 / 100` (High Concern / Requires Review).
     - **"Why this score" breakdown:** Show the 7-factor weights (50/10/10/10/10/5/5). Expand "Claim-to-Permission Divergence" to read the rationale. Note that "Runtime Dynamic Behavior" is plainly labeled as *Not Verified*.
     - **Three-Layer View:** Developer Claim vs Declared Permissions vs DEX Bytecode Evidence.
     - **Permission Audit Table:** Point out `CAMERA`, `RECORD_AUDIO`, and `ACCESS_FINE_LOCATION` flagged as **Not Obviously Justified** with <12% peer category adoption. Expand an evidence drawer to show the decompiled class trace.

5. **Exports & On-Device App Invitation (1:30 - 2:00):**
   - Click **"Download PDF"** to demonstrate instant client-side report export.
   - Click **"Download JSON"** to export raw audit data.
   - Click the locked **"Permission Dashboard"** button in the top navigation bar or the locked tiles at the bottom.
   - Show the accessible modal:
     - Explain the copy: *"Websites can't see which apps are installed on your phone or what permissions they have. The Android app can."*
     - On desktop: Show the generated QR code to scan with a phone camera.
     - Expand **"Verify the download (SHA-256)"** and copy the hash.
   - Click **"Not now"** to return smoothly to the report.

---

## 7. Wording Rules

PrivacyGuard adheres to strict analytical language:
- Never uses "malware detected", "dangerous" or "malicious".
- Uses "explains and flags for review".
- Core mantra: *"A permission request is a reason for review, never proof of malice."*

---

## 8. License & Principles

Released under the MIT License. Built for user sovereignty, verifiable privacy, and zero trackers.
