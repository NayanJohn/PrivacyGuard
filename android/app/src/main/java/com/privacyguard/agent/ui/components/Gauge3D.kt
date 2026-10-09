package com.privacyguard.agent.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun Rotating3DRiskGauge(
    score: Int,
    modifier: Modifier = Modifier,
    title: String = "PRIVACY INDEX"
) {
    val infiniteTransition = rememberInfiniteTransition(label = "gauge_rot")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(12000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )

    val wobble by infiniteTransition.animateFloat(
        initialValue = -8f,
        targetValue = 8f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "wobble"
    )

    val ringColor = when {
        score >= 80 -> Color(0xFF10B981) // Safe
        score >= 55 -> Color(0xFFF59E0B) // Moderate
        score >= 30 -> Color(0xFFF97316) // Elevated
        else -> Color(0xFFEF4444)        // Critical
    }

    Box(
        modifier = modifier
            .size(190.dp)
            .graphicsLayer {
                rotationY = wobble
                rotationX = wobble * 0.5f
                cameraDistance = 16f * density
            },
        contentAlignment = Alignment.Center
    ) {
        // Outer glowing 3D-effect rotating orbit ring
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer { rotationZ = rotation }
        ) {
            val strokeWidth = 3.dp.toPx()
            val radius = size.minDimension / 2f - strokeWidth

            // Orbit particles
            for (i in 0 until 12) {
                val angle = Math.toRadians((i * 30.0))
                val x = center.x + radius * cos(angle).toFloat()
                val y = center.y + radius * sin(angle).toFloat()
                drawCircle(
                    color = ringColor.copy(alpha = if (i % 2 == 0) 0.8f else 0.2f),
                    radius = if (i % 3 == 0) 4.dp.toPx() else 2.dp.toPx(),
                    center = Offset(x, y)
                )
            }
        }

        // Inner solid arc ring
        Canvas(modifier = Modifier.size(150.dp)) {
            val strokeWidth = 10.dp.toPx()
            val radius = size.minDimension / 2f - strokeWidth / 2

            // Track background
            drawArc(
                color = Color(0xFF1E293B),
                startAngle = 135f,
                sweepAngle = 270f,
                useCenter = false,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )

            // Progress arc
            val sweep = (score / 100f) * 270f
            drawArc(
                brush = Brush.sweepGradient(
                    colors = listOf(ringColor.copy(alpha = 0.6f), ringColor)
                ),
                startAngle = 135f,
                sweepAngle = sweep,
                useCenter = false,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )
        }

        // Center Score Readout
        Box(
            modifier = Modifier
                .size(110.dp)
                .clip(CircleShape)
                .background(Color(0xFF0F172A)),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "$score",
                    color = Color.White,
                    fontSize = 34.sp,
                    fontWeight = FontWeight.ExtraBold,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = title,
                    color = ringColor,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        }
    }
}
