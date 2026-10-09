package com.privacyguard.agent.data.models

/**
 * Data models for PrivacyGuard v2 on-device local database and telemetry.
 */

data class AppRecord(
    val packageName: String,
    val appName: String,
    val versionName: String,
    val versionCode: Long,
    val installTime: Long,
    val isSystemApp: Boolean,
    val apkSha256: String,
    val riskScore: Int, // 0-100 (higher = riskier)
    val severity: String, // 'low' | 'medium' | 'high' | 'critical'
    val mlRisk: Double = 0.0,
    val staticRisk: Double = 0.0,
    val heuristicRisk: Double = 0.0,
    val category: String = "Utility",
    val lastScannedAt: Long = System.currentTimeMillis()
)

data class PermissionUsageRecord(
    val id: String,
    val packageName: String,
    val permission: String,
    val isGranted: Boolean,
    val isSensitive: Boolean,
    val isBackgroundUsed: Boolean,
    val evidenceConfidence: String, // 'Observed' | 'Inferred' | 'Declared'
    val explanation: String,
    val lastAccessTimestamp: Long
)

data class RuntimeEventRecord(
    val id: String,
    val packageName: String,
    val eventType: String, // 'camera_access' | 'mic_recording' | 'bg_network' | 'foreground_resumed'
    val targetResource: String,
    val details: String,
    val isBackground: Boolean,
    val confidence: String, // 'Observed' | 'Inferred' | 'Declared'
    val timestamp: Long
)

data class SecurityAlertRecord(
    val id: String,
    val packageName: String,
    val appName: String,
    val title: String,
    val message: String,
    val severity: String, // 'critical' | 'warning' | 'info'
    val kind: String, // 'high_risk_app' | 'background_probe' | 'permission_creep'
    val resolved: Boolean,
    val createdAt: Long
)

data class UserProfileRecord(
    val userId: String,
    val displayName: String,
    val ageCategory: String, // 'adult' | 'minor'
    val dob: String? = null,
    val parentLinked: Boolean = false,
    val parentEmail: String? = null,
    val consentApkUpload: Boolean = true,
    val consentTelemetrySync: Boolean = true
)

data class ComponentScoreBreakdown(
    val mlRisk: Double,
    val staticRisk: Double,
    val heuristicRisk: Double,
    val finalScore: Int,
    val severity: String,
    val topRiskFactors: List<String> = emptyList(),
    val recommendations: List<String> = emptyList()
)
