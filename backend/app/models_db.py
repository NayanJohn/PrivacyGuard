import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from .database import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    display_name = Column(String(128), nullable=False, default="Android User")
    age_category = Column(String(32), nullable=False, default="adult")  # "adult" or "minor"
    dob = Column(String(32), nullable=True)
    dob_flag = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")
    scans = relationship("Scan", back_populates="user")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    parent_links = relationship("ParentLink", back_populates="user", cascade="all, delete-orphan")

class Device(Base):
    __tablename__ = "devices"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    model = Column(String(128), nullable=False, default="Android Device")
    android_version = Column(String(32), nullable=False, default="14")
    last_seen = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="devices")
    scans = relationship("Scan", back_populates="device")
    permission_events = relationship("PermissionEvent", back_populates="device", cascade="all, delete-orphan")
    usage_events = relationship("UsageEvent", back_populates="device", cascade="all, delete-orphan")
    network_stats = relationship("NetworkStat", back_populates="device", cascade="all, delete-orphan")

class App(Base):
    __tablename__ = "apps"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    package_name = Column(String(256), nullable=False, index=True)
    app_name = Column(String(256), nullable=False)
    version_name = Column(String(64), nullable=False, default="1.0.0")
    apk_sha256 = Column(String(64), nullable=False, unique=True, index=True)
    min_sdk = Column(Integer, default=26)
    target_sdk = Column(Integer, default=34)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    scans = relationship("Scan", back_populates="app", cascade="all, delete-orphan")

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    app_id = Column(String(64), ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    device_id = Column(String(64), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    final_score = Column(Integer, nullable=False, default=0)
    severity = Column(String(32), nullable=False, default="low")  # low, medium, high, critical
    mobsf_status = Column(String(32), nullable=False, default="pending")  # pending, complete, unavailable, failed
    complete = Column(Boolean, default=False)
    claim = Column(Text, default="")
    category = Column(String(128), default="Utilities & Tools")
    result_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    app = relationship("App", back_populates="scans")
    device = relationship("Device", back_populates="scans")
    user = relationship("User", back_populates="scans")
    components = relationship("ScanComponent", back_populates="scan", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="scan")

class ScanComponent(Base):
    __tablename__ = "scan_components"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    scan_id = Column(String(64), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    component_name = Column(String(64), nullable=False)  # ml, static, heuristic
    score_value = Column(Float, nullable=False, default=0.0)
    weight = Column(Float, nullable=False, default=0.0)
    status = Column(String(32), default="complete")  # complete, pending, unavailable
    reasons_json = Column(JSON, nullable=True)

    scan = relationship("Scan", back_populates="components")

class PermissionEvent(Base):
    __tablename__ = "permission_events"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    device_id = Column(String(64), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True)
    package_name = Column(String(256), nullable=False, index=True)
    permission = Column(String(256), nullable=False)
    state = Column(String(32), default="declared")  # observed, inferred, declared
    fg_bg = Column(String(32), default="foreground")  # foreground, background
    timestamp = Column(DateTime(timezone=True), default=utc_now)

    device = relationship("Device", back_populates="permission_events")

class UsageEvent(Base):
    __tablename__ = "usage_events"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    device_id = Column(String(64), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True)
    package_name = Column(String(256), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)  # resumed, paused, fg_service_start, fg_service_stop
    timestamp = Column(DateTime(timezone=True), default=utc_now)

    device = relationship("Device", back_populates="usage_events")

class NetworkStat(Base):
    __tablename__ = "network_stats"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    device_id = Column(String(64), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True)
    package_name = Column(String(256), nullable=False, index=True)
    fg_bytes = Column(Integer, default=0)
    bg_bytes = Column(Integer, default=0)
    window_start = Column(DateTime(timezone=True), default=utc_now)
    timestamp = Column(DateTime(timezone=True), default=utc_now)

    device = relationship("Device", back_populates="network_stats")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    device_id = Column(String(64), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    scan_id = Column(String(64), ForeignKey("scans.id", ondelete="SET NULL"), nullable=True)
    app_name = Column(String(256), nullable=False)
    package_name = Column(String(256), nullable=False)
    score = Column(Integer, nullable=False, default=0)
    severity = Column(String(32), nullable=False, default="critical")
    title = Column(String(256), nullable=False)
    message = Column(Text, nullable=False)
    kind = Column(String(64), default="high_risk_app")  # high_risk_app, background_leak, permission_escalation
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="alerts")
    scan = relationship("Scan", back_populates="alerts")
    email_logs = relationship("EmailLog", back_populates="alert", cascade="all, delete-orphan")

class ParentLink(Base):
    __tablename__ = "parent_links"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_email = Column(String(256), nullable=False)
    verification_code = Column(String(16), nullable=False)
    magic_token = Column(String(64), nullable=False, unique=True, index=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    consent_version = Column(String(32), default="v1.0")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="parent_links")

class EmailLog(Base):
    __tablename__ = "email_log"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    alert_id = Column(String(64), ForeignKey("alerts.id", ondelete="CASCADE"), nullable=True, index=True)
    recipient = Column(String(256), nullable=False)
    subject = Column(String(256), nullable=False)
    status = Column(String(32), default="pending")  # sent, failed, retry
    attempts = Column(Integer, default=1)
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime(timezone=True), default=utc_now)

    alert = relationship("Alert", back_populates="email_logs")
