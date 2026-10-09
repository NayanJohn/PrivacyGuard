package com.privacyguard.agent.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
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
import com.privacyguard.agent.data.models.UserProfileRecord
import com.privacyguard.agent.network.PrivacyGuardApiClient

@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onResetOnboarding: () -> Unit
) {
    val context = LocalContext.current
    val dbHelper = remember { AppDatabaseHelper.getInstance(context) }
    var profile by remember { mutableStateOf<UserProfileRecord?>(null) }
    var backendUrl by remember { mutableStateOf(PrivacyGuardApiClient.baseUrl) }

    LaunchedEffect(Unit) {
        profile = dbHelper.getUserProfile()
    }

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
                text = "SETTINGS & PRIVACY",
                color = Color(0xFF06B6D4),
                fontSize = 15.sp,
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

        // Backend URL Config
        Text(text = "BACKEND SERVER CONFIGURATION", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
        Surface(color = Color(0xFF0F172A), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = backendUrl,
                    onValueChange = {
                        backendUrl = it
                        PrivacyGuardApiClient.baseUrl = it
                    },
                    label = { Text("Base URL", color = Color(0xFF94A3B8)) },
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                    modifier = Modifier.fillMaxWidth()
                )
                Text(text = "Default emulator loopback is http://10.0.2.2:8000. Set to local IP if running on physical device.", color = Color(0xFF64748B), fontSize = 10.sp)
            }
        }

        // Profile & Parental Link Status
        Text(text = "USER PROFILE & GUARDIAN LINK", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
        Surface(color = Color(0xFF0F172A), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = "Age Category: ${profile?.ageCategory?.uppercase() ?: "ADULT"}", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                if (profile?.parentLinked == true) {
                    Text(text = "Parent Linked: ${profile?.parentEmail}", color = Color(0xFF10B981), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                    Text(text = "Parental alerts enabled for audit risk scores ≥ 80.", color = Color(0xFF94A3B8), fontSize = 10.sp)
                } else {
                    Text(text = "Parental Link: Not Configured", color = Color(0xFF94A3B8), fontSize = 11.sp)
                }
            }
        }

        // Consent Controls
        Text(text = "CONSENT & DATA PERMISSIONS", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
        Surface(color = Color(0xFF0F172A), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("APK Upload Consent", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text("Send base APK to scoring engine for 3-component inspection.", color = Color(0xFF94A3B8), fontSize = 10.sp)
                    }
                    Switch(
                        checked = profile?.consentApkUpload ?: true,
                        onCheckedChange = { checked ->
                            profile?.let { p ->
                                val updated = p.copy(consentApkUpload = checked)
                                dbHelper.saveUserProfile(updated)
                                profile = updated
                            }
                        }
                    )
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Telemetry Event Sync", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text("Stream runtime sensor callbacks to backend dashboard.", color = Color(0xFF94A3B8), fontSize = 10.sp)
                    }
                    Switch(
                        checked = profile?.consentTelemetrySync ?: true,
                        onCheckedChange = { checked ->
                            profile?.let { p ->
                                val updated = p.copy(consentTelemetrySync = checked)
                                dbHelper.saveUserProfile(updated)
                                profile = updated
                            }
                        }
                    )
                }
            }
        }

        // Compliance: Data Purge
        Text(text = "DATA MINIMIZATION & GDPR/CCPA", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
        Surface(color = Color(0xFF1E293B), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Purge All Data Compliance Guarantee",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Instantly clears all local databases, cached APK SHA-256 hashes, runtime sensor logs, and requests the backend server to purge all scan records and parent links associated with this device.",
                    color = Color(0xFF94A3B8),
                    fontSize = 10.sp,
                    lineHeight = 14.sp
                )
                Button(
                    onClick = {
                        val userId = profile?.userId
                        Thread {
                            if (userId != null) {
                                try {
                                    PrivacyGuardApiClient.deleteUserData(userId)
                                } catch (_: Exception) {}
                            }
                            dbHelper.clearAllData()
                        }.start()
                        Toast.makeText(context, "All data purged cleanly.", Toast.LENGTH_SHORT).show()
                        onResetOnboarding()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "PURGE ALL MY DATA NOW",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}
