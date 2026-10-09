"""initial schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-09 00:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('display_name', sa.String(128), nullable=False),
        sa.Column('age_category', sa.String(32), nullable=False),
        sa.Column('dob', sa.String(32), nullable=True),
        sa.Column('dob_flag', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True)
    )

    # Devices table
    op.create_table(
        'devices',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('model', sa.String(128), nullable=False),
        sa.Column('android_version', sa.String(32), nullable=False),
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=True)
    )

    # Apps table
    op.create_table(
        'apps',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('package_name', sa.String(256), nullable=False, index=True),
        sa.Column('app_name', sa.String(256), nullable=False),
        sa.Column('version_name', sa.String(64), nullable=False),
        sa.Column('apk_sha256', sa.String(64), nullable=False, unique=True, index=True),
        sa.Column('min_sdk', sa.Integer(), default=26),
        sa.Column('target_sdk', sa.Integer(), default=34),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True)
    )

    # Scans table
    op.create_table(
        'scans',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('app_id', sa.String(64), sa.ForeignKey('apps.id', ondelete='CASCADE'), nullable=False),
        sa.Column('device_id', sa.String(64), sa.ForeignKey('devices.id', ondelete='SET NULL'), nullable=True),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('final_score', sa.Integer(), nullable=False),
        sa.Column('severity', sa.String(32), nullable=False),
        sa.Column('mobsf_status', sa.String(32), nullable=False),
        sa.Column('complete', sa.Boolean(), default=False),
        sa.Column('claim', sa.Text(), nullable=True),
        sa.Column('category', sa.String(128), nullable=True),
        sa.Column('result_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True)
    )

    # Scan components table
    op.create_table(
        'scan_components',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('scan_id', sa.String(64), sa.ForeignKey('scans.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('component_name', sa.String(64), nullable=False),
        sa.Column('score_value', sa.Float(), nullable=False),
        sa.Column('weight', sa.Float(), nullable=False),
        sa.Column('status', sa.String(32), default='complete'),
        sa.Column('reasons_json', sa.JSON(), nullable=True)
    )

    # Permission events table
    op.create_table(
        'permission_events',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('device_id', sa.String(64), sa.ForeignKey('devices.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('package_name', sa.String(256), nullable=False, index=True),
        sa.Column('permission', sa.String(256), nullable=False),
        sa.Column('state', sa.String(32), default='declared'),
        sa.Column('fg_bg', sa.String(32), default='foreground'),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True)
    )

    # Usage events table
    op.create_table(
        'usage_events',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('device_id', sa.String(64), sa.ForeignKey('devices.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('package_name', sa.String(256), nullable=False, index=True),
        sa.Column('event_type', sa.String(64), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True)
    )

    # Network stats table
    op.create_table(
        'network_stats',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('device_id', sa.String(64), sa.ForeignKey('devices.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('package_name', sa.String(256), nullable=False, index=True),
        sa.Column('fg_bytes', sa.Integer(), default=0),
        sa.Column('bg_bytes', sa.Integer(), default=0),
        sa.Column('window_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True)
    )

    # Alerts table
    op.create_table(
        'alerts',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('device_id', sa.String(64), sa.ForeignKey('devices.id', ondelete='SET NULL'), nullable=True),
        sa.Column('scan_id', sa.String(64), sa.ForeignKey('scans.id', ondelete='SET NULL'), nullable=True),
        sa.Column('app_name', sa.String(256), nullable=False),
        sa.Column('package_name', sa.String(256), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('severity', sa.String(32), nullable=False),
        sa.Column('title', sa.String(256), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('kind', sa.String(64), default='high_risk_app'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True)
    )

    # Parent links table
    op.create_table(
        'parent_links',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('parent_email', sa.String(256), nullable=False),
        sa.Column('verification_code', sa.String(16), nullable=False),
        sa.Column('magic_token', sa.String(64), nullable=False, unique=True, index=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('consent_version', sa.String(32), default='v1.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True)
    )

    # Email log table
    op.create_table(
        'email_log',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('alert_id', sa.String(64), sa.ForeignKey('alerts.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('recipient', sa.String(256), nullable=False),
        sa.Column('subject', sa.String(256), nullable=False),
        sa.Column('status', sa.String(32), default='pending'),
        sa.Column('attempts', sa.Integer(), default=1),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True)
    )

def downgrade() -> None:
    op.drop_table('email_log')
    op.drop_table('parent_links')
    op.drop_table('alerts')
    op.drop_table('network_stats')
    op.drop_table('usage_events')
    op.drop_table('permission_events')
    op.drop_table('scan_components')
    op.drop_table('scans')
    op.drop_table('apps')
    op.drop_table('devices')
    op.drop_table('users')
