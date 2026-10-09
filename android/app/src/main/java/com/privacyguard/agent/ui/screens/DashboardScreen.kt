package com.privacyguard.agent.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.privacyguard.agent.data.db.AppDatabaseHelper
import com.privacyguard.agent.data.models.AppRecord
import com.privacyguard.agent.ui.components.Rotating3DRiskGauge

@Composable
fun DashboardScreen(
    onNavigateToApps: () -> Unit,
    onNavigateToAlerts: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onSelectApp: (String) -> Unit
) {
    val context = LocalContext.current
    val dbHelper = remember { AppDatabaseHelper.getInstance(context) }
    var apps by remember { mutableStateOf<List<AppRecord>>(emptyList()) }
    var alertsCount by remember { mutableStateOf(0) }
    var runtimeEventsCount by remember { mutableStateOf(0) }

    LaunchedEffect(Unit) {
        apps = dbHelper.getAllApps()
        alertsCount = dbHelper.getAllAlerts().count { !it.resolved }
        runtimeEventsCount = dbHelper.getRecentRuntimeEvents().count { it.isBackground }
    }

    // Overall device privacy health score (100 - avg risk)
    val overallScore = remember(apps) {
        if (apps.isEmpty()) 100
        else {
            val avgRisk = apps.map { it.riskScore }.average()
            (100 - avgRisk).toInt().coerceIn(0, 100)
        }
    }

    val highRiskCount = remember(apps) {
        apps.count { it.riskScore >= 80 }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0C10))
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "PRIVACYGUARD AGENT",
                    color = Color(0xFF06B6D4),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = "Real-Time Sensor & Permission Telemetry",
                    color = Color(0xFF94A3B8),
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace
                )
            }

            Box(
                modifier = Modifier
                    .background(Color(0xFF1E293B), RoundedCornerShape(8.dp))
                    .border(1.dp, Color(0x30FFFFFF), RoundedCornerShape(8.dp))
                    .clickable { onNavigateToSettings() }
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "Settings",
                    color = Color(0xFFCBD5E1),
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        // 3D Rotating Risk Gauge Section
        Surface(
            color = Color(0xFF0F172A),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Rotating3DRiskGauge(
                    score = overallScore,
                    title = if (apps.isEmpty()) "UNSCANNED" else "HEALTH INDEX"
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = when {
                        apps.isEmpty() -> "No apps audited yet"
                        overallScore >= 80 -> "Device Posture: Protected"
                        overallScore >= 55 -> "Device Posture: Moderate Risk"
                        else -> "Action Required: High Exposure"
                    },
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Text(
                    text = if (apps.isEmpty())
                        "Install or scan applications to evaluate risk engine telemetry."
                    else
                        "Derived from ${apps.size} locally installed applications and real sensor logs.",
                    color = Color(0xFF94A3B8),
                    fontSize = 11.sp
                )
            }
        }

        // Metrics Grid
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            MetricCard(
                modifier = Modifier.weight(1f),
                title = "Audited Apps",
                value = "${apps.size}",
                color = Color(0xFF06B6D4),
                onClick = onNavigateToApps
            )
            MetricCard(
                modifier = Modifier.weight(1f),
                title = "High Risk (≥80)",
                value = "$highRiskCount",
                color = if (highRiskCount > 0) Color(0xFFEF4444) else Color(0xFF10B981),
                onClick = onNavigateToApps
            )
            MetricCard(
                modifier = Modifier.weight(1f),
                title = "Alerts",
                value = "$alertsCount",
                color = if (alertsCount > 0) Color(0xFFF59E0B) else Color(0xFF94A3B8),
                onClick = onNavigateToAlerts
            )
        }

        // Honest Platform Disclaimer (No Mock Data rule)
        Surface(
            color = Color(0xFF161F30),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = "SYSTEM AUDIT SOURCE DISCLOSURE",
                    color = Color(0xFF06B6D4),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = "Signals are labeled 'Observed' (direct UsageStats / Package broadcast), 'Inferred' (hardware sensor correlated with foreground app), or 'Declared' (granted in manifest). Android does not expose cross-app sensor history without system/ADB privileges.",
                    color = Color(0xFF94A3B8),
                    fontSize = 10.sp,
                    lineHeight = 14.sp
                )
            }
        }

        // Recent Audits Preview
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Recent Applications",
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = "View All (${apps.size})",
                color = Color(0xFF06B6D4),
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier.clickable { onNavigateToApps() }
            )
        }

        if (apps.isEmpty()) {
            Surface(
                color = Color(0xFF1E293B),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(modifier = Modifier.padding(24.dp), contentAlignment = Alignment.Center) {
                    Text(
                        text = "No apps scanned yet. Newly installed apps will be audited automatically.",
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp
                    )
                }
            }
        } else {
            apps.take(4).forEach { app ->
                AppRowCard(app = app, onClick = { onSelectApp(app.packageName) })
            }
        }
    }
}

@Composable
private fun MetricCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    color: Color,
    onClick: () -> Unit
) {
    Surface(
        color = Color(0xFF0F172A),
        shape = RoundedCornerShape(12.dp),
        modifier = modifier.clickable { onClick() }
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(text = title, color = Color(0xFF94A3B8), fontSize = 10.sp, fontFamily = FontFamily.Monospace)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = value, color = color, fontSize = 20.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
        }
    }
}

@Composable
fun AppRowCard(app: AppRecord, onClick: () -> Unit) {
    Surface(
        color = Color(0xFF0F172A),
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = app.appName, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Text(text = "${app.packageName} • v${app.versionName}", color = Color(0xFF94A3B8), fontSize = 10.sp, fontFamily = FontFamily.Monospace)
            }

            Box(
                modifier = Modifier
                    .background(
                        if (app.riskScore >= 80) Color(0x20EF4444)
                        else if (app.riskScore >= 55) Color(0x20F59E0B)
                        else Color(0x2010B981),
                        RoundedCornerShape(6.dp)
                    )
                    .border(
                        1.dp,
                        if (app.riskScore >= 80) Color(0xFFEF4444)
                        else if (app.riskScore >= 55) Color(0xFFF59E0B)
                        else Color(0xFF10B981),
                        RoundedCornerShape(6.dp)
                    )
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = "${app.riskScore} Risk",
                    color = if (app.riskScore >= 80) Color(0xFFEF4444)
                    else if (app.riskScore >= 55) Color(0xFFF59E0B)
                    else Color(0xFF10B981),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }
        }
    }
}
