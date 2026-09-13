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

    # PostgreSQL Database Configuration
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "SentinelAI"
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = "aayush9106"
    
    # Optional direct DATABASE_URL override
    DATABASE_URL: Optional[str] = None

    # CORS configuration
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,*"
    FRONTEND_URL: str = "http://localhost:5173"

    # Security & JWT Configuration
    JWT_SECRET_KEY: str = "sentinelai_super_secret_jwt_key_phase1_foundation_change_in_prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    @computed_field
    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}"
            f"@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        )

    def get_cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
