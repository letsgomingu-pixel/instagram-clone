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
    # Auto-creates admin/pass123 and letsgomingu/12345 demo accounts on every startup.
    # Convenient for local dev, dangerous on a public server — keep this False in production.
    seed_demo_users: bool = True

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


settings = Settings()
