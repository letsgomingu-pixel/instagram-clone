from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./instagram.db"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    media_root: str = "./media"
    max_upload_size_mb: int = 10
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    frontend_url: str = "http://localhost:5173"
    # Auto-creates admin/pass123 and letsgomingu/12345 demo accounts on every startup.
    # Convenient for local dev, dangerous on a public server — keep this False in production.
    seed_demo_users: bool = True

    base_shipping_fee: int = 4000

    email_enabled: bool = False
    email_from: str = "noreply@iamnotafishmonger.com"
    resend_api_key: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)

    @property
    def email_delivery_ready(self) -> bool:
        return bool(self.resend_api_key or self.smtp_configured)

    @property
    def should_send_email(self) -> bool:
        return self.email_enabled or self.email_delivery_ready

    portone_store_id: str = ""
    portone_channel_key: str = ""
    portone_api_secret: str = ""
    portone_webhook_secret: str = ""
    # When true (or API secret missing), use mock payment confirm for local/tests.
    portone_mock: bool = True

    @property
    def portone_enabled(self) -> bool:
        return bool(self.portone_store_id and self.portone_channel_key and self.portone_api_secret)

    @property
    def use_mock_payments(self) -> bool:
        return self.portone_mock or not self.portone_enabled

    # Media storage: "local" writes to MEDIA_ROOT on disk (default, matches
    # existing deployments). "s3" uploads to S3 and returns CDN URLs instead
    # — see deploy/POSTGRES_AND_S3.md before switching this.
    storage_backend: str = "local"
    aws_region: str = "ap-northeast-2"
    aws_s3_bucket: str = ""
    # Public base URL that serves the bucket's objects — a CloudFront domain
    # (recommended) or the bucket's own S3 website/REST endpoint.
    media_cdn_base_url: str = ""

    @property
    def origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def is_postgresql(self) -> bool:
        lowered = self.database_url.lower()
        return lowered.startswith("postgresql") or lowered.startswith("postgres://")

    @property
    def database_dialect(self) -> str:
        if self.is_sqlite:
            return "sqlite"
        if self.is_postgresql:
            return "postgresql"
        return "unknown"


settings = Settings()
