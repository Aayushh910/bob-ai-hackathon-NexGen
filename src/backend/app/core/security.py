"""Security & Authentication utilities for SentinelAI single-administrator core."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import bcrypt
import hmac
import jwt
from fastapi import HTTPException, Request, status
from app.core.config import settings

logger = logging.getLogger("sentinelai.security")

# Constant dummy hash for constant-time mitigation when email does not match
DUMMY_BCRYPT_HASH = "$2b$12$A0XvgK4RCBVt.FxxPWoSxenOJ2GbEGAwOtJ7pc1pII0AODD4d84KW"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its bcrypt hashed version."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception as exc:
        logger.warning("Bcrypt verification failed with error: %s", exc)
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=12)
    ).decode("utf-8")


def verify_admin_credentials(email: str, password: str) -> bool:
    """
    Strict server-side validation against the single administrator account.
    Returns True if and only if email and password match the server secret.
    """
    if not email or not password:
        return False

    admin_email = (settings.ADMIN_EMAIL or "").strip().lower()
    entered_email = email.strip().lower()

    if entered_email != admin_email:
        # Run dummy check to mitigate timing side-channel attacks
        verify_password("dummy_password_timing_check", DUMMY_BCRYPT_HASH)
        return False

    # 1. Verify against bcrypt hash if configured
    if settings.ADMIN_PASSWORD_HASH:
        return verify_password(password, settings.ADMIN_PASSWORD_HASH)

    # 2. Fallback against server-side secret if configured
    if settings.ADMIN_PASSWORD:
        return hmac.compare_digest(password, settings.ADMIN_PASSWORD)

    logger.error("No ADMIN_PASSWORD_HASH or ADMIN_PASSWORD configured on server.")
    return False


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None
) -> str:
    """Create a signed JWT access token for admin sessions."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.SESSION_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "iss": settings.APP_NAME,
        "role": "admin"
    }
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"}
        )


def get_current_admin(request: Request) -> Dict[str, Any]:
    """
    FastAPI dependency to protect backend endpoints.
    Verifies authentication from either:
    1. HTTP-Only Cookie (sentinel_session)
    2. Authorization Header (Bearer <token>)
    """
    token: Optional[str] = None

    # 1. Check Authorization Bearer header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()

    # 2. Check HTTP-only cookie if header not provided
    if not token:
        cookie_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
        if cookie_token:
            token = cookie_token.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(token)
    subject = payload.get("sub")
    admin_email = (settings.ADMIN_EMAIL or "").strip().lower()

    if not subject or subject.strip().lower() != admin_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized administrator credentials.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return {
        "email": admin_email,
        "role": "admin",
        "name": "Administrator",
        "clearance": "TOP SECRET / SCI"
    }
