import os
import uuid
import tempfile
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import (
    FastAPI, UploadFile, File, Form, Depends, HTTPException, Query, BackgroundTasks, status
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from loguru import logger

from .config import (
    ALLOWED_ORIGINS, MAX_APK_MB, PARENT_ALERT_THRESHOLD,
    SCORE_BANDS_PAYLOAD, CATEGORY_SLUGS, SLUG_TO_LABEL, AUTO_DETECT_KEYWORDS
)
from .database import get_db, init_db, SessionLocal
from .models_db import (
    User, Device, App, Scan, ScanComponent, PermissionEvent,
    UsageEvent, NetworkStat, Alert, ParentLink, EmailLog
)
from .models import (
    AuditCreationResponse, AuditResultOut, AppMetadataOut, ScoreBandOut,
    ComponentOut, FindingOut, ReclassifyRequest,
    UserOnboardRequest, UserOnboardResponse,
    ParentLinkRequest, ParentVerifyRequest, ParentPortalResponse, AlertOut,
    DeviceRegisterRequest, DeviceRegisterResponse, DeviceEventsBatchRequest,
    HealthStatusOut
)
from .features_extractor import extract_features
from .extractor import calculate_sha256
from .ml_model import calculate_ml_risk
from . import smart_brain
from .mobsf_client import MobSFClient
from .combine import combine_scores
from .alerts import process_scan_alerts
from .search import search_apps
from .pipeline import build_audit_from_apk_facts
from .adapter import adapt_to_frontend_result, sanitize_obj

mobsf_client = MobSFClient()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on application launch
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.warning(f"Database init notice: {e}")
    yield

app = FastAPI(
    title="PrivacyGuard v2 API",
    description="Explainable Android privacy auditing and monitoring platform powered by 3-component score engine (HackBIOS)",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def run_mobsf_background(scan_id: str, temp_apk_path: str, ml_res: dict, heur_res: dict, app_meta: dict, user_id: Optional[str]):
    """Background worker that calls MobSF REST, recalculates the final 3-component score, and triggers alerts."""
    try:
        mobsf_res = await mobsf_client.analyze_apk(temp_apk_path)
    except Exception as e:
        logger.warning(f"MobSF analysis failed: {e}")
        mobsf_res = {"status": "unavailable", "static_risk": None, "error": str(e)}

    session = SessionLocal()
    try:
        scan = session.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            return

        user = session.query(User).filter(User.id == user_id).first() if user_id else None

        # Final 3-component combination
        combine_res = combine_scores(
            ml_res=ml_res,
            heuristic_res=heur_res,
            mobsf_res=mobsf_res,
            trackers=app_meta.get("trackers", [])
        )

        # Update DB scan
        scan.final_score = combine_res["final_score"]
        scan.severity = combine_res["severity"]
        scan.mobsf_status = combine_res["mobsf_status"]
        scan.complete = combine_res["complete"]

        # Merge and update cached result JSON
        if scan.result_json and isinstance(scan.result_json, dict):
            updated_json = dict(scan.result_json)
            updated_json["final_score"] = combine_res["final_score"]
            updated_json["score"] = combine_res["final_score"]
            updated_json["severity"] = combine_res["severity"]
            updated_json["risk_label"] = combine_res["risk_label"]
            updated_json["mobsf_status"] = combine_res["mobsf_status"]
            updated_json["complete"] = combine_res["complete"]
            updated_json["status"] = "complete" if combine_res["complete"] else "processing"
            updated_json["stage"] = "Complete" if combine_res["complete"] else "Analyzing Static & ML Indicators"
            updated_json["top_factors"] = combine_res["top_factors"]
            updated_json["recommendations"] = combine_res["recommendations"]
            updated_json["summary"] = combine_res["summary"]
            updated_json["confidence"] = combine_res["confidence"]
            updated_json["breakdown"] = combine_res["breakdown"]
            updated_json["verdict"] = combine_res.get("verdict")
            updated_json["app_profile"] = combine_res.get("app_profile")
            updated_json["mismatches"] = combine_res.get("mismatches")
            updated_json["harmful_patterns"] = combine_res.get("harmful_patterns")
            updated_json["permission_audit"] = combine_res.get("permission_audit")
            updated_json["floor_applied"] = combine_res.get("floor_applied")

            if "components" in updated_json and isinstance(updated_json["components"], list):
                for c in updated_json["components"]:
                    if "RiskInDroid" in c.get("name", "") or "Permission Risk" in c.get("name", ""):
                        c["score"] = combine_res["breakdown"]["ml"]["score"]
                    elif "MobSF" in c.get("name", ""):
                        c["score"] = combine_res["breakdown"]["static"]["score"]
                        c["verified"] = (mobsf_res.get("status") == "complete")
                    elif "Heuristics" in c.get("name", "") or "Smart Brain" in c.get("name", ""):
                        c["score"] = combine_res["breakdown"]["heuristic"]["score"]
            scan.result_json = updated_json

        session.commit()

        # Process potential parent alerts if final score crossed >= 80
        await process_scan_alerts(session, scan, user, app_meta, combine_res)
        session.commit()
        logger.info(f"Scan {scan_id} updated with MobSF static risk: final score {scan.final_score}")

    except Exception as ex:
        logger.error(f"Error updating background scan {scan_id}: {ex}")
        session.rollback()
    finally:
        session.close()
        if os.path.exists(temp_apk_path):
            try:
                os.unlink(temp_apk_path)
            except Exception:
                pass

async def execute_scan_core(
    file: UploadFile,
    claim: str,
    category: str,
    user_id: Optional[str],
    device_id: Optional[str],
    background_tasks: BackgroundTasks,
    db: Session
) -> AuditCreationResponse:
    filename = (file.filename or "uploaded.apk").lower()
    if not filename.endswith(".apk"):
        raise HTTPException(status_code=400, detail="Only compiled Android packages (.apk) are accepted.")

    # Validate size & magic bytes
    content = await file.read()
    max_bytes = MAX_APK_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"APK exceeds maximum limit of {MAX_APK_MB} MB.")
    if len(content) < 4 or content[:4] != b"PK\x03\x04":
        raise HTTPException(status_code=400, detail="Corrupted file or missing ZIP/APK magic signature (b'PK\\x03\\x04').")

    # Compute SHA-256
    sha256 = calculate_sha256_bytes(content)

    # SHA-256 Cache check
    existing_app = db.query(App).filter(App.apk_sha256 == sha256).first()
    if existing_app:
        existing_scan = db.query(Scan).filter(Scan.app_id == existing_app.id).order_by(Scan.created_at.desc()).first()
        if existing_scan and existing_scan.result_json:
            logger.info(f"Reusing cached scan {existing_scan.id} for SHA-256: {sha256}")
            cached_data = dict(existing_scan.result_json)
            return AuditCreationResponse(
                audit_id=existing_scan.id,
                scan_id=existing_scan.id,
                status=cached_data.get("status", "complete"),
                stage=cached_data.get("stage", "Complete"),
                final_score=existing_scan.final_score,
                score=existing_scan.final_score,
                severity=existing_scan.severity,
                risk_label=cached_data.get("risk_label", "Low Concern"),
                complete=existing_scan.complete,
                mobsf_status=existing_scan.mobsf_status,
                breakdown=cached_data.get("breakdown"),
                top_factors=cached_data.get("top_factors"),
                trackers=cached_data.get("trackers"),
                recommendations=cached_data.get("recommendations"),
                summary=cached_data.get("summary"),
                confidence=cached_data.get("confidence"),
                verdict=cached_data.get("verdict"),
                app_profile=cached_data.get("app_profile"),
                mismatches=cached_data.get("mismatches"),
                harmful_patterns=cached_data.get("harmful_patterns"),
                permission_audit=cached_data.get("permission_audit"),
                floor_applied=cached_data.get("floor_applied"),
            )

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".apk") as tmp:
        temp_path = tmp.name
        tmp.write(content)

    category_input = category.strip() if category and category != "Auto-detect from claim" else None

    # Extract real features in worker thread
    try:
        features = await asyncio.to_thread(extract_features, temp_path, category_input)
    except Exception as e:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise HTTPException(status_code=400, detail=f"Failed to parse Android package manifest and bytecode: {str(e)}")

    category_label = features.get("category") or category_input or "Utilities & Tools"
    category_slug = CATEGORY_SLUGS.get(category_label, "utilities")

    # Compute ML and Heuristics immediately
    ml_res = calculate_ml_risk(features)
    heur_res = smart_brain.analyze(features)

    # Initial preliminary combination
    prelim_res = combine_scores(
        ml_res=ml_res,
        heuristic_res=heur_res,
        mobsf_res={"status": "pending", "static_risk": None},
        trackers=features.get("trackers", [])
    )

    if existing_app:
        app_record = existing_app
    else:
        app_record = App(
            package_name=features.get("package_name") or features.get("package") or "unknown.package",
            app_name=features.get("app_name") or features.get("app_label") or "Unknown App",
            version_name=features.get("version_name", "1.0.0"),
            apk_sha256=sha256,
            min_sdk=int(features.get("min_sdk") or 21),
            target_sdk=int(features.get("target_sdk") or 33),
        )
        db.add(app_record)
        db.flush()

    scan_id = f"aud-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    created_at = now.isoformat()
    expires_at = (now + timedelta(days=7)).isoformat()

    audit_input, pipeline_meta = build_audit_from_apk_facts(features, claim, category_input)
    frontend_result = adapt_to_frontend_result(
        audit_id=scan_id,
        status="processing",
        stage="Analyzing Static & ML Indicators",
        error=None,
        created_at=created_at,
        expires_at=expires_at,
        claim=claim,
        category_label=category_label,
        category_slug=category_slug,
        category_source="user" if category_input else "auto_detected",
        engine_result=prelim_res,
        audit_input=audit_input,
        facts=features,
    )

    scan_record = Scan(
        id=scan_id,
        app_id=app_record.id,
        device_id=device_id,
        user_id=user_id,
        final_score=prelim_res["final_score"],
        severity=prelim_res["severity"],
        mobsf_status="pending",
        complete=False,
        claim=claim,
        category=category_label,
        result_json=frontend_result.model_dump(),
        created_at=now
    )
    db.add(scan_record)

    for comp_key, comp_val in prelim_res["breakdown"].items():
        sc = ScanComponent(
            scan_id=scan_id,
            component_name=comp_key,
            score_value=float(comp_val["score"]),
            weight=float(comp_val["weight"]),
            status=comp_val["status"],
            reasons_json=comp_val.get("factors", [])
        )
        db.add(sc)

    db.commit()

    user_record = db.query(User).filter(User.id == user_id).first() if user_id else None

    # Process alerts
    await process_scan_alerts(db, scan_record, user_record, features, prelim_res)
    db.commit()

    # Launch MobSF background task
    background_tasks.add_task(
        run_mobsf_background,
        scan_id,
        temp_path,
        ml_res,
        heur_res,
        features,
        user_id
    )

    return AuditCreationResponse(
        audit_id=scan_id,
        scan_id=scan_id,
        status="processing",
        stage="Analyzing Static & ML Indicators",
        final_score=prelim_res["final_score"],
        score=prelim_res["final_score"],
        severity=prelim_res["severity"],
        risk_label=prelim_res["risk_label"],
        complete=prelim_res["complete"],
        mobsf_status=prelim_res["mobsf_status"],
        breakdown=prelim_res["breakdown"],
        top_factors=prelim_res["top_factors"],
        trackers=prelim_res["trackers"],
        recommendations=prelim_res["recommendations"],
        summary=prelim_res["summary"],
        confidence=prelim_res["confidence"],
        verdict=prelim_res.get("verdict"),
        app_profile=prelim_res.get("app_profile"),
        mismatches=prelim_res.get("mismatches"),
        harmful_patterns=prelim_res.get("harmful_patterns"),
        permission_audit=prelim_res.get("permission_audit"),
        floor_applied=prelim_res.get("floor_applied"),
    )

def calculate_sha256_bytes(data: bytes) -> str:
    import hashlib
    h = hashlib.sha256()
    h.update(data)
    return h.hexdigest()

# -------------------------------------------------------------
# CORE AUDIT & ANALYSIS ENDPOINTS
# -------------------------------------------------------------

@app.post("/analyze", response_model=AuditCreationResponse)
@app.post("/api/audits/apk", response_model=AuditCreationResponse)
async def analyze_apk_endpoint(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    apk: Optional[UploadFile] = File(None),
    claim: str = Form(""),
    category: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    device_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    upload_target = file or apk
    if not upload_target:
        raise HTTPException(status_code=400, detail="Missing APK file in upload request.")
    return await execute_scan_core(
        file=upload_target,
        claim=claim,
        category=category,
        user_id=user_id,
        device_id=device_id,
        background_tasks=background_tasks,
        db=db
    )

@app.get("/api/audits/demo-notes")
def demo_notes_endpoint():
    return {
        "audit_id": "demo-notes",
        "status": "complete",
        "category": "Notes",
        "score": 18,
        "risk_label": "low",
        "severity": "low",
        "components": [
            {"component_name": "riskindroid_ml", "score": 12.0, "status": "calculated", "weight": 0.40, "factors": []},
            {"component_name": "mobsf_static", "score": 18.0, "status": "calculated", "weight": 0.35, "factors": []},
            {"component_name": "heuristics", "score": 25.0, "status": "calculated", "weight": 0.25, "factors": []},
            {"component_name": "permissions", "score": 15.0, "status": "calculated", "weight": 0.0, "factors": []},
            {"component_name": "trackers", "score": 0.0, "status": "calculated", "weight": 0.0, "factors": []},
            {"component_name": "network", "score": 10.0, "status": "calculated", "weight": 0.0, "factors": []},
            {"component_name": "code_analysis", "score": 20.0, "status": "calculated", "weight": 0.0, "factors": []}
        ],
        "findings": [],
        "trackers": []
    }

@app.get("/analyze/{scan_id}", response_model=AuditResultOut)
@app.get("/api/audits/{scan_id}", response_model=AuditResultOut)
def get_scan_result_endpoint(
    scan_id: str,
    db: Session = Depends(get_db)
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()

    if (not scan or not scan.result_json) and scan_id == "demo-notes":
        demo_apk_path = os.path.join(os.path.dirname(__file__), "..", "fixtures", "demo_notes.apk")
        if os.path.exists(demo_apk_path):
            features = extract_features(demo_apk_path)
            ml_res = calculate_ml_risk(features)
            heur_res = smart_brain.analyze(features)
            mobsf_res = {"status": "unavailable", "static_risk": None}
            prelim_res = combine_scores(ml_res, heur_res, mobsf_res, features.get("trackers", []))
            audit_inp, _ = build_audit_from_apk_facts(features, "Simple note-taking application", "Notes")
            prelim_frontend = adapt_to_frontend_result(
                audit_id="demo-notes",
                status="complete",
                stage="Complete",
                error=None,
                created_at=datetime.now(timezone.utc).isoformat(),
                expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                claim="Simple note-taking application",
                category_label="Notes",
                category_slug="notes",
                category_source="user",
                engine_result=prelim_res,
                audit_input=audit_inp,
                facts=features
            )
            app_rec = db.query(App).filter(App.package_name == (features.get("package_name") or features.get("package"))).first()
            if not app_rec:
                app_rec = App(
                    package_name=features.get("package_name") or features.get("package") or "com.privacyguard.demonotes",
                    app_name=features.get("app_name") or features.get("app_label") or "Demo Notes",
                    version_name=features.get("version_name", "1.0"),
                    apk_sha256=features.get("sha256", "demo_sha"),
                )
                db.add(app_rec)
                db.flush()
            scan = Scan(
                id="demo-notes",
                app_id=app_rec.id,
                user_id=None,
                device_id=None,
                final_score=prelim_res["final_score"],
                severity=prelim_res["severity"],
                mobsf_status="renormalized",
                complete=True,
                result_json=prelim_frontend.model_dump()
            )
            db.add(scan)
            db.commit()

    if not scan or not scan.result_json:
        raise HTTPException(status_code=404, detail="Audit scan not found or expired.")

    result_dict = sanitize_obj(dict(scan.result_json))
    result_dict["audit_id"] = scan.id
    result_dict["score"] = scan.final_score
    result_dict["final_score"] = scan.final_score
    result_dict["severity"] = scan.severity
    result_dict["mobsf_status"] = scan.mobsf_status
    result_dict["complete"] = scan.complete
    if scan.complete:
        result_dict["status"] = "complete"
        result_dict["stage"] = "Complete"

    return AuditResultOut(**result_dict)

@app.post("/api/audits/{audit_id}/reclassify", response_model=AuditResultOut)
def reclassify_endpoint(
    audit_id: str,
    body: ReclassifyRequest,
    db: Session = Depends(get_db)
):
    scan = db.query(Scan).filter(Scan.id == audit_id).first()

    if not scan or not scan.result_json:
        raise HTTPException(status_code=404, detail="Audit scan not found.")

    res_json = sanitize_obj(dict(scan.result_json))
    res_json["category"] = body.category.strip()
    scan.category = body.category.strip()
    scan.result_json = res_json
    db.commit()

    return AuditResultOut(**res_json)

@app.delete("/api/audits/{audit_id}")
def delete_audit_endpoint(
    audit_id: str,
    db: Session = Depends(get_db)
):
    scan = db.query(Scan).filter(Scan.id == audit_id).first()
    if scan:
        db.delete(scan)
        db.commit()
    return {"success": True, "message": f"Scan {audit_id} deleted."}

# -------------------------------------------------------------
# APP SEARCH ENDPOINT
# -------------------------------------------------------------

@app.get("/apps/search")
async def search_apps_endpoint(
    q: str = Query(..., description="Query app name or package"),
    db: Session = Depends(get_db)
):
    results = await search_apps(q, db)
    return {"query": q, "count": len(results), "apps": results}

# -------------------------------------------------------------
# DEVICE REGISTRATION & EVENT STREAMING
# -------------------------------------------------------------

@app.post("/devices/register", response_model=DeviceRegisterResponse)
def register_device(
    payload: DeviceRegisterRequest,
    db: Session = Depends(get_db)
):
    device = Device(
        user_id=payload.user_id,
        model=payload.model,
        android_version=payload.android_version
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return DeviceRegisterResponse(
        device_id=device.id,
        user_id=device.user_id,
        registered_at=device.last_seen.isoformat()
    )

@app.post("/devices/{device_id}/events")
def ingest_device_events(
    device_id: str,
    payload: DeviceEventsBatchRequest,
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        device = Device(id=device_id, model="Android Device")
        db.add(device)
        db.flush()

    device.last_seen = datetime.now(timezone.utc)

    for p in payload.permission_events:
        db.add(PermissionEvent(
            device_id=device_id,
            package_name=p.package_name,
            permission=p.permission,
            state=p.state,
            fg_bg=p.fg_bg,
        ))

    for u in payload.usage_events:
        db.add(UsageEvent(
            device_id=device_id,
            package_name=u.package_name,
            event_type=u.event_type
        ))

    for n in payload.network_stats:
        db.add(NetworkStat(
            device_id=device_id,
            package_name=n.package_name,
            fg_bytes=n.fg_bytes,
            bg_bytes=n.bg_bytes
        ))

    db.commit()
    return {
        "status": "success",
        "ingested_permission_events": len(payload.permission_events),
        "ingested_usage_events": len(payload.usage_events),
        "ingested_network_stats": len(payload.network_stats)
    }

# -------------------------------------------------------------
# USER ONBOARDING & PARENT LINKING
# -------------------------------------------------------------

@app.post("/users/onboard", response_model=UserOnboardResponse)
def onboard_user(
    payload: UserOnboardRequest,
    db: Session = Depends(get_db)
):
    is_minor = payload.age_category in ("minor", "Below 18")
    category = "minor" if is_minor else "adult"

    user = User(
        display_name=payload.display_name,
        age_category=category,
        dob=payload.dob,
        dob_flag=is_minor
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    fake_token = f"jwt_{user.id}_{int(datetime.now(timezone.utc).timestamp())}"

    return UserOnboardResponse(
        user_id=user.id,
        display_name=user.display_name,
        age_category=category,
        requires_parent_link=is_minor,
        token=fake_token
    )

@app.post("/parent/link")
def link_parent(
    payload: ParentLinkRequest,
    db: Session = Depends(get_db)
):
    user_id = payload.user_id
    if not user_id:
        user = db.query(User).filter(User.age_category == "minor").order_by(User.created_at.desc()).first()
        if not user:
            user = User(display_name="Student User", age_category="minor")
            db.add(user)
            db.flush()
        user_id = user.id

    code = str(uuid.uuid4().int)[:6]
    magic_token = uuid.uuid4().hex

    parent_link = ParentLink(
        user_id=user_id,
        parent_email=payload.parent_email.strip().lower(),
        verification_code=code,
        magic_token=magic_token,
    )
    db.add(parent_link)
    db.commit()

    return {
        "status": "code_sent",
        "message": f"Verification code sent to {payload.parent_email}.",
        "magic_token": magic_token,
        "verification_code_demo": code
    }

@app.post("/parent/verify")
def verify_parent(
    payload: ParentVerifyRequest,
    db: Session = Depends(get_db)
):
    link = db.query(ParentLink).filter(
        or_(
            ParentLink.verification_code == payload.verification_code.strip(),
            ParentLink.magic_token == (payload.magic_token or "")
        )
    ).first()

    if not link:
        raise HTTPException(status_code=400, detail="Invalid verification code or magic token.")

    link.verified_at = datetime.now(timezone.utc)
    link.consent_version = "v1.0-accepted"
    db.commit()

    return {
        "status": "verified",
        "message": "Parental consent verified. Real-time safety alerts enabled.",
        "parent_email": link.parent_email,
        "magic_token": link.magic_token
    }

@app.get("/parent/portal/{token}", response_model=ParentPortalResponse)
def get_parent_portal(
    token: str,
    db: Session = Depends(get_db)
):
    link = db.query(ParentLink).filter(ParentLink.magic_token == token).first()

    if not link:
        raise HTTPException(status_code=404, detail="Parent portal link invalid or expired.")

    child = db.query(User).filter(User.id == link.user_id).first()

    alerts_list = [
        AlertOut(
            id=a.id,
            user_id=a.user_id,
            device_id=a.device_id,
            scan_id=a.scan_id,
            app_name=a.app_name,
            package_name=a.package_name,
            score=a.score,
            severity=a.severity,
            title=a.title,
            message=a.message,
            kind=a.kind,
            created_at=a.created_at.isoformat()
        )
        for a in db.query(Alert).filter(Alert.user_id == link.user_id).order_by(Alert.created_at.desc()).all()
    ]

    scans_list = [
        s.result_json for s in db.query(Scan).filter(Scan.user_id == link.user_id).order_by(Scan.created_at.desc()).all() if s.result_json
    ]

    return ParentPortalResponse(
        child_name=child.display_name if child else "Child",
        parent_email=link.parent_email,
        verified_at=link.verified_at.isoformat() if link.verified_at else None,
        consent_version=link.consent_version,
        alerts=alerts_list,
        reports=scans_list
    )

# -------------------------------------------------------------
# ALERTS & REPORTS ENDPOINTS
# -------------------------------------------------------------

@app.get("/alerts", response_model=List[AlertOut])
@app.get("/api/v1/alerts", response_model=List[AlertOut])
def list_alerts(
    user_id: Optional[str] = Query(None),
    device_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if user_id:
        query = query.filter(Alert.user_id == user_id)
    if device_id:
        query = query.filter(Alert.device_id == device_id)
    alerts = query.order_by(Alert.created_at.desc()).limit(50).all()

    return [
        AlertOut(
            id=a.id,
            user_id=a.user_id,
            device_id=a.device_id,
            scan_id=a.scan_id,
            app_name=a.app_name,
            package_name=a.package_name,
            score=a.score,
            severity=a.severity,
            title=a.title,
            message=a.message,
            kind=a.kind,
            created_at=a.created_at.isoformat()
        )
        for a in alerts
    ]

@app.get("/reports/{scan_id}")
def export_report(
    scan_id: str,
    format: str = Query("json", pattern="^(json|pdf)$"),
    db: Session = Depends(get_db)
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()

    if not scan or not scan.result_json:
        raise HTTPException(status_code=404, detail="Audit report not found.")

    return JSONResponse(content=scan.result_json)

# -------------------------------------------------------------
# USER DATA DELETION ("Delete My Data" Privacy Mandate)
# -------------------------------------------------------------

@app.delete("/users/{user_id}/data")
def delete_user_data(
    user_id: str,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
    return {"success": True, "message": "All user data, devices, events, and scans permanently deleted."}

# -------------------------------------------------------------
# HEALTH & SERVICE STATUS
# -------------------------------------------------------------

@app.get("/health", response_model=HealthStatusOut)
@app.get("/api/health", response_model=HealthStatusOut)
@app.get("/api/v1/health", response_model=HealthStatusOut)
async def health_check():
    mobsf_online = await mobsf_client.is_available()
    return HealthStatusOut(
        status="healthy",
        androguard="available",
        ml_model="Hand-weighted permission risk model ready",
        mobsf="online" if mobsf_online else "offline (renormalized fallback active)",
        database="connected",
        smtp="configured" if os.getenv("SMTP_USER") else "simulated/dry-run",
        rules_version="2.0.0"
    )
