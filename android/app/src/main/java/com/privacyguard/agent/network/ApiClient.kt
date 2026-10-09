package com.privacyguard.agent.network

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

object ApiClient {
    private val client = OkHttpClient()
    var backendUrl: String = "http://10.0.2.2:8000/api/v1" // Default Android emulator host loopback

    fun sendEvent(packageName: String, eventType: String, payload: Map<String, Any>) {
        Thread {
            try {
                val json = JSONObject().apply {
                    put("package_name", packageName)
                    put("event_type", eventType)
                    put("payload", JSONObject(payload))
                }
                val body = json.toString().toRequestBody("application/json".toMediaType())
                val request = Request.Builder()
                    .url("$backendUrl/agent/events")
                    .post(body)
                    .build()
                client.newCall(request).execute().close()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }
}
