from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
from pydantic import field_validator
import os
import json


class Settings(BaseSettings):
    # Database
    # Use environment variable DATABASE_URL, no default provided for security
    DATABASE_URL: str
    # Security
    # Use environment variable SECRET_KEY, no default provided for security
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"]
    
    @field_validator('BACKEND_CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from JSON string or return list as-is"""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str):
            return json.loads(v)
        return v
    
    # Application
    PROJECT_NAME: str
    VERSION: str
    API_V1_PREFIX: str
    
    # AI & Cloudflare R2
    OPENROUTER_API_KEY: str | None = None
    MODEL_NAME: str = "gpt-oss-120b:exacto"
    
    R2_ACCOUNT_ID: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: str | None = None
    R2_BUCKET_NAME: str | None = None

    model_config = SettingsConfigDict(
        env_file=(".env", "Backend/.env"), 
        case_sensitive=True,
        extra="ignore"
    )
    



settings = Settings()
