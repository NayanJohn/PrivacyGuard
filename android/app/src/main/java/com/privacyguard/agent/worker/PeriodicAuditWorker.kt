package com.privacyguard.agent.worker

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.privacyguard.agent.data.db.AppDatabaseHelper
import com.privacyguard.agent.data.models.AppRecord
import com.privacyguard.agent.network.PrivacyGuardApiClient
import java.io.File

class PeriodicAuditWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val pm = applicationContext.packageManager
        val dbHelper = AppDatabaseHelper.getInstance(applicationContext)

        val packages = pm.getInstalledPackages(PackageManager.GET_PERMISSIONS)
        val installedNonSystem = packages.filter { pInfo ->
            val isSystem = (pInfo.applicationInfo?.flags ?: 0) and ApplicationInfo.FLAG_SYSTEM != 0
            !isSystem
        }

        // Diff installed packages against DB
        for (pInfo in installedNonSystem) {
            val pkg = pInfo.packageName
            val existing = dbHelper.getAppByPackage(pkg)
            if (existing == null) {
                // Missed broadcast or new installation
                val sourceDir = pInfo.applicationInfo?.sourceDir ?: continue
                val apkFile = File(sourceDir)
                if (apkFile.exists()) {
                    val sha256 = try {
                        PrivacyGuardApiClient.computeSha256(apkFile)
                    } catch (_: Exception) {
                        "unknown"
                    }

                    val perms = pInfo.requestedPermissions?.toList() ?: emptyList()
                    val dangerous = perms.count {
                        it.contains("LOCATION") || it.contains("CAMERA") || it.contains("AUDIO") || it.contains("SMS")
                    }
                    val riskScore = (dangerous * 16).coerceAtMost(100)
                    val severity = if (riskScore >= 80) "critical" else if (riskScore >= 55) "high" else if (riskScore >= 30) "medium" else "low"

                    val record = AppRecord(
                        packageName = pkg,
                        appName = pInfo.applicationInfo?.loadLabel(pm)?.toString() ?: pkg,
                        versionName = pInfo.versionName ?: "1.0",
                        versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) pInfo.longVersionCode else pInfo.versionCode.toLong(),
                        installTime = pInfo.firstInstallTime,
                        isSystemApp = false,
                        apkSha256 = sha256,
                        riskScore = riskScore,
                        severity = severity,
                        mlRisk = riskScore * 0.4,
                        staticRisk = riskScore * 0.35,
                        heuristicRisk = riskScore * 0.25,
                        category = "Utility",
                        lastScannedAt = System.currentTimeMillis()
                    )
                    dbHelper.saveApp(record)
                }
            }
        }

        return Result.success()
    }
}
