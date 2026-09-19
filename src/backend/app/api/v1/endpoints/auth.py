"""Authentication endpoints for SentinelAI production single-administrator core."""

import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field

from app.core.config import settings
from app.core.rate_limiter import login_rate_limiter
from app.core.security import create_access_token, get_current_admin, verify_admin_credentials

logger = logging.getLogger("sentinelai.auth_endpoints")

router = APIRouter()


class LoginRequest(BaseModel):
    """Payload submitted by user to authenticate."""
    email: str = Field(..., description="Administrator official email address")
    password: str = Field(..., description="Administrator security password")


class AuthResponse(BaseModel):
    """Safe response payload returned to client."""
    success: bool
    authenticated: bool
    token: str = None
    user: Dict[str, Any] = None
    message: str = None


def get_client_ip(request: Request) -> str:
    """Extract client IP address, prioritizing X-Forwarded-For if behind a proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Administrator Login",
    description="Authenticates the single administrator against server-side secrets and establishes a secure session."
)
def login(payload: LoginRequest, request: Request, response: Response):
    """Process administrator sign-in request with brute-force rate limiting."""
    client_ip = get_client_ip(request)

    # 1. Validate rate limits
    is_limited, remaining = login_rate_limiter.is_rate_limited(client_ip)
    if is_limited:
        logger.warning("Brute-force lockout triggered for IP %s (%s s remaining)", client_ip, remaining)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please try again in {remaining} seconds."
        )

    # 2. Validate empty credentials
    clean_email = payload.email.strip()
    clean_password = payload.password.strip()
    if not clean_email or not clean_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password cannot be empty."
        )

    # 3. Verify administrator credentials
    if not verify_admin_credentials(clean_email, clean_password):
        is_locked_now, lock_secs = login_rate_limiter.record_failure(client_ip)
        logger.warning("Failed login attempt from IP %s", client_ip)
        if is_locked_now:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts. Temporary lockout activated for {lock_secs} seconds."
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # 4. Successful login: reset rate limit counters
    login_rate_limiter.reset(client_ip)
    logger.info("Administrator logged in successfully from IP %s", client_ip)

    # 5. Issue JWT session token
    token = create_access_token(subject=settings.ADMIN_EMAIL)

    # 6. Set secure HTTP-only cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.SESSION_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/"
    )

    return AuthResponse(
        success=True,
        authenticated=True,
        token=token,
        user={
            "name": "Administrator",
            "email": settings.ADMIN_EMAIL,
            "role": "admin",
            "clearance": "TOP SECRET / SCI"
        },
        message="Authentication successful."
    )


@router.post(
    "/logout",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Administrator Logout",
    description="Invalidates current session and clears the secure session cookie."
)
def logout(response: Response):
    """Log out administrator and clear cookies."""
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/"
    )
    return AuthResponse(
        success=True,
        authenticated=False,
        message="Session invalidated successfully."
    )


@router.get(
    "/session",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate Session",
    description="Verifies whether current request carries an active administrator session."
)
def check_session(admin: Dict[str, Any] = Depends(get_current_admin)):
    """Return verified admin session information."""
    return AuthResponse(
        success=True,
        authenticated=True,
        user=admin,
        message="Session is valid."
    )
