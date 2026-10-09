package com.privacyguard.agent.ui.screens

import androidx.compose.foundation.background
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
import com.privacyguard.agent.data.models.AppRecord

@Composable
fun AppListScreen(
    onSelectApp: (String) -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val dbHelper = remember { AppDatabaseHelper.getInstance(context) }
    var apps by remember { mutableStateOf<List<AppRecord>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var filterSeverity by remember { mutableStateOf("all") }

    LaunchedEffect(Unit) {
        apps = dbHelper.getAllApps()
    }

    val filteredApps = remember(apps, searchQuery, filterSeverity) {
        apps.filter { app ->
            val matchesQuery = app.appName.contains(searchQuery, ignoreCase = true) ||
                    app.packageName.contains(searchQuery, ignoreCase = true)
            val matchesSeverity = when (filterSeverity) {
                "high" -> app.riskScore >= 80
                "moderate" -> app.riskScore in 55..79
                "low" -> app.riskScore < 55
                else -> true
            }
            matchesQuery && matchesSeverity
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0C10))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Top Nav
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "AUDITED APPLICATIONS (${apps.size})",
                color = Color(0xFF06B6D4),
                fontSize = 16.sp,
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

        // Search bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Filter by app or package name...", color = Color(0xFF64748B), fontSize = 12.sp) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White
            ),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth()
        )

        // Filter pills
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterPill("All", filterSeverity == "all") { filterSeverity = "all" }
            FilterPill("Critical (≥80)", filterSeverity == "high") { filterSeverity = "high" }
            FilterPill("Moderate (55-79)", filterSeverity == "moderate") { filterSeverity = "moderate" }
            FilterPill("Safe (<55)", filterSeverity == "low") { filterSeverity = "low" }
        }

        // App list or empty state
        if (filteredApps.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (apps.isEmpty())
                        "No apps scanned yet. Install an APK or wait for the background monitor to index installed packages."
                    else
                        "No applications match the active filter.",
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
                items(filteredApps) { app ->
                    AppRowCard(app = app, onClick = { onSelectApp(app.packageName) })
                }
            }
        }
    }
}

@Composable
private fun FilterPill(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        color = if (selected) Color(0x3006B6D4) else Color(0xFF1E293B),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.clickable { onClick() }
    ) {
        Text(
            text = label,
            color = if (selected) Color(0xFF06B6D4) else Color(0xFF94A3B8),
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            fontFamily = FontFamily.Monospace,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
        )
    }
}
