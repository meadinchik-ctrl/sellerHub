import json
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
CONFIG_JSON_PATH = BASE_DIR / "config.json"


class TelegramBotConfig(BaseModel):
    enabled: bool = True
    bot_username: str = "SellerHubBot"
    bot_name: str = "SELLER HUB Assistant"


class GoogleOAuthConfig(BaseModel):
    enabled: bool = True
    client_id: str = ""


class SupportConfig(BaseModel):
    email: str = "support@sellerhub.com"
    telegram: str = "https://t.me/sellerhub_support"
    documentation_url: str = "/docs"


class PlatformConfig(BaseModel):
    """Central platform configuration model read from config.json"""
    platform_name: str = "SELLER HUB"
    platform_description: str = "Универсальная SaaS-платформа для управления ассортиментом"
    base_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"
    logo_url: str = "/logo.svg"
    favicon_url: str = "/favicon.ico"
    default_store_name: str = "Мой магазин"
    default_store_avatar: str = "/default-store-avatar.png"
    default_store_cover: str = "/default-store-cover.jpg"
    default_language: str = "ru"
    supported_languages: List[str] = ["ru", "en", "uk"]
    telegram_bot: TelegramBotConfig = Field(default_factory=TelegramBotConfig)
    google_oauth: GoogleOAuthConfig = Field(default_factory=GoogleOAuthConfig)
    support: SupportConfig = Field(default_factory=SupportConfig)
    maintenance_mode: bool = False


class Settings(BaseSettings):
    """Environment variables from .env"""
    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: str = "development"
    DEBUG: Any = True
    SECRET_KEY: str = "sellerhub_dev_secret_jwt_key_998877665544332211"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    DATABASE_URL: str = "sqlite+aiosqlite:///./sellerhub.db"
    REDIS_URL: Optional[str] = None

    ADMIN_EMAIL: str = "admin@sellerhub.com"
    ADMIN_PASSWORD: str = "admin123456"

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_BOT_USERNAME: str = "SellerHubBot"
    TELEGRAM_PROXY: str = "socks5://127.0.0.1:10808"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/callback/google"

    STORAGE_TYPE: str = "local"
    STORAGE_DIR: str = str(BASE_DIR / "uploads")

    # Cached platform config
    _platform_config: Optional[PlatformConfig] = None

    @property
    def platform(self) -> PlatformConfig:
        if self._platform_config is None:
            self._platform_config = self.load_platform_config()
        return self._platform_config

    def load_platform_config(self) -> PlatformConfig:
        if CONFIG_JSON_PATH.exists():
            try:
                with open(CONFIG_JSON_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return PlatformConfig(**data)
            except Exception as e:
                print(f"[Config Warning] Error loading config.json: {e}, using defaults")
        return PlatformConfig()

    def update_platform_config(self, new_data: Dict[str, Any]) -> PlatformConfig:
        current = self.platform.model_dump()
        current.update(new_data)
        validated = PlatformConfig(**current)
        with open(CONFIG_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(validated.model_dump(), f, ensure_ascii=False, indent=2)
        self._platform_config = validated
        return validated


settings = Settings()
