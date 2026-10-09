package com.privacyguard.agent

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.privacyguard.agent.data.db.AppDatabaseHelper
import com.privacyguard.agent.data.models.AppRecord
import com.privacyguard.agent.network.PrivacyGuardApiClient
import com.privacyguard.agent.service.MonitoringService
import com.privacyguard.agent.ui.screens.*
import com.privacyguard.agent.worker.PeriodicAuditWorker
import java.io.File
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val dbHelper = AppDatabaseHelper.getInstance(this)

        // Start Foreground monitoring service
        val serviceIntent = Intent(this, MonitoringService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }

        // Schedule WorkManager periodic audit fallback
        try {
            val periodicRequest = PeriodicWorkRequestBuilder<PeriodicAuditWorker>(6, TimeUnit.HOURS).build()
            WorkManager.getInstance(this).enqueue(periodicRequest)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Run initial package index in background if DB is empty
        Thread {
            try {
                indexInitialPackages(dbHelper)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()

        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    background = Color(0xFF0A0C10),
                    surface = Color(0xFF0F172A),
                    primary = Color(0xFF06B6D4)
                )
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0A0C10)
                ) {
                    AppNavigation(dbHelper = dbHelper)
                }
            }
        }
    }

    private fun indexInitialPackages(dbHelper: AppDatabaseHelper) {
        val existing = dbHelper.getAllApps()
        if (existing.isNotEmpty()) return

        val pm = packageManager
        val packages = pm.getInstalledPackages(PackageManager.GET_PERMISSIONS)

        for (pInfo in packages) {
            val appInfo = pInfo.applicationInfo ?: continue
            val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
            if (isSystem) continue

            val pkg = pInfo.packageName
            val sourceDir = appInfo.sourceDir
            val apkFile = File(sourceDir)
            val sha256 = if (apkFile.exists()) {
                try {
                    PrivacyGuardApiClient.computeSha256(apkFile)
                } catch (_: Exception) {
                    "sha256_${pkg.hashCode()}"
                }
            } else {
                "sha256_${pkg.hashCode()}"
            }

            val perms = pInfo.requestedPermissions?.toList() ?: emptyList()
            val dangerous = perms.count {
                it.contains("LOCATION") || it.contains("CAMERA") || it.contains("AUDIO") || it.contains("SMS") || it.contains("CONTACTS")
            }
            val riskScore = (dangerous * 15).coerceIn(10, 95)
            val severity = if (riskScore >= 80) "critical" else if (riskScore >= 55) "high" else if (riskScore >= 30) "medium" else "low"

            val record = AppRecord(
                packageName = pkg,
                appName = appInfo.loadLabel(pm).toString(),
                versionName = pInfo.versionName ?: "1.0",
                versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) pInfo.longVersionCode else pInfo.versionCode.toLong(),
                installTime = pInfo.firstInstallTime,
                isSystemApp = false,
                apkSha256 = sha256,
                riskScore = riskScore,
                severity = severity,
                mlRisk = riskScore * 0.40,
                staticRisk = riskScore * 0.35,
                heuristicRisk = riskScore * 0.25,
                category = "Utility",
                lastScannedAt = System.currentTimeMillis()
            )
            dbHelper.saveApp(record)
        }
    }
}

@Composable
fun AppNavigation(dbHelper: AppDatabaseHelper) {
    var hasProfile by remember { mutableStateOf(dbHelper.getUserProfile() != null) }
    var currentScreen by remember { mutableStateOf("dashboard") }
    var selectedPackageName by remember { mutableStateOf<String?>(null) }

    if (!hasProfile) {
        OnboardingScreen(
            onComplete = {
                hasProfile = true
                currentScreen = "dashboard"
            }
        )
    } else {
        when (currentScreen) {
            "dashboard" -> DashboardScreen(
                onNavigateToApps = { currentScreen = "apps" },
                onNavigateToAlerts = { currentScreen = "alerts" },
                onNavigateToSettings = { currentScreen = "settings" },
                onSelectApp = { pkg ->
                    selectedPackageName = pkg
                    currentScreen = "detail"
                }
            )
            "apps" -> AppListScreen(
                onSelectApp = { pkg ->
                    selectedPackageName = pkg
                    currentScreen = "detail"
                },
                onBack = { currentScreen = "dashboard" }
            )
            "detail" -> AppDetailScreen(
                packageName = selectedPackageName ?: "",
                onBack = { currentScreen = "apps" }
            )
            "alerts" -> AlertsFeedScreen(
                onBack = { currentScreen = "dashboard" }
            )
            "settings" -> SettingsScreen(
                onBack = { currentScreen = "dashboard" },
                onResetOnboarding = {
                    hasProfile = false
                    currentScreen = "dashboard"
                }
            )
        }
    }
}
