package com.privacyguard.agent.ui.screens

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
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
import com.privacyguard.agent.data.models.RuntimeEventRecord
import com.privacyguard.agent.ui.components.ConfidenceBadge

@Composable
fun AppDetailScreen(
    packageName: String,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val dbHelper = remember { AppDatabaseHelper.getInstance(context) }
    var appRecord by remember { mutableStateOf<AppRecord?>(null) }
    var runtimeEvents by remember { mutableStateOf<List<RuntimeEventRecord>>(emptyList()) }
    var requestedPerms by remember { mutableStateOf<List<String>>(emptyList()) }
    var grantedPerms by remember { mutableStateOf<List<String>>(emptyList()) }

    LaunchedEffect(packageName) {
        appRecord = dbHelper.getAppByPackage(packageName)
        runtimeEvents = dbHelper.getRecentRuntimeEvents().filter { it.packageName == packageName }

        try {
            val pm = context.packageManager
            val pInfo = pm.getPackageInfo(packageName, PackageManager.GET_PERMISSIONS)
            val requested = pInfo.requestedPermissions?.toList() ?: emptyList()
            val flags = pInfo.requestedPermissionsFlags
            val granted = requested.filterIndexed { index, _ ->
                flags != null && index < flags.size && (flags[index] and PackageManager.REQUESTED_PERMISSION_GRANTED) != 0
            }
            requestedPerms = requested
            grantedPerms = granted
        } catch (_: Exception) {}
    }

    val app = appRecord

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0C10))
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Nav Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "AUDIT BREAKDOWN",
                color = Color(0xFF06B6D4),
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = "← Back",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier.clickable { onBack() }
            )
        }

        if (app == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(text = "App details not found in local audit database.", color = Color(0xFF94A3B8))
            }
            return@Column
        }

        // App Headline Card
        Surface(
            color = Color(0xFF0F172A),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = app.appName, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        Text(text = app.packageName, color = Color(0xFF94A3B8), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                        Text(text = "v${app.versionName} • Category: ${app.category}", color = Color(0xFF64748B), fontSize = 11.sp)
                    }

                    Box(
                        modifier = Modifier
                            .background(
                                if (app.riskScore >= 80) Color(0x20EF4444)
                                else if (app.riskScore >= 55) Color(0x20F59E0B)
                                else Color(0x2010B981),
                                RoundedCornerShape(8.dp)
                            )
                            .border(
                                1.dp,
                                if (app.riskScore >= 80) Color(0xFFEF4444)
                                else if (app.riskScore >= 55) Color(0xFFF59E0B)
                                else Color(0xFF10B981),
                                RoundedCornerShape(8.dp)
                            )
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = "${app.riskScore} / 100",
                            color = if (app.riskScore >= 80) Color(0xFFEF4444)
                            else if (app.riskScore >= 55) Color(0xFFF59E0B)
                            else Color(0xFF10B981),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }

                // SHA-256 Checksum
                Text(
                    text = "SHA-256: ${app.apkSha256.take(24)}...",
                    color = Color(0xFF475569),
                    fontSize = 9.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        // 3-Component Score Engine Breakdown
        Text(
            text = "3-COMPONENT SCORE BREAKDOWN",
            color = Color.White,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace
        )

        Surface(
            color = Color(0xFF0F172A),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ScoreComponentBar(
                    name = "RiskInDroid ML Model",
                    weight = "40% Weight",
                    score = app.mlRisk.toInt(),
                    color = Color(0xFF06B6D4)
                )
                ScoreComponentBar(
                    name = "MobSF Static Risk (100 - Security)",
                    weight = "35% Weight",
                    score = app.staticRisk.toInt(),
                    color = Color(0xFFF59E0B)
                )
                ScoreComponentBar(
                    name = "Privacy Heuristics",
                    weight = "25% Weight",
                    score = app.heuristicRisk.toInt(),
                    color = Color(0xFF8B5CF6)
                )
            }
        }

        // Permissions Matrix with Evidence Confidence
        Text(
            text = "PERMISSIONS & EVIDENCE CONFIDENCE",
            color = Color.White,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace
        )

        if (requestedPerms.isEmpty()) {
            Surface(
                color = Color(0xFF1E293B),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(modifier = Modifier.padding(16.dp), contentAlignment = Alignment.Center) {
                    Text("No permissions declared by this application.", color = Color(0xFF94A3B8), fontSize = 11.sp)
                }
            }
        } else {
            requestedPerms.take(8).forEach { perm ->
                val isGranted = grantedPerms.contains(perm)
                val isDangerous = perm.contains("LOCATION") || perm.contains("CAMERA") || perm.contains("AUDIO") || perm.contains("SMS")
                val confidence = if (runtimeEvents.any { it.eventType.contains("resumed") }) "Observed" else if (isDangerous && isGranted) "Inferred" else "Declared"

                Surface(
                    color = Color(0xFF0F172A),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = perm.substringAfterLast("."),
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                            Text(
                                text = if (isGranted) "GRANTED" else "NOT GRANTED",
                                color = if (isGranted) Color(0xFF10B981) else Color(0xFF64748B),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }

                        ConfidenceBadge(confidence = confidence)
                    }
                }
            }
        }

        // Action: Manage in System Settings
        Button(
            onClick = {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", app.packageName, null)
                }
                context.startActivity(intent)
            },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "MANAGE PERMISSIONS IN SYSTEM SETTINGS",
                color = Color(0xFF06B6D4),
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                fontSize = 11.sp
            )
        }
    }
}

@Composable
private fun ScoreComponentBar(name: String, weight: String, score: Int, color: Color) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(text = name, color = Color.White, fontSize = 11.sp)
            Text(text = "$score / 100 ($weight)", color = color, fontSize = 11.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
        }
        LinearProgressIndicator(
            progress = { score / 100f },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp),
            color = color,
            trackColor = Color(0xFF1E293B),
        )
    }
}
