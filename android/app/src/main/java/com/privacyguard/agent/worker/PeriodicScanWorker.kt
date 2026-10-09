package com.privacyguard.agent.worker

import android.content.Context
import android.content.pm.PackageManager
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.privacyguard.agent.network.ApiClient

class PeriodicScanWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val pm = applicationContext.packageManager
        val packages = pm.getInstalledPackages(PackageManager.GET_PERMISSIONS)

        ApiClient.sendEvent(
            packageName = "system.batch",
            eventType = "periodic_scan_heartbeat",
            payload = mapOf(
                "total_installed_apps" to packages.size,
                "timestamp" to System.currentTimeMillis()
            )
        )

        return Result.success()
    }
}
