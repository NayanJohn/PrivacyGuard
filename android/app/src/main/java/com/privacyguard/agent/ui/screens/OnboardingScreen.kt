package com.privacyguard.agent.ui.screens

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.os.Process
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
import com.privacyguard.agent.data.models.UserProfileRecord
import com.privacyguard.agent.network.PrivacyGuardApiClient
import java.util.UUID

@Composable
fun OnboardingScreen(
    onComplete: () -> Unit
) {
    val context = LocalContext.current
    val dbHelper = remember { AppDatabaseHelper.getInstance(context) }

    var displayName by remember { mutableStateOf("Android User") }
    var ageCategory by remember { mutableStateOf("adult") } // 'adult' | 'minor'
    var dob by remember { mutableStateOf("2000-01-01") }
    var parentEmail by remember { mutableStateOf("") }
    var consentApkUpload by remember { mutableStateOf(true) }
    var consentTelemetry by remember { mutableStateOf(true) }

    var hasUsageAccess by remember {
        mutableStateOf(checkUsageAccess(context))
    }

    LaunchedEffect(Unit) {
        hasUsageAccess = checkUsageAccess(context)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0C10))
            .padding(20.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Brand Header
        Text(
            text = "PRIVACYGUARD v2",
            color = Color(0xFF06B6D4),
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace
        )
        Text(
            text = "Understand Before You Trust • Setup & Permissions",
            color = Color(0xFF94A3B8),
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace
        )

        Divider(color = Color(0x30334155))

        // Age Category Selection
        Text(
            text = "1. Age Classification (Self-Declared)",
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .background(
                        if (ageCategory == "adult") Color(0x2006B6D4) else Color(0xFF1E293B),
                        RoundedCornerShape(12.dp)
                    )
                    .border(
                        1.dp,
                        if (ageCategory == "adult") Color(0xFF06B6D4) else Color(0x20FFFFFF),
                        RoundedCornerShape(12.dp)
                    )
                    .clickable { ageCategory = "adult" }
                    .padding(14.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "18 and Above",
                    color = if (ageCategory == "adult") Color(0xFF06B6D4) else Color(0xFF94A3B8),
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .background(
                        if (ageCategory == "minor") Color(0x20F59E0B) else Color(0xFF1E293B),
                        RoundedCornerShape(12.dp)
                    )
                    .border(
                        1.dp,
                        if (ageCategory == "minor") Color(0xFFF59E0B) else Color(0x20FFFFFF),
                        RoundedCornerShape(12.dp)
                    )
                    .clickable { ageCategory = "minor" }
                    .padding(14.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Below 18 (Minor)",
                    color = if (ageCategory == "minor") Color(0xFFF59E0B) else Color(0xFF94A3B8),
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }
        }

        // If minor selected, require parent linking
        if (ageCategory == "minor") {
            Surface(
                color = Color(0xFF161F30),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Guardian / Parent Consent Required",
                        color = Color(0xFFF59E0B),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "When an app score crosses 80, your parent receives an email alert with the app name, risk score, and plain-English risk factors. No messages, photos, or browsing content are ever shared.",
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp,
                        lineHeight = 15.sp
                    )
                    OutlinedTextField(
                        value = parentEmail,
                        onValueChange = { parentEmail = it },
                        label = { Text("Parent Gmail Address", color = Color(0xFF94A3B8)) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        // Usage Access Permission Setup
        Text(
            text = "2. System Permission: Usage Access",
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold
        )

        Surface(
            color = Color(0xFF1E293B),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Required for Foreground/Background Timeline",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Allows PrivacyGuard to detect when apps transition to the background and flag apps making background network calls.",
                    color = Color(0xFF94A3B8),
                    fontSize = 11.sp
                )
                Button(
                    onClick = {
                        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
                        context.startActivity(intent)
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (hasUsageAccess) Color(0xFF10B981) else Color(0xFF06B6D4)
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = if (hasUsageAccess) "Usage Access Granted" else "Grant Usage Access in Settings",
                        color = Color(0xFF0A0C10),
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }
        }

        // Consent Toggles
        Text(
            text = "3. Explicit Privacy Consent",
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("APK Upload Consent", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Text("Allow uploading base APKs to the 3-component engine for deep static analysis.", color = Color(0xFF94A3B8), fontSize = 10.sp)
            }
            Switch(
                checked = consentApkUpload,
                onCheckedChange = { consentApkUpload = it }
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Telemetry Sync", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Text("Sync anonymized runtime sensor events to backend for dashboard visualization.", color = Color(0xFF94A3B8), fontSize = 10.sp)
            }
            Switch(
                checked = consentTelemetry,
                onCheckedChange = { consentTelemetry = it }
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Complete Button
        Button(
            onClick = {
                val userId = UUID.randomUUID().toString()
                val profile = UserProfileRecord(
                    userId = userId,
                    displayName = displayName,
                    ageCategory = ageCategory,
                    dob = dob,
                    parentLinked = ageCategory == "minor" && parentEmail.isNotBlank(),
                    parentEmail = parentEmail.takeIf { it.isNotBlank() },
                    consentApkUpload = consentApkUpload,
                    consentTelemetrySync = consentTelemetry
                )
                dbHelper.saveUserProfile(profile)

                // Async backend registration
                Thread {
                    try {
                        PrivacyGuardApiClient.onboardUser(displayName, ageCategory, dob)
                        if (profile.parentLinked && parentEmail.isNotBlank()) {
                            PrivacyGuardApiClient.linkParent(parentEmail, userId)
                        }
                    } catch (_: Exception) {}
                }.start()

                onComplete()
            },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF06B6D4)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Text(
                text = "CONTINUE TO MONITORING",
                color = Color(0xFF0A0C10),
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                fontSize = 13.sp
            )
        }
    }
}

private fun checkUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
    val mode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
}
