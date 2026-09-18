import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.stdout.reconfigure(encoding='utf-8')

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_multiturn_dialogue():
    print("=" * 65)
    print("TESTING MULTI-TURN CONVERSATION UNDERSTANDING")
    print("=" * 65)

    passed = 0
    total = 0

    # CASE 1: Plural pronoun follow-up ("Why are they degraded?")
    total += 1
    t1_res = client.post("/api/chat", json={"message": "Show degraded assets"})
    t1 = t1_res.json()
    hist = [
        {"role": "user", "content": "Show degraded assets"},
        {"role": "assistant", "content": t1.get("message", "")}
    ]
    t2_res = client.post("/api/chat", json={"message": "Why are they degraded?", "history": hist})
    t2 = t2_res.json()
    c1_ok = t2.get("intent") == "DEGRADED_ASSETS_CAUSES" and "Root Cause" in t2.get("message", "")
    print(f"Case 1 (Plural 'they' -> Causes): intent={t2.get('intent')} ok={c1_ok}")
    if c1_ok: passed += 1

    # CASE 2: Conversational elaboration ("What does that mean?")
    total += 1
    t3_res = client.post("/api/chat", json={"message": "Tell me about A012"})
    t3 = t3_res.json()
    hist2 = [
        {"role": "user", "content": "Tell me about A012"},
        {"role": "assistant", "content": t3.get("message", "")}
    ]
    t4_res = client.post("/api/chat", json={"message": "What does that mean?", "history": hist2})
    t4 = t4_res.json()
    c2_ok = t4.get("intent") == "CONVERSATIONAL_FOLLOWUP" and "A012" in t4.get("message", "")
    print(f"Case 2 (Elaboration 'What does that mean?'): intent={t4.get('intent')} ok={c2_ok}")
    if c2_ok: passed += 1

    # CASE 3: Ordinal resolution ("Tell me about the first one")
    total += 1
    t5_res = client.post("/api/chat", json={"message": "Show bad assets"})
    t5 = t5_res.json()
    hist3 = [
        {"role": "user", "content": "Show bad assets"},
        {"role": "assistant", "content": t5.get("message", "")}
    ]
    t6_res = client.post("/api/chat", json={"message": "Tell me about the first one", "history": hist3})
    t6 = t6_res.json()
    c3_ok = t6.get("intent") == "ASSET_OVERVIEW" and len(t6.get("message", "")) > 50
    print(f"Case 3 (Ordinal 'the first one'): intent={t6.get('intent')} ok={c3_ok}")
    if c3_ok: passed += 1

    # CASE 4: Follow-up keyword ("Sensors")
    total += 1
    t7_res = client.post("/api/chat", json={"message": "Status of A035"})
    t7 = t7_res.json()
    hist4 = [
        {"role": "user", "content": "Status of A035"},
        {"role": "assistant", "content": t7.get("message", "")}
    ]
    t8_res = client.post("/api/chat", json={"message": "Sensors", "history": hist4})
    t8 = t8_res.json()
    c4_ok = t8.get("intent") == "ASSET_SENSORS" and "A035" in t8.get("message", "")
    print(f"Case 4 (Keyword follow-up 'Sensors'): intent={t8.get('intent')} ok={c4_ok}")
    if c4_ok: passed += 1

    # CASE 5: Single-word follow-up ("Why?")
    total += 1
    t9_res = client.post("/api/chat", json={"message": "A021"})
    t9 = t9_res.json()
    hist5 = [
        {"role": "user", "content": "A021"},
        {"role": "assistant", "content": t9.get("message", "")}
    ]
    t10_res = client.post("/api/chat", json={"message": "Why?", "history": hist5})
    t10 = t10_res.json()
    c5_ok = t10.get("intent") in ("ASSET_FAILURE_PROBABILITY", "ASSET_RISK", "DEGRADED_ASSETS_CAUSES", "TROUBLESHOOT_ASSET") and "A021" in t10.get("message", "")
    print(f"Case 5 (Single-word 'Why?'): intent={t10.get('intent')} ok={c5_ok}")
    if c5_ok: passed += 1

    print("=" * 65)
    print(f"MULTI-TURN TEST RESULT: {passed}/{total} Passed")
    print("=" * 65)
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(test_multiturn_dialogue())
