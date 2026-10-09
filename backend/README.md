# PrivacyGuard — Scoring Engine (FastAPI)

PrivacyGuard provides transparent, explainable privacy risk scoring for Android APK packages. It evaluates declared permissions against developer claims and peer store category benchmarks without executing bytecode on external servers.

---

## Architecture & Scoring Formula

### Component Weights (50 / 10 / 10 / 10 / 10 / 5 / 5)

| # | Component Name (UI) | Weight | Engine Source | Static Status | Evaluation Scope |
|---|---|---|---|---|---|
| 1 | **Claim-to-Permission Divergence** | 50% | `static` | Verified | Natural language analysis comparing stated capabilities with low-level permissions. |
| 2 | **Peer Category Benchmark Deviation** | 10% | `benchmark` | Verified | Deviation from peer applications in the same store category. |
| 3 | **Sensitive Data Scope** | 10% | `privacy` | Verified | Broad permissions (e.g. fine GPS, shared storage) vs modern scoped APIs. |
| 4 | **Third-Party SDK Surface** | 10% | `tracker` | Verified | Embedded analytics, ad exchanges, and behavioral profiling SDKs in bytecode. |
| 5 | **Runtime Dynamic Behavior** | 10% | `runtime` | Not Verified | Dynamic prompt observation and network transfers (monitored by on-device app). |
| 6 | **Source Verification** | 5% | `source` | Not Verified | Cryptographic official app store signatures vs unverified file uploads. |
| 7 | **Security Configuration** | 5% | `security` | Verified | Target SDK, exported components without permissions, debuggable and cleartext flags. |

### Static Scoring Math

```
Final Risk Score =
  0.50 * Static +
  0.10 * Benchmark +
  0.10 * Runtime +
  0.10 * Tracker +
  0.10 * Privacy +
  0.05 * Source +
  0.05 * Security

Static Component =
  0.45 * Permission Sensitivity +
  0.35 * Claim Mismatch +
  0.10 * Unprotected Exported Components +
  0.10 * Security Metadata
```

### Risk & Confidence Separation

- **Observed:** 1.0 evidence factor (contributes fully to risk).
- **Inferred:** 0.65 evidence factor (contributes partially to risk).
- **Not Verified:** 0.0 evidence factor (**never adds risk points**).
- Confidence separately reflects evidence completeness: `confidence = mean(evidence_factors) * 100`.

---

## Risk Classification Bands (4 Bands)

| Range | Label | Color | Description |
|---|---|---|---|
| 0–20 | **Low Concern** | `#10b981` | Permissions closely match stated claims and category baselines. |
| 21–45 | **Moderate Concern** | `#3b82f6` | Some optional permissions declared beyond standard baseline. |
| 46–70 | **Elevated Concern** | `#f59e0b` | Sensitive declarations deviate noticeably from peer apps. |
| 71–100 | **High Concern (Requires Review)** | `#f97316` | Marked divergence between declared permissions and declared claims. |

---

## API Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/audits/apk` | Multipart upload (`apk`, `claim`, `category`). Returns `{ audit_id, status: "queued", stage: "Uploading" }`. |
| `GET` | `/api/audits/{audit_id}` | Poll current audit status or fetch completed report (`AuditResult`). |
| `POST` | `/api/audits/{audit_id}/reclassify` | Re-evaluate audit under a new category `{ "category": "..." }`. |
| `DELETE` | `/api/audits/{audit_id}` | Immediately purge report from memory. |
| `GET` | `/health` | Health check (`{"status": "ok"}`). |
| `POST` | `/score` | Direct scoring calculation from raw `AuditInput` payload. |

---

## Configuration & Environment Variables

- `ALLOWED_ORIGINS`: Comma-separated CORS allowed origins.  
  *Default:* `http://localhost:5173,http://127.0.0.1:5173`

---

## Running Locally

### 1. Setup Python Virtual Environment

```bash
cd privacyguard_scoring_engine
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Run the Engine

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive OpenAPI docs: `http://localhost:8000/docs`

### 3. Connect with the Frontend

In the React app (`guard/`):

1. Set `.env`:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_MOCK=false
   ```
2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` to upload APKs and inspect live forensic privacy audits.

---

## Running Tests

```bash
pytest
```
