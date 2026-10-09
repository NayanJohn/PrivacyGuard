import type { AuditResult } from '../api/schema';

export const DEMO_NOTES_AUDIT: AuditResult = {
  audit_id: "demo-notes",
  status: "complete",
  stage: "Complete",
  error: null,
  created_at: "2026-10-07T05:32:12.654273+00:00",
  expires_at: "2026-10-14T05:32:12.654273+00:00",
  source: "Uploaded APK",
  app: {
    app_name: "Demo Notes",
    package_name: "com.example.demonotes",
    version_name: "2.4.1 (Build 142)",
    min_sdk: 24,
    target_sdk: 32,
    apk_sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
  },
  claim: "A simple note-taking application for creating, editing and saving notes.",
  category: "Notes",
  category_source: "user",
  score: 50,
  risk_label: "Elevated Concern",
  score_bands: [
    {
      min: 0,
      max: 20,
      label: "Low Concern",
      color: "#10b981",
      description: "Permissions closely match stated claims and category baselines."
    },
    {
      min: 21,
      max: 45,
      label: "Moderate Concern",
      color: "#3b82f6",
      description: "Some optional permissions declared beyond standard baseline."
    },
    {
      min: 46,
      max: 70,
      label: "Elevated Concern",
      color: "#f59e0b",
      description: "Sensitive declarations deviate noticeably from peer apps."
    },
    {
      min: 71,
      max: 100,
      label: "High Concern (Requires Review)",
      color: "#f97316",
      description: "Marked divergence between declared permissions and declared claims."
    }
  ],
  components: [
    {
      name: "Claim-to-Permission Divergence",
      weight: 50,
      score: 48.35,
      description: "Analyzes discrepancy between user-facing stated capabilities and declared permissions.",
      verified: true,
      reasons: [
        "Microphone & Audio Recording is requested, but claims do not describe this capability.",
        "Precise GPS Location is requested, but claims do not describe this capability."
      ]
    },
    {
      name: "Peer Category Benchmark Deviation",
      weight: 10,
      score: 65.0,
      description: "Measures permission declaration frequencies against peer category apps.",
      verified: true,
      reasons: [
        "Network & Internet Access aligns with 92.0% category baseline.",
        "Only 4.0% of peer apps request Microphone & Audio Recording.",
        "Only 7.0% of peer apps request Precise GPS Location."
      ]
    },
    {
      name: "Sensitive Data Scope",
      weight: 10,
      score: 35.0,
      description: "Evaluates broad vs scoped data access and sensitive permission combinations.",
      verified: true,
      reasons: [
        "Declares ACCESS_FINE_LOCATION instead of scoped approximate location."
      ]
    },
    {
      name: "Third-Party SDK Surface",
      weight: 10,
      score: 55.0,
      description: "Detected advertising, telemetry, and tracking SDK signatures embedded in package bytecode.",
      verified: true,
      reasons: [
        "Contains ExampleAnalyticsSDK (third-party analytics sdk detected.)."
      ]
    },
    {
      name: "Runtime Dynamic Behavior",
      weight: 10,
      score: 0.0,
      description: "Live observation of network traffic and runtime authorization prompts.",
      verified: false,
      reasons: [
        "Not Verified: static analyzer does not execute the APK.",
        "Available in the PrivacyGuard Android app runtime monitor."
      ]
    },
    {
      name: "Source Verification",
      weight: 5,
      score: 10.0,
      description: "Verifies official cryptographic store origin signatures and packaging integrity.",
      verified: true,
      reasons: [
        "App distribution verified from official package repository."
      ]
    },
    {
      name: "Security Configuration",
      weight: 5,
      score: 45.0,
      description: "Static evaluation of target SDK version, exported components, and manifest security flags.",
      verified: true,
      reasons: [
        "Target SDK 32 is below modern Android platform requirements.",
        "1 exported component(s) handle intents without permission restrictions."
      ]
    }
  ],
  findings: [
    {
      id: "perm-1",
      permission: "android.permission.RECORD_AUDIO",
      name: "Microphone & Audio Recording",
      purpose: "Captures audio streams from device microphone at runtime.",
      relevance: "not_justified",
      benchmark_pct: 4.0,
      evidence_type: "observed",
      evidence_details: "Declared in AndroidManifest.xml and referenced in AudioRecordManager.class.",
      category_comparison: "Only 4.0% of note-taking apps request this."
    },
    {
      id: "perm-2",
      permission: "android.permission.ACCESS_FINE_LOCATION",
      name: "Precise GPS Location",
      purpose: "Accesses high-accuracy satellite and cell-tower geographic coordinates within meters.",
      relevance: "not_justified",
      benchmark_pct: 7.0,
      evidence_type: "observed",
      evidence_details: "Declared in AndroidManifest.xml and referenced in LocationTelemetryProvider.class.",
      category_comparison: "Only 7.0% of note-taking apps request this."
    },
    {
      id: "perm-3",
      permission: "android.permission.CAMERA",
      name: "Camera Access",
      purpose: "Captures still photographs and records video feeds from camera sensors.",
      relevance: "potentially_relevant",
      benchmark_pct: 18.0,
      evidence_type: "observed",
      evidence_details: "Declared in AndroidManifest.xml and referenced in PhotoCaptureHelper.class.",
      category_comparison: "Used in 18.0% of note-taking apps for optional features."
    },
    {
      id: "perm-4",
      permission: "android.permission.INTERNET",
      name: "Network & Internet Access",
      purpose: "Allows app to establish network connections and transfer data over the internet.",
      relevance: "required",
      benchmark_pct: 92.0,
      evidence_type: "observed",
      evidence_details: "Declared in AndroidManifest.xml.",
      category_comparison: "Standard across 92.0% of note-taking applications."
    },
    {
      id: "perm-5",
      permission: "android.permission.POST_NOTIFICATIONS",
      name: "Post System Notifications",
      purpose: "Displays alerts, reminder banners, and status badges in system tray.",
      relevance: "required",
      benchmark_pct: 54.0,
      evidence_type: "observed",
      evidence_details: "Declared in AndroidManifest.xml.",
      category_comparison: "Common across 54.0% of note-taking applications."
    }
  ],
  benchmark_sample_size: 4280,
  runtime_note: "Runtime behavior was not observed for uploaded APKs (Not Verified).",
  recommendations: [
    "Review whether you need Microphone & Audio Recording, Precise GPS Location features in this application before granting permission prompts on your device.",
    "Check if the app offers an offline mode or settings toggle to disable diagnostic telemetry and third-party advertising SDKs.",
    "Verify that declared permissions remain consistent with your intended workflow for Notes.",
    "If you have already installed this app, use the PrivacyGuard Android app to inspect whether sensitive permissions have been actively granted at runtime."
  ],
  confidence: 95.6
};
