package com.privacyguard.agent.data.db

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.privacyguard.agent.data.models.AppRecord
import com.privacyguard.agent.data.models.PermissionUsageRecord
import com.privacyguard.agent.data.models.RuntimeEventRecord
import com.privacyguard.agent.data.models.SecurityAlertRecord
import com.privacyguard.agent.data.models.UserProfileRecord

class AppDatabaseHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        const val DATABASE_NAME = "privacyguard_v2.db"
        const val DATABASE_VERSION = 1

        @Volatile
        private var instance: AppDatabaseHelper? = null

        fun getInstance(context: Context): AppDatabaseHelper {
            return instance ?: synchronized(this) {
                instance ?: AppDatabaseHelper(context.applicationContext).also { instance = it }
            }
        }
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE apps (
                package_name TEXT PRIMARY KEY,
                app_name TEXT NOT NULL,
                version_name TEXT NOT NULL,
                version_code INTEGER NOT NULL,
                install_time INTEGER NOT NULL,
                is_system_app INTEGER NOT NULL,
                apk_sha256 TEXT NOT NULL,
                risk_score INTEGER NOT NULL,
                severity TEXT NOT NULL,
                ml_risk REAL NOT NULL,
                static_risk REAL NOT NULL,
                heuristic_risk REAL NOT NULL,
                category TEXT NOT NULL,
                last_scanned_at INTEGER NOT NULL
            )
            """.trimIndent()
        )

        db.execSQL(
            """
            CREATE TABLE permission_usage (
                id TEXT PRIMARY KEY,
                package_name TEXT NOT NULL,
                permission TEXT NOT NULL,
                is_granted INTEGER NOT NULL,
                is_sensitive INTEGER NOT NULL,
                is_bg_used INTEGER NOT NULL,
                evidence_confidence TEXT NOT NULL,
                explanation TEXT NOT NULL,
                last_access INTEGER NOT NULL
            )
            """.trimIndent()
        )

        db.execSQL(
            """
            CREATE TABLE runtime_events (
                id TEXT PRIMARY KEY,
                package_name TEXT NOT NULL,
                event_type TEXT NOT NULL,
                target_resource TEXT NOT NULL,
                details TEXT NOT NULL,
                is_background INTEGER NOT NULL,
                confidence TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            )
            """.trimIndent()
        )

        db.execSQL(
            """
            CREATE TABLE alerts (
                id TEXT PRIMARY KEY,
                package_name TEXT NOT NULL,
                app_name TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                severity TEXT NOT NULL,
                kind TEXT NOT NULL,
                resolved INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )
            """.trimIndent()
        )

        db.execSQL(
            """
            CREATE TABLE user_profile (
                user_id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                age_category TEXT NOT NULL,
                dob TEXT,
                parent_linked INTEGER NOT NULL,
                parent_email TEXT,
                consent_apk_upload INTEGER NOT NULL,
                consent_telemetry_sync INTEGER NOT NULL
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS apps")
        db.execSQL("DROP TABLE IF EXISTS permission_usage")
        db.execSQL("DROP TABLE IF EXISTS runtime_events")
        db.execSQL("DROP TABLE IF EXISTS alerts")
        db.execSQL("DROP TABLE IF EXISTS user_profile")
        onCreate(db)
    }

    // --- App CRUD & SHA-256 Caching ---

    fun getAppBySha256(sha256: String): AppRecord? {
        val db = readableDatabase
        val cursor = db.query(
            "apps", null, "apk_sha256 = ?", arrayOf(sha256),
            null, null, null
        )
        return cursor.use {
            if (it.moveToFirst()) mapApp(it) else null
        }
    }

    fun getAppByPackage(packageName: String): AppRecord? {
        val db = readableDatabase
        val cursor = db.query(
            "apps", null, "package_name = ?", arrayOf(packageName),
            null, null, null
        )
        return cursor.use {
            if (it.moveToFirst()) mapApp(it) else null
        }
    }

    fun getAllApps(): List<AppRecord> {
        val db = readableDatabase
        val cursor = db.query("apps", null, null, null, null, null, "risk_score DESC")
        val list = mutableListOf<AppRecord>()
        cursor.use {
            while (it.moveToNext()) {
                list.add(mapApp(it))
            }
        }
        return list
    }

    fun saveApp(app: AppRecord) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("package_name", app.packageName)
            put("app_name", app.appName)
            put("version_name", app.versionName)
            put("version_code", app.versionCode)
            put("install_time", app.installTime)
            put("is_system_app", if (app.isSystemApp) 1 else 0)
            put("apk_sha256", app.apkSha256)
            put("risk_score", app.riskScore)
            put("severity", app.severity)
            put("ml_risk", app.mlRisk)
            put("static_risk", app.staticRisk)
            put("heuristic_risk", app.heuristicRisk)
            put("category", app.category)
            put("last_scanned_at", app.lastScannedAt)
        }
        db.insertWithOnConflict("apps", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    private fun mapApp(cursor: android.database.Cursor): AppRecord {
        return AppRecord(
            packageName = cursor.getString(cursor.getColumnIndexOrThrow("package_name")),
            appName = cursor.getString(cursor.getColumnIndexOrThrow("app_name")),
            versionName = cursor.getString(cursor.getColumnIndexOrThrow("version_name")),
            versionCode = cursor.getLong(cursor.getColumnIndexOrThrow("version_code")),
            installTime = cursor.getLong(cursor.getColumnIndexOrThrow("install_time")),
            isSystemApp = cursor.getInt(cursor.getColumnIndexOrThrow("is_system_app")) == 1,
            apkSha256 = cursor.getString(cursor.getColumnIndexOrThrow("apk_sha256")),
            riskScore = cursor.getInt(cursor.getColumnIndexOrThrow("risk_score")),
            severity = cursor.getString(cursor.getColumnIndexOrThrow("severity")),
            mlRisk = cursor.getDouble(cursor.getColumnIndexOrThrow("ml_risk")),
            staticRisk = cursor.getDouble(cursor.getColumnIndexOrThrow("static_risk")),
            heuristicRisk = cursor.getDouble(cursor.getColumnIndexOrThrow("heuristic_risk")),
            category = cursor.getString(cursor.getColumnIndexOrThrow("category")),
            lastScannedAt = cursor.getLong(cursor.getColumnIndexOrThrow("last_scanned_at"))
        )
    }

    // --- Runtime Events ---

    fun insertRuntimeEvent(event: RuntimeEventRecord) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("id", event.id)
            put("package_name", event.packageName)
            put("event_type", event.eventType)
            put("target_resource", event.targetResource)
            put("details", event.details)
            put("is_background", if (event.isBackground) 1 else 0)
            put("confidence", event.confidence)
            put("timestamp", event.timestamp)
        }
        db.insertWithOnConflict("runtime_events", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getRecentRuntimeEvents(limit: Int = 100): List<RuntimeEventRecord> {
        val db = readableDatabase
        val cursor = db.query(
            "runtime_events", null, null, null,
            null, null, "timestamp DESC", limit.toString()
        )
        val list = mutableListOf<RuntimeEventRecord>()
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    RuntimeEventRecord(
                        id = it.getString(it.getColumnIndexOrThrow("id")),
                        packageName = it.getString(it.getColumnIndexOrThrow("package_name")),
                        eventType = it.getString(it.getColumnIndexOrThrow("event_type")),
                        targetResource = it.getString(it.getColumnIndexOrThrow("target_resource")),
                        details = it.getString(it.getColumnIndexOrThrow("details")),
                        isBackground = it.getInt(it.getColumnIndexOrThrow("is_background")) == 1,
                        confidence = it.getString(it.getColumnIndexOrThrow("confidence")),
                        timestamp = it.getLong(it.getColumnIndexOrThrow("timestamp"))
                    )
                )
            }
        }
        return list
    }

    // --- Security Alerts ---

    fun insertAlert(alert: SecurityAlertRecord) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("id", alert.id)
            put("package_name", alert.packageName)
            put("app_name", alert.appName)
            put("title", alert.title)
            put("message", alert.message)
            put("severity", alert.severity)
            put("kind", alert.kind)
            put("resolved", if (alert.resolved) 1 else 0)
            put("created_at", alert.createdAt)
        }
        db.insertWithOnConflict("alerts", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getAllAlerts(): List<SecurityAlertRecord> {
        val db = readableDatabase
        val cursor = db.query("alerts", null, null, null, null, null, "created_at DESC")
        val list = mutableListOf<SecurityAlertRecord>()
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    SecurityAlertRecord(
                        id = it.getString(it.getColumnIndexOrThrow("id")),
                        packageName = it.getString(it.getColumnIndexOrThrow("package_name")),
                        appName = it.getString(it.getColumnIndexOrThrow("app_name")),
                        title = it.getString(it.getColumnIndexOrThrow("title")),
                        message = it.getString(it.getColumnIndexOrThrow("message")),
                        severity = it.getString(it.getColumnIndexOrThrow("severity")),
                        kind = it.getString(it.getColumnIndexOrThrow("kind")),
                        resolved = it.getInt(it.getColumnIndexOrThrow("resolved")) == 1,
                        createdAt = it.getLong(it.getColumnIndexOrThrow("created_at"))
                    )
                )
            }
        }
        return list
    }

    fun resolveAlert(id: String) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("resolved", 1)
        }
        db.update("alerts", values, "id = ?", arrayOf(id))
    }

    // --- User Profile ---

    fun getUserProfile(): UserProfileRecord? {
        val db = readableDatabase
        val cursor = db.query("user_profile", null, null, null, null, null, null, "1")
        return cursor.use {
            if (it.moveToFirst()) {
                UserProfileRecord(
                    userId = it.getString(it.getColumnIndexOrThrow("user_id")),
                    displayName = it.getString(it.getColumnIndexOrThrow("display_name")),
                    ageCategory = it.getString(it.getColumnIndexOrThrow("age_category")),
                    dob = it.getString(it.getColumnIndexOrThrow("dob")),
                    parentLinked = it.getInt(it.getColumnIndexOrThrow("parent_linked")) == 1,
                    parentEmail = it.getString(it.getColumnIndexOrThrow("parent_email")),
                    consentApkUpload = it.getInt(it.getColumnIndexOrThrow("consent_apk_upload")) == 1,
                    consentTelemetrySync = it.getInt(it.getColumnIndexOrThrow("consent_telemetry_sync")) == 1
                )
            } else null
        }
    }

    fun saveUserProfile(profile: UserProfileRecord) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("user_id", profile.userId)
            put("display_name", profile.displayName)
            put("age_category", profile.ageCategory)
            put("dob", profile.dob)
            put("parent_linked", if (profile.parentLinked) 1 else 0)
            put("parent_email", profile.parentEmail)
            put("consent_apk_upload", if (profile.consentApkUpload) 1 else 0)
            put("consent_telemetry_sync", if (profile.consentTelemetrySync) 1 else 0)
        }
        db.insertWithOnConflict("user_profile", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    // --- Data Deletion Compliance ---

    fun clearAllData() {
        val db = writableDatabase
        db.execSQL("DELETE FROM apps")
        db.execSQL("DELETE FROM permission_usage")
        db.execSQL("DELETE FROM runtime_events")
        db.execSQL("DELETE FROM alerts")
        db.execSQL("DELETE FROM user_profile")
    }
}
