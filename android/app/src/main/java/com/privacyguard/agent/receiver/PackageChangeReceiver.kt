package com.privacyguard.agent.receiver

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.privacyguard.agent.data.db.AppDatabaseHelper
import com.privacyguard.agent.data.models.AppRecord
import com.privacyguard.agent.data.models.SecurityAlertRecord
import com.privacyguard.agent.network.PrivacyGuardApiClient
import java.io.File
import java.util.UUID

class PackageChangeReceiver : BroadcastReceiver() {

    companion object {
        const val ALERT_CHANNEL_ID = "privacyguard_alert_channel"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action != Intent.ACTION_PACKAGE_ADDED && action != Intent.ACTION_PACKAGE_REPLACED) {
            return
        }

        val packageName = intent.data?.schemeSpecificPart ?: return
        val dbHelper = AppDatabaseHelper.getInstance(context)

        // Audit in background thread
        Thread {
            try {
                auditPackage(context, packageName, dbHelper)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }

    private fun auditPackage(context: Context, packageName: String, dbHelper: AppDatabaseHelper) {
        val pm = context.packageManager
        val pInfo = pm.getPackageInfo(packageName, PackageManager.GET_PERMISSIONS)
        val appInfo = pInfo.applicationInfo ?: return

        // Skip system apps if not updated
        val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
        if (isSystem) return

        val apkFile = File(appInfo.sourceDir)
        if (!apkFile.exists()) return

        // Compute SHA-256 for caching
        val sha256 = PrivacyGuardApiClient.computeSha256(apkFile)
        val cached = dbHelper.getAppBySha256(sha256)
        if (cached != null) {
            // Already audited with matching hash, reuse cache
            return
        }

        val appName = appInfo.loadLabel(pm).toString()
        val userProfile = dbHelper.getUserProfile()

        var riskScore = 20
        var severity = "low"
        var mlRisk = 15.0
        var staticRisk = 20.0
        var heuristicRisk = 25.0

        // If user consented to APK upload, send to real scoring engine
        if (userProfile?.consentApkUpload != false) {
            val scanId = PrivacyGuardApiClient.uploadApk(apkFile, claim = "App installed: $appName", category = "Utility")
            if (scanId != null) {
                // Poll for result (preliminary arrives in <1s)
                for (attempt in 1..10) {
                    Thread.sleep(1200)
                    val result = PrivacyGuardApiClient.getAuditResult(scanId)
                    if (result != null) {
                        riskScore = result.finalScore
                        severity = result.severity
                        mlRisk = result.mlRisk
                        staticRisk = result.staticRisk
                        heuristicRisk = result.heuristicRisk
                        break
                    }
                }
            }
        } else {
            // Local fallback calculation based on dangerous permissions
            val perms = pInfo.requestedPermissions?.toList() ?: emptyList()
            val dangerous = perms.count {
                it.contains("LOCATION") || it.contains("CAMERA") || it.contains("AUDIO") || it.contains("SMS") || it.contains("CONTACTS")
            }
            riskScore = (dangerous * 16).coerceAtMost(100)
            severity = if (riskScore >= 80) "critical" else if (riskScore >= 55) "high" else if (riskScore >= 30) "medium" else "low"
        }

        val record = AppRecord(
            packageName = packageName,
            appName = appName,
            versionName = pInfo.versionName ?: "1.0",
            versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) pInfo.longVersionCode else pInfo.versionCode.toLong(),
            installTime = pInfo.firstInstallTime,
            isSystemApp = false,
            apkSha256 = sha256,
            riskScore = riskScore,
            severity = severity,
            mlRisk = mlRisk,
            staticRisk = staticRisk,
            heuristicRisk = heuristicRisk,
            category = "App",
            lastScannedAt = System.currentTimeMillis()
        )
        dbHelper.saveApp(record)

        // If high risk (>= 80), create alert and notify
        if (riskScore >= 80) {
            val alert = SecurityAlertRecord(
                id = UUID.randomUUID().toString(),
                packageName = packageName,
                appName = appName,
                title = "High Risk App Installed: $appName",
                message = "Audit scored $riskScore/100 ($severity severity). Evaluated by PrivacyGuard 3-component engine.",
                severity = "critical",
                kind = "high_risk_app",
                resolved = false,
                createdAt = System.currentTimeMillis()
            )
            dbHelper.insertAlert(alert)
            sendNotification(context, appName, riskScore, severity)
        }
    }

    private fun sendNotification(context: Context, appName: String, score: Int, severity: String) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                ALERT_CHANNEL_ID,
                "PrivacyGuard Risk Alerts",
                NotificationManager.IMPORTANCE_HIGH
            )
            manager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
            .setContentTitle("Privacy Alert: $appName ($score/100)")
            .setContentText("High privacy exposure detected. Review permissions now.")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        manager.notify(appName.hashCode(), notification)
    }
}
