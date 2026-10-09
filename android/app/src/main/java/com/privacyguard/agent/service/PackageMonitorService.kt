package com.privacyguard.agent.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.privacyguard.agent.network.ApiClient

class PackageMonitorService : Service() {

    private val channelId = "privacyguard_monitor_channel"
    private val notificationId = 1001

    private val packageReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == Intent.ACTION_PACKAGE_ADDED) {
                val data = intent.data
                val packageName = data?.schemeSpecificPart ?: return
                
                // Notify backend of installation event
                ApiClient.sendEvent(
                    packageName = packageName,
                    eventType = "package_installed",
                    payload = mapOf(
                        "timestamp" to System.currentTimeMillis(),
                        "action" to "ACTION_PACKAGE_ADDED"
                    )
                )

                // Dispatch notification for audit result / review recommendation
                notifyNewInstall(packageName)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(notificationId, buildForegroundNotification())

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_PACKAGE_ADDED)
            addDataScheme("package")
        }
        registerReceiver(packageReceiver, filter)
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(packageReceiver)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "PrivacyGuard Background Monitor",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors app installations and changes"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("PrivacyGuard Active")
            .setContentText("Monitoring new app installations for privacy posture")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun notifyNewInstall(packageName: String) {
        val alertNotification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("New App Detected: $packageName")
            .setContentText("Audit completed. Tap to inspect permissions and review exposure.")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(packageName.hashCode(), alertNotification)
    }
}
