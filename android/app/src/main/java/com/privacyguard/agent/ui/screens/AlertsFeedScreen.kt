package com.privacyguard.agent.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.privacyguard.agent.data.models.SecurityAlertRecord
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun AlertsFeedScreen(
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val dbHelper = remember { AppDatabaseHelper.getInstance(context) }
    var alerts by remember { mutableStateOf<List<SecurityAlertRecord>>(emptyList()) }

    LaunchedEffect(Unit) {
        alerts = dbHelper.getAllAlerts()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0C10))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Nav Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "SECURITY & RISK ALERTS (${alerts.size})",
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

        if (alerts.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No security alerts recorded. Your installed applications are adhering to baseline security boundaries.",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(alerts) { alert ->
                    AlertCard(
                        alert = alert,
                        onResolve = {
                            dbHelper.resolveAlert(alert.id)
                            alerts = dbHelper.getAllAlerts()
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun AlertCard(
    alert: SecurityAlertRecord,
    onResolve: () -> Unit
) {
    val dateStr = remember(alert.createdAt) {
        SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault()).format(Date(alert.createdAt))
    }

    Surface(
        color = Color(0xFF0F172A),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .background(
                            if (alert.severity == "critical") Color(0x20EF4444) else Color(0x20F59E0B),
                            RoundedCornerShape(6.dp)
                        )
                        .border(
                            1.dp,
                            if (alert.severity == "critical") Color(0xFFEF4444) else Color(0xFFF59E0B),
                            RoundedCornerShape(6.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = alert.severity.uppercase(),
                        color = if (alert.severity == "critical") Color(0xFFEF4444) else Color(0xFFF59E0B),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Text(
                    text = dateStr,
                    color = Color(0xFF64748B),
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace
                )
            }

            Text(
                text = alert.title,
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = alert.message,
                color = Color(0xFFCBD5E1),
                fontSize = 11.sp,
                lineHeight = 15.sp
            )

            if (!alert.resolved) {
                Button(
                    onClick = onResolve,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text(
                        text = "Mark as Resolved",
                        color = Color(0xFF06B6D4),
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            } else {
                Text(
                    text = "✓ Resolved",
                    color = Color(0xFF10B981),
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.align(Alignment.End)
                )
            }
        }
    }
}
