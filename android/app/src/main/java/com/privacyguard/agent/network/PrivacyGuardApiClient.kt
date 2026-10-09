package com.privacyguard.agent.network

import com.privacyguard.agent.data.models.ComponentScoreBreakdown
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

object PrivacyGuardApiClient {
    // 10.0.2.2 is Android Emulator loopback to host; configurable via Settings
    var baseUrl: String = "http://10.0.2.2:8000"

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    /**
     * Compute SHA-256 hash of a local file (e.g. base.apk from package sourceDir)
     */
    fun computeSha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val buffer = ByteArray(8192)
        FileInputStream(file).use { fis ->
            var bytesRead: Int
            while (fis.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    /**
     * Upload an APK file to the backend scoring engine
     */
    fun uploadApk(file: File, claim: String = "Android application audit", category: String = "Utility"): String? {
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("file", file.name, file.asRequestBody("application/vnd.android.package-archive".toMediaType()))
            .addFormDataPart("claim", claim)
            .addFormDataPart("category", category)
            .build()

        val request = Request.Builder()
            .url("$baseUrl/analyze")
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            val body = response.body?.string() ?: return null
            val json = JSONObject(body)
            return json.optString("scan_id").takeIf { it.isNotEmpty() } ?: json.optString("audit_id")
        }
    }

    /**
     * Poll the backend for audit result (preliminary or final with MobSF static risk)
     */
    fun getAuditResult(scanId: String): ComponentScoreBreakdown? {
        val request = Request.Builder()
            .url("$baseUrl/analyze/$scanId")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            val body = response.body?.string() ?: return null
            val json = JSONObject(body)

            val finalScore = json.optInt("score", 0)
            val severity = json.optString("severity", json.optString("risk_label", "low"))

            var mlRisk = 0.0
            var staticRisk = 0.0
            var heuristicRisk = 0.0

            // Parse components breakdown
            val components = json.optJSONArray("components")
            if (components != null) {
                for (i in 0 until components.length()) {
                    val comp = components.getJSONObject(i)
                    when (comp.optString("component_name")) {
                        "riskindroid_ml" -> mlRisk = comp.optDouble("raw_score", 0.0)
                        "mobsf_static" -> staticRisk = comp.optDouble("raw_score", 0.0)
                        "heuristics" -> heuristicRisk = comp.optDouble("raw_score", 0.0)
                    }
                }
            }

            val topRiskFactors = mutableListOf<String>()
            val topArr = json.optJSONArray("top_risk_factors")
            if (topArr != null) {
                for (i in 0 until topArr.length()) {
                    topRiskFactors.add(topArr.getString(i))
                }
            }

            val recommendations = mutableListOf<String>()
            val recArr = json.optJSONArray("recommendations")
            if (recArr != null) {
                for (i in 0 until recArr.length()) {
                    recommendations.add(recArr.getString(i))
                }
            }

            return ComponentScoreBreakdown(
                mlRisk = mlRisk,
                staticRisk = staticRisk,
                heuristicRisk = heuristicRisk,
                finalScore = finalScore,
                severity = severity,
                topRiskFactors = topRiskFactors,
                recommendations = recommendations
            )
        }
    }

    /**
     * Register this Android device with the backend
     */
    fun registerDevice(deviceModel: String, osVersion: String, sdkInt: Int, userId: String?): String? {
        val json = JSONObject().apply {
            put("device_model", deviceModel)
            put("os_version", osVersion)
            put("sdk_int", sdkInt)
            if (userId != null) put("user_id", userId)
        }
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$baseUrl/devices/register")
            .post(body)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            val respBody = response.body?.string() ?: return null
            return JSONObject(respBody).optString("device_id")
        }
    }

    /**
     * Ingest runtime events batch from device monitoring
     */
    fun sendDeviceEvents(deviceId: String, events: List<Map<String, Any>>): Boolean {
        val jsonArray = JSONArray()
        events.forEach { evt ->
            jsonArray.put(JSONObject(evt))
        }
        val reqObj = JSONObject().apply {
            put("events", jsonArray)
        }
        val body = reqObj.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$baseUrl/devices/$deviceId/events")
            .post(body)
            .build()

        client.newCall(request).execute().use { response ->
            return response.isSuccessful
        }
    }

    /**
     * Onboard user with age classification and consent
     */
    fun onboardUser(displayName: String, ageCategory: String, dob: String?): JSONObject? {
        val json = JSONObject().apply {
            put("display_name", displayName)
            put("age_category", ageCategory)
            if (dob != null) put("dob", dob)
        }
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$baseUrl/users/onboard")
            .post(body)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            val respBody = response.body?.string() ?: return null
            return JSONObject(respBody)
        }
    }

    /**
     * Link parent email for under-18 user
     */
    fun linkParent(parentEmail: String, childUserId: String): JSONObject? {
        val json = JSONObject().apply {
            put("parent_email", parentEmail)
            put("child_user_id", childUserId)
        }
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$baseUrl/parent/link")
            .post(body)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            val respBody = response.body?.string() ?: return null
            return JSONObject(respBody)
        }
    }

    /**
     * Parent verification code check
     */
    fun verifyParent(verificationCode: String, magicToken: String?): Boolean {
        val json = JSONObject().apply {
            put("verification_code", verificationCode)
            if (magicToken != null) put("magic_token", magicToken)
        }
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$baseUrl/parent/verify")
            .post(body)
            .build()

        client.newCall(request).execute().use { response ->
            return response.isSuccessful
        }
    }

    /**
     * Delete user data compliance ("Purge all my data")
     */
    fun deleteUserData(userId: String): Boolean {
        val request = Request.Builder()
            .url("$baseUrl/users/$userId/data")
            .delete()
            .build()

        client.newCall(request).execute().use { response ->
            return response.isSuccessful
        }
    }
}
