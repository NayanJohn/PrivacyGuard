package com.privacyguard.agent.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ConfidenceBadge(
    confidence: String,
    modifier: Modifier = Modifier
) {
    val (bgColor, textColor, borderColor, label) = when (confidence.lowercase()) {
        "observed" -> Quad(
            Color(0x2010B981),
            Color(0xFF34D399),
            Color(0x5010B981),
            "OBSERVED: Direct Platform Signal"
        )
        "inferred" -> Quad(
            Color(0x2006B6D4),
            Color(0xFF22D3EE),
            Color(0x5006B6D4),
            "INFERRED: Correlated with Foreground"
        )
        else -> Quad(
            Color(0x2094A3B8),
            Color(0xFFCBD5E1),
            Color(0x4064748B),
            "DECLARED: Granted in Manifest"
        )
    }

    Box(
        modifier = modifier
            .background(bgColor, RoundedCornerShape(6.dp))
            .border(1.dp, borderColor, RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(
            text = label,
            color = textColor,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace
        )
    }
}

private data class Quad<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
