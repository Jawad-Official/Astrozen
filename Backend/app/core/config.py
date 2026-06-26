from typing import List

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    # Security
    SECRET_KEY: str = Field(
        validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET")
    )
    ALGORITHM: str = Field(
        validation_alias=AliasChoices("ALGORITHM", "JWT_ALGORITHM")
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        validation_alias=AliasChoices(
            "ACCESS_TOKEN_EXPIRE_MINUTES",
            "JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
        )
    )

    # Environment
    ENVIRONMENT: str = "development"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v):
        v = v.strip()
        if v == "secret" or v == "dummy":
            raise ValueError(
                "SECRET_KEY is set to a weak default value. Generate a strong key with: openssl rand -hex 32"
            )
        if len(v) < 32:
            raise ValueError(
                f"SECRET_KEY must be at least 32 characters (got {len(v)}). Generate a strong key with: openssl rand -hex 32"
            )
        return v

    @field_validator("ALGORITHM")
    @classmethod
    def validate_algorithm(cls, v):
        allowed = {"HS256", "RS256"}
        if v not in allowed:
            raise ValueError(f"ALGORITHM must be one of {allowed}")
        return v

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "https://astrozen.up.railway.app",
    ]

    @field_validator('BACKEND_CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str):
            return json.loads(v)
        return v

    @model_validator(mode="after")
    def reject_cors_wildcard(self):
        origins = self.BACKEND_CORS_ORIGINS
        if isinstance(origins, list) and "*" in origins:
            raise ValueError(
                "CORS wildcard '*' is not allowed when allow_credentials=True. "
                "Specify explicit origins."
            )
        return self

    # Application
    PROJECT_NAME: str
    VERSION: str
    API_V1_PREFIX: str

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True

    # Encryption key for OAuth tokens at rest
    ENCRYPTION_KEY: str | None = None

    # AI & Cloudflare R2
    OPENROUTER_API_KEY: str | None = None
    MODEL_NAME: str = "gpt-oss-120b:exacto"

    R2_ACCOUNT_ID: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: str | None = None
    R2_BUCKET_NAME: str | None = None
    R2_ENDPOINT: str | None = None

    # Google OAuth
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GOOGLE_REDIRECT_URI: str | None = None
    GOOGLE_SERVICE_ACCOUNT_INFO: str | None = None

    # JWT RS256 support (optional, for asymmetric signing)
    JWT_PRIVATE_KEY: str | None = None
    JWT_PUBLIC_KEY: str | None = None

    model_config = SettingsConfigDict(
        env_file=(".env", "Backend/.env"),
        case_sensitive=True,
        extra="ignore"
    )



settings = Settings()
