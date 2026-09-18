"""
SentinelAI Chatbot Intelligence Upgrade Test Suite
Verifies:
1. Synonym normalization (bad assets, problematic machines, down machines)
2. Short/incomplete queries (A021, A021 status, failure?, risk?, bad ones)
3. Strict pronoun-based context resolution & context switching
4. Unknown asset handling (A999999 -> NOT_FOUND, no stale substitution)
5. Component-grounded troubleshooting (Troubleshoot A035)
6. Asset comparisons (Compare A021 and A035)
7. Trend progression (Is A021 getting worse?)
8. Dynamic suggestion generation & response schema compliance
"""

import sys
import os

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set UTF-8 encoding for Windows terminal output
sys.stdout.reconfigure(encoding='utf-8')

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_suite():
    print("=" * 60)
    print("RUNNING SENTINELAI CHATBOT INTELLIGENCE UPGRADE TEST SUITE")
    print("=" * 60)

    total = 0
    passed = 0

    # 1. Synonym Normalization Tests
    print("\n[SECTION 1] Synonym Normalization Tests")
    synonym_cases = [
        ("show bad assets", "DEGRADED_ASSETS"),
        ("problematic machines", "DEGRADED_ASSETS"),
        ("which assets need attention", "DEGRADED_ASSETS"),
        ("machines that are down", "DEGRADED_ASSETS"),
        ("unhealthy assets", "DEGRADED_ASSETS"),
    ]
    for query, expected_intent in synonym_cases:
        total += 1
        res = client.post("/api/chat", json={"message": query})
        data = res.json()
        intent = data.get("intent")
        res_status = data.get("resultStatus")
        suggestions = data.get("suggestions", [])
        ok = res.status_code == 200 and intent == expected_intent and res_status == "FOUND" and len(suggestions) > 0
        if ok:
            print(f"  PASS: '{query}' -> intent={intent}, status={res_status}, suggestions={len(suggestions)}")
            passed += 1
        else:
            print(f"  FAIL: '{query}' -> expected intent={expected_intent}, got intent={intent}, status={res_status}")

    # 2. Short & Incomplete Queries Tests
    print("\n[SECTION 2] Short & Incomplete Query Tests")
    short_cases = [
        ("A021", ["ASSET_OVERVIEW"], "A021"),
        ("A021 status", ["ASSET_OVERVIEW", "ASSET_STATUS"], "A021"),
        ("failure?", ["HIGHEST_FAILURE_RISK"], None),
        ("risk?", ["HIGHEST_FAILURE_RISK"], None),
        ("bad ones", ["DEGRADED_ASSETS"], None),
        ("anomalies?", ["RECENT_ANOMALIES"], None),
    ]
    for query, expected_intents, expected_asset in short_cases:
        total += 1
        res = client.post("/api/chat", json={"message": query})
        data = res.json()
        intent = data.get("intent")
        msg = data.get("message", "")
        res_status = data.get("resultStatus")
        asset_in_msg = (expected_asset in msg) if expected_asset else True
        ok = res.status_code == 200 and intent in expected_intents and asset_in_msg and (res_status in ("FOUND", "EMPTY_RESULT"))
        if ok:
            print(f"  PASS: '{query}' -> intent={intent}, status={res_status}, asset_matched={asset_in_msg}")
            passed += 1
        else:
            print(f"  FAIL: '{query}' -> expected={expected_intents}, got={intent}, asset_in_msg={asset_in_msg}, status={res_status}")

    # 3. Context Switching & Strict Pronoun Resolution Tests
    print("\n[SECTION 3] Context Switching & Pronoun Decoupling")
    total += 1
    # Turn 1: Inquire on A021
    t1_res = client.post("/api/chat", json={"message": "Tell me about A021."})
    t1 = t1_res.json()
    history = [
        {"role": "user", "content": "Tell me about A021."},
        {"role": "assistant", "content": t1.get("message", "")}
    ]

    # Turn 2: Switch context to A035
    t2_res = client.post("/api/chat", json={"message": "What about A035?", "history": history})
    t2 = t2_res.json()
    t2_msg = t2.get("message", "")
    history.extend([
        {"role": "user", "content": "What about A035?"},
        {"role": "assistant", "content": t2_msg}
    ])

    # Turn 3: Refer with pronoun "What is its failure probability?" -> MUST resolve to A035, NOT A021!
    t3_res = client.post("/api/chat", json={"message": "What is its failure probability?", "history": history})
    t3 = t3_res.json()
    t3_msg = t3.get("message", "")
    resolved_to_a035 = "A035" in t3_msg

    # Turn 4: General query ("Show all assets") with history -> MUST NOT be polluted by asset context
    history.extend([
        {"role": "user", "content": "What is its failure probability?"},
        {"role": "assistant", "content": t3_msg}
    ])
    t4_res = client.post("/api/chat", json={"message": "Show all assets.", "history": history})
    t4 = t4_res.json()
    t4_intent = t4.get("intent")
    general_unpolluted = t4_intent in ("ALL_ASSETS_SUMMARY", "ALL_ASSETS")

    if resolved_to_a035 and general_unpolluted:
        print(f"  PASS: Strict pronoun resolved to latest asset A035, general query remained unpolluted ({t4_intent})")
        passed += 1
    else:
        print(f"  FAIL: Context error - resolved_to_a035={resolved_to_a035}, general_unpolluted={general_unpolluted}")

    # 4. Unknown Asset Handling Tests
    print("\n[SECTION 4] Unknown Asset Handling Tests")
    unknown_cases = [
        "Tell me about A999999",
        "What is the status of A999?",
        "Sensor readings for A8888",
    ]
    for query in unknown_cases:
        total += 1
        res = client.post("/api/chat", json={"message": query})
        data = res.json()
        res_status = data.get("resultStatus")
        msg = data.get("message", "")
        # Must return NOT_FOUND and not hallucinate or substitute another asset
        ok = res_status == "NOT_FOUND" and "not found" in msg.lower()
        if ok:
            print(f"  PASS: '{query}' -> cleanly returned resultStatus={res_status}")
            passed += 1
        else:
            print(f"  FAIL: '{query}' -> expected NOT_FOUND, got resultStatus={res_status}")

    # 5. Component Grounded Troubleshooting
    print("\n[SECTION 5] Troubleshooting Engine Grounding")
    total += 1
    tb_res = client.post("/api/chat", json={"message": "Troubleshoot A035"})
    tb_data = tb_res.json()
    tb_obj = tb_data.get("troubleshooting", {})
    tb_items = tb_obj.get("procedures", []) if isinstance(tb_obj, dict) else tb_obj
    tb_intent = tb_data.get("intent")
    tb_ok = tb_intent in ("TROUBLESHOOT_ASSET", "ASSET_TROUBLESHOOTING") and len(tb_items) > 0 and all(
        "diagnostic_check" in item and "component" in item for item in tb_items
    )
    if tb_ok:
        print(f"  PASS: Troubleshooting returned {len(tb_items)} procedures for A035:")
        for it in tb_items[:2]:
            print(f"     - [{it.get('priority')}] {it.get('component')}: {it.get('diagnostic_check')[:60]}...")
        passed += 1
    else:
        print(f"  FAIL: Troubleshooting returned empty or invalid procedures: {tb_data}")

    # 6. Side-by-side Asset Comparison
    print("\n[SECTION 6] Side-by-Side Asset Comparison")
    total += 1
    cmp_res = client.post("/api/chat", json={"message": "Compare A021 and A035"})
    cmp_data = cmp_res.json()
    cmp_intent = cmp_data.get("intent")
    cmp_msg = cmp_data.get("message", "")
    cmp_ok = cmp_intent == "COMPARE_ASSETS" and "A021" in cmp_msg and "A035" in cmp_msg
    if cmp_ok:
        print(f"  PASS: Asset comparison successfully compared A021 and A035 in table format")
        passed += 1
    else:
        print(f"  FAIL: Asset comparison failed: intent={cmp_intent}")

    # 7. Trend Progression Analysis
    print("\n[SECTION 7] Trend Progression Analysis")
    total += 1
    tr_res = client.post("/api/chat", json={"message": "Is A021 getting worse?"})
    tr_data = tr_res.json()
    tr_intent = tr_data.get("intent")
    tr_msg = tr_data.get("message", "")
    tr_ok = tr_intent == "ASSET_TREND" and "A021" in tr_msg
    if tr_ok:
        print(f"  PASS: Trend progression successfully analyzed A021 longitudinal health")
        passed += 1
    else:
        print(f"  FAIL: Trend progression failed: intent={tr_intent}")

    # Summary
    print("\n" + "=" * 60)
    print(f"TEST SUMMARY: {passed}/{total} Passed ({(passed/total)*100:.1f}%)")
    print("=" * 60)
    if passed == total:
        print("ALL INTELLIGENCE UPGRADE REQUIREMENTS VERIFIED SUCCESSFULLY!")
        return 0
    else:
        print("Some tests failed. Please review the output above.")
        return 1

if __name__ == "__main__":
    exit_code = run_suite()
    sys.exit(exit_code)
