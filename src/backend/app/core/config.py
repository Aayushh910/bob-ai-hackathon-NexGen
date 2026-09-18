from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "SentinelAI"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # API Prefix
    API_V1_STR: str = "/api/v1"

    # Port Configuration (Render dynamically assigns $PORT)
    PORT: int = 8000

    # PostgreSQL / Neon Database Configuration
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "SentinelAI"
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = "aayush9106"
    
    # Optional direct DATABASE_URL override (e.g. Neon, Render, Supabase)
    DATABASE_URL: Optional[str] = None

    # CORS configuration (whitelisting both local and deployed environments)
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:5173,http://localhost:8000,"
        "http://127.0.0.1:5173,http://127.0.0.1:8000,"
        "https://sentinel-ai-ibm-bob.vercel.app,https://sentinel-ai-ibm-bob.vercel.app/,"
        "https://bob-ai-hackathon-nexgen.onrender.com"
    )
    CORS_ORIGIN_REGEX: str = r"https://.*\.(vercel\.app|onrender\.com|netlify\.app|pages\.dev)"
    FRONTEND_URL: Optional[str] = "https://sentinel-ai-ibm-bob.vercel.app"

    # Security & JWT Configuration
    JWT_SECRET_KEY: str = "sentinelai_super_secret_jwt_key_phase1_foundation_change_in_prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # IBM Bob API Configuration (Server-Side Only)
    IBM_BOB_API_KEY: Optional[str] = None
    IBM_BOB_API_URL: str = "https://api.us-east.bob.ibm.com/inference/v1/chat/completions"
    IBM_BOB_MODEL: str = "ibm/granite-3-8b-instruct"
    IBM_BOB_TIMEOUT_SECONDS: int = 5

    @computed_field
    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL.strip()
            # Normalize postgres:// to postgresql:// for SQLAlchemy 2.0
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            return url
        return (
            f"postgresql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}"
            f"@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        )

    def get_cors_origins(self) -> List[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if self.FRONTEND_URL:
            trimmed = self.FRONTEND_URL.strip().rstrip("/")
            if trimmed not in origins:
                origins.append(trimmed)
            if f"{trimmed}/" not in origins:
                origins.append(f"{trimmed}/")
        return origins

settings = Settings()
