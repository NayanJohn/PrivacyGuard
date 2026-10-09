"""Run: python -m pytest test_engine.py  (from the package's parent folder, adjust imports)
Uses synthetic fixtures only; the shipped app uses real extracted features."""
from app import smart_brain as sb, ml_model as ml, combine as cb


P = "android.permission."
def perms(*n): return [P + x for x in n]

def run(f, mobsf=None):
    return cb.combine_scores(ml.calculate_ml_risk(f), sb.analyze(f), mobsf)

def test_flashlight_with_sms_is_high_or_critical():
    f = dict(app_label="Super Flashlight", declared_permissions=perms("CAMERA", "READ_SMS", "READ_CONTACTS", "INTERNET"),
             libraries=["com.google.android.gms.ads.AdView"], used_permissions=perms("CAMERA", "READ_SMS"))
    assert run(f)["severity"] in ("high", "critical")

def test_messenger_with_same_style_permissions_is_not_high():
    f = dict(category="COMMUNICATION", declared_permissions=perms("CAMERA", "RECORD_AUDIO", "READ_CONTACTS", "INTERNET"))
    assert run(f)["severity"] in ("low", "medium")

def test_scores_are_not_all_100():
    scores = {run(dict(category=c, declared_permissions=perms(*p)))["score"]
              for c, p in [("TOOLS", ["INTERNET"]), ("MAPS_AND_NAVIGATION", ["ACCESS_FINE_LOCATION"]),
                           ("TOOLS", ["READ_SMS", "INTERNET", "READ_CONTACTS"])]}
    assert len(scores) == 3 and max(scores) < 100

def test_missing_mobsf_renormalizes_and_still_scores():
    r = run(dict(category="TOOLS", declared_permissions=perms("CAMERA")))
    assert r["breakdown"]["static"]["weight"] == 0 and abs(r["breakdown"]["ml"]["weight"] + r["breakdown"]["heuristic"]["weight"] - 1) < 0.01
