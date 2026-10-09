package com.privacyguard.agent.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.NetworkStats
import android.app.usage.NetworkStatsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.media.AudioRecordingConfiguration
import android.net.ConnectivityManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.privacyguard.agent.data.db.AppDatabaseHelper
import com.privacyguard.agent.data.models.RuntimeEventRecord
import com.privacyguard.agent.data.models.SecurityAlertRecord
import com.privacyguard.agent.network.PrivacyGuardApiClient
import java.util.UUID

class MonitoringService : Service() {

    companion object {
        const val CHANNEL_ID = "privacyguard_monitoring_channel"
        const val NOTIFICATION_ID = 2002
    }

    private lateinit var dbHelper: AppDatabaseHelper
    private var currentForegroundPackage: String = "unknown"
    private var isCameraInUse: Boolean = false
    private var isMicInUse: Boolean = false

    private val handler = Handler(Looper.getMainLooper())
    private var cameraManager: CameraManager? = null
    private var audioManager: AudioManager? = null

    // Camera availability listener
    private val cameraCallback = object : CameraManager.AvailabilityCallback() {
        override fun onCameraUnavailable(cameraId: String) {
            super.onCameraUnavailable(cameraId)
            isCameraInUse = true
            recordSensorEvent(
                eventType = "camera_active",
                targetResource = "Camera Sensor (ID $cameraId)",
                details = "Hardware camera sensor became unavailable (in active use by application)."
            )
        }

        override fun onCameraAvailable(cameraId: String) {
            super.onCameraAvailable(cameraId)
            isCameraInUse = false
            recordSensorEvent(
                eventType = "camera_released",
                targetResource = "Camera Sensor (ID $cameraId)",
                details = "Hardware camera released back to idle."
            )
        }
    }

    // Audio recording callback (Android 7.0+ / 10+ public API)
    private val audioRecordingCallback = object : AudioManager.AudioRecordingCallback() {
        override fun onRecordingConfigChanged(configs: List<AudioRecordingConfiguration>) {
            super.onRecordingConfigChanged(configs)
            val isRecording = configs.isNotEmpty()
            if (isRecording && !isMicInUse) {
                isMicInUse = true
                recordSensorEvent(
                    eventType = "microphone_recording_started",
                    targetResource = "Audio Record Buffer",
                    details = "Active audio input stream initiated."
                )
            } else if (!isRecording && isMicInUse) {
                isMicInUse = false
                recordSensorEvent(
                    eventType = "microphone_recording_stopped",
                    targetResource = "Audio Record Buffer",
                    details = "Audio input stream closed."
                )
            }
        }
    }

    // Periodic polling for UsageEvents & NetworkStats
    private val pollingRunnable = object : Runnable {
        override fun run() {
            pollForegroundApp()
            syncEventsToBackend()
            handler.postDelayed(this, 10000) // Poll every 10 seconds
        }
    }

    override fun onCreate() {
        super.onCreate()
        dbHelper = AppDatabaseHelper.getInstance(this)
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildPersistentNotification())

        // Register Camera Callback
        try {
            cameraManager = getSystemService(Context.CAMERA_SERVICE) as? CameraManager
            cameraManager?.registerAvailabilityCallback(cameraCallback, handler)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Register Audio Callback
        try {
            audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                audioManager?.registerAudioRecordingCallback(audioRecordingCallback, handler)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Start polling loop
        handler.post(pollingRunnable)
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(pollingRunnable)
        try {
            cameraManager?.unregisterAvailabilityCallback(cameraCallback)
        } catch (_: Exception) {}
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                audioManager?.unregisterAudioRecordingCallback(audioRecordingCallback)
            }
        } catch (_: Exception) {}
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun pollForegroundApp() {
        try {
            val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return
            val endTime = System.currentTimeMillis()
            val startTime = endTime - 15000 // Last 15 seconds

            val events = usageStatsManager.queryEvents(startTime, endTime)
            val event = UsageEvents.Event()

            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                    val pkg = event.packageName
                    if (pkg != currentForegroundPackage && pkg != packageName) {
                        currentForegroundPackage = pkg
                        dbHelper.insertRuntimeEvent(
                            RuntimeEventRecord(
                                id = UUID.randomUUID().toString(),
                                packageName = pkg,
                                eventType = "activity_resumed",
                                targetResource = "Display & Window Manager",
                                details = "Application entered foreground interactive state.",
                                isBackground = false,
                                confidence = "Observed",
                                timestamp = event.timeStamp
                            )
                        )
                    }
                }
            }
        } catch (e: Exception) {
            // Usage stats permission not granted yet
        }
    }

    private fun recordSensorEvent(eventType: String, targetResource: String, details: String) {
        val targetPkg = currentForegroundPackage
        val isFgKnown = targetPkg != "unknown" && targetPkg != packageName
        val confidence = if (isFgKnown) "Inferred" else "Observed"

        val event = RuntimeEventRecord(
            id = UUID.randomUUID().toString(),
            packageName = targetPkg,
            eventType = eventType,
            targetResource = targetResource,
            details = details,
            isBackground = !isFgKnown,
            confidence = confidence,
            timestamp = System.currentTimeMillis()
        )
        dbHelper.insertRuntimeEvent(event)

        // Check if background sensor use occurred
        if (!isFgKnown && isCameraInUse) {
            val alert = SecurityAlertRecord(
                id = UUID.randomUUID().toString(),
                packageName = targetPkg,
                appName = targetPkg,
                title = "Suspicious Camera Activity",
                message = "Camera hardware was activated without a clear foreground application.",
                severity = "critical",
                kind = "background_probe",
                resolved = false,
                createdAt = System.currentTimeMillis()
            )
            dbHelper.insertAlert(alert)
        }
    }

    private fun syncEventsToBackend() {
        Thread {
            try {
                val profile = dbHelper.getUserProfile() ?: return@Thread
                if (!profile.consentTelemetrySync) return@Thread

                val events = dbHelper.getRecentRuntimeEvents(20)
                if (events.isEmpty()) return@Thread

                val mappedList = events.map { evt ->
                    mapOf(
                        "package_name" to evt.packageName,
                        "event_type" to evt.eventType,
                        "target_resource" to evt.targetResource,
                        "details" to evt.details,
                        "is_background" to evt.isBackground,
                        "confidence" to evt.confidence,
                        "timestamp" to evt.timestamp
                    )
                }
                PrivacyGuardApiClient.sendDeviceEvents(profile.userId, mappedList)
            } catch (_: Exception) {}
        }.start()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "PrivacyGuard Active Monitoring",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Continuous background sensor and permission auditing"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildPersistentNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("PrivacyGuard Active")
            .setContentText("Continuous sensor & runtime permission monitoring active")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
