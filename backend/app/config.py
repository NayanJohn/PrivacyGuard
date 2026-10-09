import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RULES_PATH = BASE_DIR / 'data' / 'rules.json'
BENCHMARKS_PATH = BASE_DIR / 'data' / 'benchmarks.json'
TRACKERS_PATH = BASE_DIR / 'data' / 'trackers.json'

with open(RULES_PATH, 'r', encoding='utf-8') as f:
    RULES_DATA = json.load(f)

# v2 Core Weights & Thresholds
WEIGHT_ML = float(os.getenv("WEIGHT_ML", "0.25"))
WEIGHT_STATIC = float(os.getenv("WEIGHT_STATIC", "0.25"))
WEIGHT_HEURISTIC = float(os.getenv("WEIGHT_HEURISTIC", "0.50"))
PARENT_ALERT_THRESHOLD = int(os.getenv("PARENT_ALERT_THRESHOLD", "80"))
MAX_APK_MB = int(os.getenv("MAX_APK_MB", "500"))

# Service & Infrastructure Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./privacyguard.db")
JWT_SECRET = os.getenv("JWT_SECRET", "privacyguard_hackbios_shadow_secret_jwt_2026")
MOBSF_URL = os.getenv("MOBSF_URL", "http://localhost:8000").rstrip("/")
MOBSF_API_KEY = os.getenv("MOBSF_API_KEY", "")
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SITE_URL = os.getenv("SITE_URL", "http://localhost:5173").rstrip("/")

WEIGHTS = RULES_DATA.get('weights', {
    "static": 0.50,
    "benchmark": 0.10,
    "runtime": 0.10,
    "tracker": 0.10,
    "privacy": 0.10,
    "source": 0.05,
    "security": 0.05,
})

EVIDENCE_FACTORS = RULES_DATA.get('evidence_factors', {
    "Observed": 1.0,
    "Inferred": 0.65,
    "Not Verified": 0.0,
})

CLAIM_RELATION_RISK = RULES_DATA.get('claim_relation_risk', {
    "relevant": 0,
    "context": 50,
    "unusual": 80,
    "unrelated": 100,
})

PERMISSION_SENSITIVITY = RULES_DATA.get('permission_sensitivity', {})
DEFAULT_PERMISSION_SENSITIVITY = RULES_DATA.get('default_permission_sensitivity', 50)
PERMISSION_CLAIM_KEYWORDS = RULES_DATA.get('permission_claim_keywords', {})
CATEGORY_CONTEXT_PERMISSIONS = RULES_DATA.get('category_context_permissions', {})

# 4 Risk Bands matching frozen frontend
RISK_BANDS = [
    (0, 20, "Low Concern"),
    (21, 45, "Moderate Concern"),
    (46, 70, "Elevated Concern"),
    (71, 100, "High Concern (Requires Review)"),
]

SCORE_BANDS_PAYLOAD = [
    {
        "min": 0,
        "max": 20,
        "label": "Low Concern",
        "color": "#10b981",
        "description": "Permissions closely match stated claims and category baselines.",
    },
    {
        "min": 21,
        "max": 45,
        "label": "Moderate Concern",
        "color": "#3b82f6",
        "description": "Some optional permissions declared beyond standard baseline.",
    },
    {
        "min": 46,
        "max": 70,
        "label": "Elevated Concern",
        "color": "#f59e0b",
        "description": "Sensitive declarations deviate noticeably from peer apps.",
    },
    {
        "min": 71,
        "max": 100,
        "label": "High Concern (Requires Review)",
        "color": "#f97316",
        "description": "Marked divergence between declared permissions and declared claims.",
    },
]

# Exact stage sequence matching frontend progress UI
STAGES = [
    "Uploading",
    "Reading manifest",
    "Comparing claim with permissions",
    "Benchmarking against similar apps",
    "Calculating risk score",
    "Complete",
]

# Frontend Category Map to Slugs
CATEGORY_SLUGS = {
    "Auto-detect from claim": "auto",
    "Notes": "note-taking",
    "Messaging": "messaging",
    "Camera & Photography": "photography",
    "Social": "social",
    "Finance & Banking": "finance",
    "Games": "games",
    "Utilities & Tools": "utilities",
    "Navigation & Maps": "navigation",
    "Productivity": "productivity",
    "Health & Fitness": "health-and-fitness",
    "Education": "education",
    "Shopping": "shopping",
    "Entertainment": "entertainment",
    # Allow slugs directly as fallback
    "note-taking": "note-taking",
    "photography": "photography",
    "finance": "finance",
    "utilities": "utilities",
}

SLUG_TO_LABEL = {
    "note-taking": "Notes",
    "messaging": "Messaging",
    "photography": "Camera & Photography",
    "social": "Social",
    "finance": "Finance & Banking",
    "games": "Games",
    "utilities": "Utilities & Tools",
    "navigation": "Navigation & Maps",
    "productivity": "Productivity",
    "health-and-fitness": "Health & Fitness",
    "education": "Education",
    "shopping": "Shopping",
    "entertainment": "Entertainment",
    "food-delivery": "Utilities & Tools",
}

# Auto-detect category keywords from user claim
AUTO_DETECT_KEYWORDS = [
    ("Notes", ["note", "markdown", "memo", "journal", "diary", "notepad", "draft"]),
    ("Messaging", ["message", "chat", "messenger", "sms", "instant messaging", "conversation", "texting"]),
    ("Camera & Photography", ["camera", "photo", "picture", "selfie", "filter", "editing image", "gallery", "photography"]),
    ("Social", ["social", "network", "friend", "profile", "post", "feed", "community", "follower"]),
    ("Finance & Banking", ["finance", "bank", "wallet", "money", "budget", "payment", "investment", "crypto", "expense", "loan"]),
    ("Games", ["game", "play", "arcade", "puzzle", "rpg", "multiplayer", "gamer", "quest"]),
    ("Navigation & Maps", ["navigate", "map", "gps", "directions", "route", "traffic", "transit", "compass"]),
    ("Health & Fitness", ["fitness", "health", "workout", "exercise", "running", "step counter", "heart rate", "calorie", "gym"]),
    ("Education", ["learn", "study", "teach", "course", "quiz", "flashcard", "student", "tutor", "school"]),
    ("Shopping", ["shop", "store", "buy", "cart", "price", "ecommerce", "order", "retail", "deals"]),
    ("Entertainment", ["movie", "music", "video", "stream", "podcast", "player", "cinema", "radio", "audio"]),
    ("Productivity", ["task", "todo", "to-do", "calendar", "organize", "productivity", "schedule", "planner", "project"]),
]

READABLE_NAMES = {
    "android.permission.INTERNET": "Network & Internet Access",
    "android.permission.POST_NOTIFICATIONS": "Post System Notifications",
    "android.permission.READ_MEDIA_IMAGES": "Photo & Media Storage",
    "android.permission.READ_MEDIA_VIDEO": "Read Video Storage",
    "android.permission.READ_EXTERNAL_STORAGE": "Read Shared Storage",
    "android.permission.WRITE_EXTERNAL_STORAGE": "Write Shared Storage",
    "android.permission.ACCESS_FINE_LOCATION": "Precise GPS Location",
    "android.permission.ACCESS_COARSE_LOCATION": "Approximate Network Location",
    "android.permission.RECORD_AUDIO": "Microphone & Audio Recording",
    "android.permission.CAMERA": "Camera Access",
    "android.permission.READ_CONTACTS": "Read Contacts Book",
    "android.permission.WRITE_CONTACTS": "Modify Contacts Book",
    "android.permission.READ_SMS": "Read Incoming SMS Messages",
    "android.permission.SEND_SMS": "Send SMS Messages",
    "android.permission.RECEIVE_SMS": "Receive SMS Messages",
    "android.permission.READ_PHONE_STATE": "Read Phone State & Identity",
    "android.permission.CALL_PHONE": "Initiate Telephone Calls",
    "android.permission.READ_CALL_LOG": "Read Call Logs",
    "android.permission.WRITE_CALL_LOG": "Write Call Logs",
    "android.permission.RECEIVE_BOOT_COMPLETED": "Start on Boot",
    "android.permission.WAKE_LOCK": "Prevent Device from Sleeping",
    "android.permission.BLUETOOTH_CONNECT": "Connect to Bluetooth Devices",
    "android.permission.BLUETOOTH_SCAN": "Scan for Bluetooth Devices",
    "android.permission.ACCESS_NETWORK_STATE": "View Network Connections",
    "android.permission.ACCESS_WIFI_STATE": "View Wi-Fi State",
    "android.permission.CHANGE_WIFI_STATE": "Change Wi-Fi State",
    "android.permission.BODY_SENSORS": "Biometric Body Sensors",
    "android.permission.USE_BIOMETRIC": "Biometric Authentication",
    "android.permission.USE_FINGERPRINT": "Fingerprint Authentication",
    "android.permission.VIBRATE": "Control Vibration",
    "android.permission.SYSTEM_ALERT_WINDOW": "Display Over Other Apps",
    "android.permission.REQUEST_INSTALL_PACKAGES": "Install Unknown Apps",
    "android.permission.ACCESS_BACKGROUND_LOCATION": "Background Location Access",
    "android.permission.ACTIVITY_RECOGNITION": "Physical Activity Recognition",
}

PURPOSES = {
    "android.permission.INTERNET": "Allows app to establish network connections and transfer data over the internet.",
    "android.permission.POST_NOTIFICATIONS": "Displays alerts, reminder banners, and status badges in system tray.",
    "android.permission.READ_MEDIA_IMAGES": "Accesses saved photo files and images from user device gallery.",
    "android.permission.READ_MEDIA_VIDEO": "Accesses video files stored on device gallery.",
    "android.permission.READ_EXTERNAL_STORAGE": "Accesses documents and files stored across shared device storage.",
    "android.permission.WRITE_EXTERNAL_STORAGE": "Saves documents, exported files, or media to shared storage.",
    "android.permission.ACCESS_FINE_LOCATION": "Accesses high-accuracy satellite and cell-tower geographic coordinates within meters.",
    "android.permission.ACCESS_COARSE_LOCATION": "Accesses approximate location derived from network cell towers and Wi-Fi.",
    "android.permission.RECORD_AUDIO": "Captures audio streams from device microphone at runtime.",
    "android.permission.CAMERA": "Captures still photographs and records video feeds from camera sensors.",
    "android.permission.READ_CONTACTS": "Reads personal contact records and address book entries on device.",
    "android.permission.WRITE_CONTACTS": "Modifies or creates contact entries in the device address book.",
    "android.permission.READ_SMS": "Reads text messages and verification codes received via SMS.",
    "android.permission.SEND_SMS": "Sends SMS text messages directly from the device.",
    "android.permission.RECEIVE_SMS": "Monitors incoming SMS messages such as transactional verification codes.",
    "android.permission.READ_PHONE_STATE": "Reads device cellular network status, SIM state, and ongoing phone calls.",
    "android.permission.CALL_PHONE": "Initiates telephone calls directly without dialer confirmation.",
    "android.permission.READ_CALL_LOG": "Accesses history of incoming, outgoing, and missed phone calls.",
    "android.permission.WRITE_CALL_LOG": "Modifies history of phone calls and communication logs.",
    "android.permission.RECEIVE_BOOT_COMPLETED": "Allows app to launch background tasks immediately when device powers on.",
    "android.permission.WAKE_LOCK": "Prevents CPU from sleeping during background tasks or media playback.",
    "android.permission.BLUETOOTH_CONNECT": "Communicates with paired Bluetooth devices and accessories.",
    "android.permission.BLUETOOTH_SCAN": "Discovers nearby Bluetooth peripherals and beacons.",
    "android.permission.ACCESS_NETWORK_STATE": "Monitors whether device is connected to Wi-Fi or cellular data.",
    "android.permission.ACCESS_WIFI_STATE": "Reads Wi-Fi connectivity parameters and access point identifiers.",
    "android.permission.CHANGE_WIFI_STATE": "Connects or disconnects Wi-Fi network connections programmatically.",
    "android.permission.BODY_SENSORS": "Reads real-time biometric telemetry like heart rate and body sensors.",
    "android.permission.USE_BIOMETRIC": "Authenticates user identity using fingerprint scanner or biometric face unlock.",
    "android.permission.USE_FINGERPRINT": "Authenticates user identity using hardware fingerprint sensor.",
    "android.permission.VIBRATE": "Controls haptic vibration feedback on the device.",
    "android.permission.SYSTEM_ALERT_WINDOW": "Draws floating UI overlay windows on top of other running applications.",
    "android.permission.REQUEST_INSTALL_PACKAGES": "Prompts user to install secondary package files from storage.",
    "android.permission.ACCESS_BACKGROUND_LOCATION": "Monitors physical device location continuously while the app is closed.",
    "android.permission.ACTIVITY_RECOGNITION": "Detects physical movement such as walking, running, or driving.",
}

def get_permission_name(perm: str) -> str:
    if perm in READABLE_NAMES:
        return READABLE_NAMES[perm]
    suffix = perm.split(".")[-1]
    words = [w.capitalize() for w in suffix.split("_")]
    return " ".join(words) + " Access"

def get_permission_purpose(perm: str) -> str:
    if perm in PURPOSES:
        return PURPOSES[perm]
    name = get_permission_name(perm)
    return f"Allows the application to access {name.lower()} capabilities."

# CORS origins
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

def band_for(score: float) -> str:
    s = round(score)
    for low, high, label in RISK_BANDS:
        if low <= s <= high:
            return label
    return "High Concern (Requires Review)" if s > 100 else "Low Concern"
