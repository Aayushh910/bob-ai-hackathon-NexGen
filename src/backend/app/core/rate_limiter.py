"""Thread-safe brute-force rate limiter for SentinelAI login protection."""

import threading
import time
from typing import Dict, Tuple


class LoginRateLimiter:
    """Sliding-window failure tracker and progressive lockout manager."""

    def __init__(self, max_failures: int = 5, window_seconds: int = 300, lockout_seconds: int = 60):
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self.lockout_seconds = lockout_seconds
        self._lock = threading.Lock()
        # Structure: key -> {"failures": [timestamp, ...], "locked_until": float}
        self._history: Dict[str, Dict] = {}

    def _cleanup_old_records(self, now: float):
        """Prune records older than the window to prevent memory leaks."""
        expired_keys = []
        for key, data in self._history.items():
            data["failures"] = [t for t in data["failures"] if now - t < self.window_seconds]
            if not data["failures"] and data.get("locked_until", 0) <= now:
                expired_keys.append(key)
        for key in expired_keys:
            del self._history[key]

    def is_rate_limited(self, key: str) -> Tuple[bool, int]:
        """
        Check if the key (IP address) is currently locked out.
        Returns (is_limited, seconds_remaining).
        """
        now = time.time()
        with self._lock:
            self._cleanup_old_records(now)
            data = self._history.get(key)
            if not data:
                return False, 0

            locked_until = data.get("locked_until", 0)
            if locked_until > now:
                remaining = int(locked_until - now) + 1
                return True, remaining

            return False, 0

    def record_failure(self, key: str) -> Tuple[bool, int]:
        """
        Record a failed login attempt.
        Returns (is_now_limited, seconds_locked).
        """
        now = time.time()
        with self._lock:
            self._cleanup_old_records(now)
            if key not in self._history:
                self._history[key] = {"failures": [], "locked_until": 0}

            data = self._history[key]
            data["failures"].append(now)

            # Check if threshold reached
            if len(data["failures"]) >= self.max_failures:
                data["locked_until"] = now + self.lockout_seconds
                # Clear failures to give a fresh slate after lockout expires
                data["failures"] = []
                return True, self.lockout_seconds

            return False, 0

    def reset(self, key: str):
        """Clear all failure history upon successful login."""
        with self._lock:
            if key in self._history:
                del self._history[key]


login_rate_limiter = LoginRateLimiter(max_failures=5, window_seconds=300, lockout_seconds=60)
