"""Test suite verifying all SentinelAI Chatbot requirements and test cases."""

import sys
import os

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set UTF-8 encoding for Windows terminal output
sys.stdout.reconfigure(encoding='utf-8')

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

TEST_CASES = [
    # Database queries
    ("Show all assets.", "data"),
    ("Which assets are degraded?", "data"),
    ("Which asset has the highest failure probability?", "data"),
    ("What is the failure probability of A021?", "data"),
    ("Show assets with failure probability above 70%.", "data"),
    ("How many ready assets are there?", "data"),
    ("Show recent anomalies.", "data"),
    ("Show critical alerts.", "data"),
    ("What is the latest sensor data for A021?", "data"),
    ("When was A021 last maintained?", "data"),

    # Knowledge queries
    ("What is SentinelAI?", "knowledge"),
    ("How does failure prediction work?", "knowledge"),
    ("What does anomaly detection mean?", "knowledge"),
    ("Explain failure probability.", "knowledge"),

    # Navigation queries
    ("Where can I see all assets?", "navigation"),
    ("Where can I see predictions?", "navigation"),
    ("Where are anomalies?", "navigation"),
    ("Where can I download reports?", "navigation"),

    # Missing data
    ("Tell me about A999", "data"),

    # Mixed query
    ("Which assets are degraded and where can I see them?", "mixed"),

    # Unrelated queries
    ("What is the capital of France?", "general"),
    ("Tell me a joke.", "general"),
    ("Write a Python game.", "general"),
]


def run_all_tests():
    print("==================================================")
    print("🚀 RUNNING SENTINELAI CHATBOT TEST SUITE")
    print("==================================================")
    passed = 0
    failed = 0

    for query, expected_type in TEST_CASES:
        res = client.post("/api/chat", json={"message": query})
        if res.status_code == 200:
            data = res.json()
            actual_type = data.get("responseType")
            success = data.get("success")
            msg = data.get("message", "")

            # Check if expected type matches or is acceptable
            type_ok = (actual_type == expected_type) or (expected_type == "data" and actual_type in ("data", "mixed"))
            # For A999, verify it states not found
            if "A999" in query:
                type_ok = type_ok and ("not found" in msg.lower() or "couldn't find" in msg.lower())

            if type_ok and success:
                print(f"✅ PASS: [{actual_type}] '{query}'")
                passed += 1
            else:
                print(f"❌ FAIL: '{query}' - Expected {expected_type}, got {actual_type}, success={success}")
                failed += 1
        else:
            print(f"❌ HTTP FAIL {res.status_code}: '{query}'")
            failed += 1

    # Follow-up test sequence
    print("\n--- Testing Conversational Context & Follow-Ups ---")
    turn1_res = client.post("/api/chat", json={"message": "Tell me about A021."})
    turn1 = turn1_res.json()
    print("Turn 1:", "A021" in turn1.get("message", ""))

    history = [
        {"role": "user", "content": "Tell me about A021."},
        {"role": "assistant", "content": turn1.get("message", "")}
    ]

    turn2_res = client.post("/api/chat", json={
        "message": "What is its failure probability?",
        "history": history
    })
    turn2 = turn2_res.json()
    turn2_msg = turn2.get("message", "")
    print("Turn 2 (resolved 'its' -> A021):", "A021" in turn2_msg, turn2.get("responseType"))

    history.append({"role": "user", "content": "What is its failure probability?"})
    history.append({"role": "assistant", "content": turn2_msg})

    turn3_res = client.post("/api/chat", json={
        "message": "Is that asset degraded?",
        "history": history
    })
    turn3 = turn3_res.json()
    turn3_msg = turn3.get("message", "")
    print("Turn 3 (resolved 'that asset' -> A021):", "A021" in turn3_msg, turn3.get("responseType"))

    if "A021" in turn2_msg and "A021" in turn3_msg:
        print("✅ PASS: Multi-turn Context Resolution verified")
        passed += 1
    else:
        print("❌ FAIL: Multi-turn Context Resolution failed")
        failed += 1

    # Edge cases: Empty message
    empty_res = client.post("/api/chat", json={"message": ""})
    if empty_res.status_code == 200 and not empty_res.json().get("success"):
        print("✅ PASS: Empty query handled gracefully")
        passed += 1
    else:
        print("❌ FAIL: Empty query handling failed")
        failed += 1

    # Test /api/v1/chat endpoint alias
    v1_res = client.post("/api/v1/chat", json={"message": "How many ready assets are there?"})
    if v1_res.status_code == 200 and v1_res.json().get("success"):
        print("✅ PASS: /api/v1/chat alias verified")
        passed += 1
    else:
        print("❌ FAIL: /api/v1/chat alias failed")
        failed += 1

    print("\n==================================================")
    print(f"📊 SUMMARY: {passed} PASSED, {failed} FAILED (Total {passed + failed})")
    print("==================================================")
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_all_tests()
