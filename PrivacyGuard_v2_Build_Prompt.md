# PrivacyGuard v2: 3D Website + Kotlin Android App, Real Data, 3-Component Score Engine

## TASK
Build PrivacyGuard v2: a 3D animated website and a Kotlin Android app, fully real-data, powered by the 3-component score engine.

## Product
PrivacyGuard ("Understand Before You Trust") is an explainable Android privacy auditing and monitoring platform for a cybersecurity hackathon (team "Shadow", HackBIOS).
Problem statement: "AI-Powered Permission Auditing Framework for Assessing Privacy Risk in Android Applications".

Deliver three connected parts:
1. WEBSITE (React + Vite + TypeScript + Tailwind + React Three Fiber/Three.js + Recharts)
2. ANDROID APP (Kotlin, Jetpack Compose, min SDK 26)
3. BACKEND (Python FastAPI + PostgreSQL), extending the existing scoring engine (PrivacyGuard_Scoring_Engine.zip)

The existing frontend (guard.zip) is the reference for the website's features, API contract and score direction. Read both zips first and summarize what already exists in 10 lines before coding. Reuse, do not rewrite, what already works.

## ABSOLUTE RULE: NO MOCK DATA
- No hardcoded apps, scores, permissions, charts, alerts, users or demo numbers anywhere.
- Every number on screen must come from the backend, the score engine, or the device.
- When there is no data, show a proper empty state ("No apps scanned yet. Upload an APK or install the Android app"), never fake placeholders.
- Loading, failed and empty states must exist for every screen.
- Tests may use fixtures, but the shipped app and site may not.

## Score Engine (use the real 3-component engine, do not reimplement)

```text
APK -> Androguard (extract permissions, declared vs used, components, flags)
   |-> RiskInDroid  -> ml_risk        (0-100, higher = riskier)
   |-> Heuristics   -> heuristic_risk (0-100, higher = riskier)
   |-> MobSF REST   -> static_risk = 100 - mobsf_security_score (verify direction)
   -> weighted blend 0.40 ml / 0.35 static / 0.25 heuristic, renormalized
      if a component is missing -> final risk score 0-100 + severity
      + explainable breakdown
```

- Higher score = higher privacy risk everywhere in the product. "Audit score" below means this final risk score.
- A preliminary result returns immediately; the MobSF result arrives async and updates the same scan (same response shape).

## ANDROID APP: Detection and Monitoring (be honest about Android limits)

### A. Detect installed target apps
- Request QUERY_ALL_PACKAGES (declare it; note it is restricted on Play Store but fine for a hackathon APK).
- On first launch, list all installed non-system apps and audit them one by one.
- Register a manifest BroadcastReceiver for ACTION_PACKAGE_ADDED / PACKAGE_REPLACED / PACKAGE_REMOVED, plus a WorkManager periodic fallback that diffs the package list, because broadcasts can be missed. On a new install or update, automatically audit it.
- Audit pipeline for an installed app: read its base APK from the package's sourceDir, upload it to the backend (POST /analyze), poll GET /analyze/{scan_id}, store the result locally (Room) and show a notification when done.
- Cache by APK SHA-256 so unchanged apps are not re-uploaded. Only upload with the user's consent (setting shown at onboarding).

### B. Runtime behaviour: foreground vs background
Build a MonitoringService (foreground service with a persistent notification, so Android keeps it alive) plus WorkManager jobs. Use ONLY APIs that a normal app can actually use:

1. Foreground/background timeline per app: UsageStatsManager.queryEvents (ACTIVITY_RESUMED / ACTIVITY_PAUSED, FOREGROUND_SERVICE_START/STOP). Requires the user to grant Usage Access (PACKAGE_USAGE_STATS); build a clear onboarding screen that opens Settings and detects when it is granted.
2. Granted permission state per app: PackageManager + AppOpsManager (mode check) to show which permissions are granted, and which are dangerous.
3. Live sensor use, correlated to the foreground app:
   - Microphone: AudioManager.registerAudioRecordingCallback (active recording detected)
   - Camera: CameraManager.AvailabilityCallback (camera in use / released)
   - Location: track active location sessions via the foreground app plus granted-permission state; use Android 12+ APIs only where they are public.
   - Correlate these events with the foreground package from step 1 and label confidence: "Observed" (direct signal), "Inferred" (correlated with foreground app), "Declared" (permission granted but no usage seen).
4. Network activity per app: NetworkStatsManager (needs usage access) for background vs foreground bytes; flag apps sending data while in the background.
5. Optional power-user mode (clearly labeled, off by default): if the device has Shizuku or an ADB-granted permission, read the AppOps history for exact per-app permission access times. Verify what each Android version actually allows; do not claim exact per-app access logs when running in standard mode.

Never claim the app sees something it cannot. Every permission-use record shows its evidence source and confidence in the UI.

### C. App screens (Jetpack Compose, 3D-feeling and animated)
- Onboarding (age category, permissions setup)
- Dashboard (overall device privacy health from real audited apps)
- App list (score, severity, installed/updated date)
- App detail (score breakdown from the 3 engine components, permissions table, foreground vs background timeline, sensor-use events, network use, trackers, top risk factors with plain-English explanations and suggested actions)
- Alerts feed
- Settings (consent, sync, parent link, data deletion)

Use Compose animations, depth/parallax cards, an animated score gauge and smooth transitions. For true 3D elements use a lightweight option (Filament, SceneView, or a Compose Canvas 3D effect), and keep it smooth on mid-range phones.

## USER CATEGORIES AND PARENT ALERTS

### Age categories
- At onboarding the user selects "18 and above" or "Below 18" (and enters date of birth to compute it). Store the category and DOB-derived flag only as needed. Be clear in the UI that this is self-declared.
- 18+: alerts stay on their own device/account only.
- Below 18: requires linking a parent/guardian BEFORE monitoring starts.

### Parent linking (consent-first)
- The child enters the parent's Gmail address. The backend sends a verification email with a one-time code/link; the parent must confirm and accept a consent notice.
- Shared: app name, audit score, risk level, key permissions flagged, timestamp.
- NOT shared: messages, photos, browsing, app content, location history.
- The child can always see which parent is linked and what was sent; the app shows a visible "Parental alerts enabled" indicator. No hidden monitoring.
- Parent can also open a small web page (parent portal on the website) via a magic link to see alert history. No password for the hackathon, but with expiring tokens.

### Alert rule
- When an audit completes for an app on an under-18 user's phone and the final audit score is 80 or above (configurable threshold in backend config, default 80), the backend sends an email alert to the verified parent Gmail address.
- Email contains: child's display name, app name and package, audit score and severity, the top 3 to 5 risk factors in plain English, which permissions are risky and whether the app uses them in the background (with evidence/confidence), recommended action, and a link to the full report in the parent portal. Clean HTML email with plain-text fallback.
- Also fire when a previously low-risk app updates and its score crosses 80.
- Deduplicate: one email per app version per threshold crossing; no spam. Log every email sent (status, timestamp) and show it in the child's Alerts feed too.
- Sending: Gmail SMTP with an app password, or the Gmail API via OAuth, configured through env vars (SMTP_USER, SMTP_APP_PASSWORD, PARENT_ALERT_THRESHOLD). Send from the backend, never from the app. Retry with backoff and a failed-send queue.

## BACKEND (FastAPI + PostgreSQL)
Endpoints (shape them to the existing frontend types where they overlap):
- POST /analyze (APK upload) and GET /analyze/{scan_id} (poll; preliminary then final)
- GET /apps/search?q= : real app search. Query Play Store listing metadata / Data Safety info when available and combine with stored audits (no fabricated results; if an app has not been scanned, say so and offer to scan it by APK upload)
- POST /devices/register, POST /devices/{id}/events (foreground/background usage events, sensor events, network stats batches from the app)
- POST /users/onboard (age category), POST /parent/link, POST /parent/verify, GET /parent/portal/{token}
- GET /alerts, GET /reports/{scan_id} (exportable PDF/JSON report)
- GET /health (status of Androguard, ML model, MobSF, DB, SMTP)

Other requirements:
- Tables: users, devices, apps, scans, scan_components, permission_events, usage_events, network_stats, alerts, parent_links, email_log.
- JWT auth for the app and website; rate limits; APK validation (extension, size, zip magic bytes); APKs processed as data only, never executed; temp files cleaned up.
- MobSF runs as a separate Docker service, called over REST only. Provide docker-compose with engine + MobSF + PostgreSQL.

## WEBSITE (3D, animated, real data)
Keep every feature from the existing website (guard.zip / PrivacyGuard_Website_Guide.md): APK upload with live progress, explainable risk score, score breakdown charts, permission analysis, app search with privacy score, reports. Add:
- Landing page with a 3D hero (React Three Fiber): a floating phone/shield scene that reacts to scroll and pointer, smooth section transitions (GSAP or Framer Motion), glassmorphism cards. Keep a reduced-motion fallback and good performance (lazy load 3D, cap pixel ratio).
- Dashboard (login): the user's real devices, audited apps, risk distribution (Recharts), alert history, per-app detail with foreground vs background timeline and sensor events from the Android app.
- Age-aware views: under-18 accounts show the parental-link status and what is shared; the parent portal page shows alert history and full reports.
- Live scan view: animated pipeline (Androguard -> RiskInDroid -> Heuristics -> MobSF) showing the real status of each engine component as it completes.
- Fully responsive. Theme consistent with the Android app. Empty, loading and error states everywhere.

## PRIVACY AND SAFETY REQUIREMENTS
- Explicit consent screens before uploading APKs or sharing data with a parent.
- Data minimization: collect only what the features need; provide "delete my data" in the app and on the site.
- No hidden or stealth behavior: persistent notification while monitoring, visible status indicators.
- Do not collect message content, photos, browsing history or location history.
- Include a short privacy policy page describing exactly this.

## DELIVERABLES
1. /backend (FastAPI, engine integration, Alembic migrations, Dockerfile, docker-compose with MobSF + PostgreSQL, .env.example, tests)
2. /web (React + R3F site, API client matching backend schemas)
3. /android (Kotlin/Compose project, Room, WorkManager, Retrofit, services and receivers, permissions onboarding)
4. README.md with run steps, architecture diagram, API reference, how each Android monitoring signal works, the limits per Android version, and a test checklist.
5. A final report: what is real vs limited, any frontend-contract mismatch, assumptions made, and anything that could not be verified.

## RULES
- No mock data (see above). If something cannot be done with real data, show an honest empty or "not available on this device" state.
- If an Android API behaves differently than described here on the installed SDK, verify and tell me instead of guessing.
- Verify library versions and APIs against the actual packages before using them.
- Keep the code readable and the demo reliable on a laptop and a real phone.
