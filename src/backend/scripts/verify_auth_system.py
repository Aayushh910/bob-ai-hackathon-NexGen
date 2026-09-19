"""Comprehensive verification test suite for SentinelAI single-admin authentication system."""

import sys
from fastapi.testclient import TestClient
from app.main import app
from app.core.rate_limiter import login_rate_limiter

client = TestClient(app)
failed = 0
passed = 0


def check(name: str, condition: bool, extra: str = ""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {name} {extra}")
    else:
        failed += 1
        print(f"  [FAIL] {name} {extra}")


print("=" * 60)
print("SENTINELAI COMPREHENSIVE AUTHENTICATION TEST SUITE")
print("=" * 60)

# Reset limiter for clean test run
login_rate_limiter.reset("testclient")

# 1. Public Health Endpoints
print("\n1. Verifying Public Infrastructure Endpoints...")
r_root = client.get("/")
check("GET / (Root Metadata)", r_root.status_code == 200)

r_health = client.get("/health")
check("GET /health (Root Health)", r_health.status_code == 200)

r_v1_health = client.get("/api/v1/health")
check("GET /api/v1/health (API v1 Health)", r_v1_health.status_code == 200)

# 2. Strict Protection on Unauthenticated Data APIs
print("\n2. Verifying Unauthenticated Rejection (HTTP 401)...")
protected_routes = [
    ("GET", "/api/v1/assets"),
    ("GET", "/api/v1/dashboard/summary"),
    ("GET", "/api/v1/predictions/1"),
    ("GET", "/api/v1/anomalies"),
    ("GET", "/api/v1/maintenance"),
    ("GET", "/api/v1/telemetry/live"),
    ("GET", "/api/v1/components/A001-ENG"),
    ("GET", "/api/v1/readiness/status"),
    ("POST", "/api/v1/chat"),
    ("POST", "/api/chat"),
    ("GET", "/api/v1/auth/session"),
]

for method, route in protected_routes:
    if method == "GET":
        r = client.get(route)
    else:
        r = client.post(route, json={"message": "ping"})
    check(f"{method} {route} rejects unauthenticated", r.status_code == 401)

# 3. Credential Validation & Error Handling
print("\n3. Verifying Login Credential Checks & Error Messages...")
r = client.post("/api/v1/auth/login", json={"email": "", "password": ""})
check("Empty credentials return 400", r.status_code == 400)

r = client.post("/api/v1/auth/login", json={"email": "wrong@sentinelai.com", "password": "Admin@712"})
check("Wrong email returns 401", r.status_code == 401)
check("Generic error message on wrong email", r.json().get("message") == "Invalid email or password.")

r = client.post("/api/v1/auth/login", json={"email": "sentinelai712@gmail.com", "password": "WrongPassword123"})
check("Wrong password returns 401", r.status_code == 401)
check("Generic error message on wrong password", r.json().get("message") == "Invalid email or password.")

# Reset rate limiter before testing successful login
login_rate_limiter.reset("testclient")

# 4. Valid Administrator Login & Session Creation
print("\n4. Verifying Valid Administrator Authentication...")
r = client.post("/api/v1/auth/login", json={"email": "sentinelai712@gmail.com", "password": "Admin@712"})
check("Valid login returns 200", r.status_code == 200)
check("Response authenticated is True", r.json().get("authenticated") is True)
token = r.json().get("token")
check("Signed JWT token issued", bool(token and len(token) > 20))
cookie = r.cookies.get("sentinel_session")
check("HTTP-only session cookie set", bool(cookie))
user_info = r.json().get("user", {})
check("User email matches admin", user_info.get("email") == "sentinelai712@gmail.com")
check("User role is admin", user_info.get("role") == "admin")
check("Password NEVER returned in response", "password" not in str(r.json()).lower() or "admin@712" not in str(r.json()))

# 5. Accessing Protected APIs with Authenticated Session
print("\n5. Verifying Authenticated API Access...")
# 5a. Via Bearer Token
r_assets = client.get("/api/v1/assets?limit=3", headers={"Authorization": f"Bearer {token}"})
check("GET /api/v1/assets with Bearer token returns 200", r_assets.status_code == 200)

# 5b. Via HTTP-Only Cookie
r_dash = client.get("/api/v1/dashboard/summary", cookies={"sentinel_session": cookie})
check("GET /api/v1/dashboard/summary with Cookie returns 200", r_dash.status_code == 200)

# 5c. Protected Chatbot with Authenticated Session
r_chat = client.post("/api/chat", json={"message": "System status"}, headers={"Authorization": f"Bearer {token}"})
check("POST /api/chat with Bearer token returns 200", r_chat.status_code == 200)

# 5d. Session Verification Endpoint
r_session = client.get("/api/v1/auth/session", headers={"Authorization": f"Bearer {token}"})
check("GET /api/v1/auth/session returns 200", r_session.status_code == 200)
check("Session user email verified", r_session.json().get("user", {}).get("email") == "sentinelai712@gmail.com")

# 6. Logout & Invalidation
print("\n6. Verifying Logout & Session Termination...")
r_logout = client.post("/api/v1/auth/logout")
check("POST /api/v1/auth/logout returns 200", r_logout.status_code == 200)
check("Logout clears authenticated state", r_logout.json().get("authenticated") is False)

# 7. Brute-Force Rate Limiting
print("\n7. Verifying Brute-Force Rate Limiting...")
login_rate_limiter.reset("testclient")
for i in range(4):
    client.post("/api/v1/auth/login", json={"email": "sentinelai712@gmail.com", "password": f"wrong_{i}"})

r_5th = client.post("/api/v1/auth/login", json={"email": "sentinelai712@gmail.com", "password": "wrong_5"})
check("5th failed attempt triggers 429 lockout", r_5th.status_code == 429)

r_6th = client.post("/api/v1/auth/login", json={"email": "sentinelai712@gmail.com", "password": "Admin@712"})
check("Subsequent attempt during lockout rejected with 429", r_6th.status_code == 429)

login_rate_limiter.reset("testclient")

print("\n" + "=" * 60)
print(f"VERIFICATION COMPLETE: {passed} PASSED, {failed} FAILED")
print("=" * 60)

if failed > 0:
    sys.exit(1)
