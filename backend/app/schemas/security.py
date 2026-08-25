from datetime import datetime

from pydantic import BaseModel, Field


class SecuritySummaryOut(BaseModel):
    login_email_alerts: bool = True
    two_factor_enabled: bool = False
    trusted_session_count: int = 0
    recent_login_count: int = 0


class LoginSessionOut(BaseModel):
    id: int
    device_name: str
    ip_address: str
    location: str | None = None
    is_trusted: bool
    is_current: bool
    created_at: datetime
    last_active_at: datetime


class LoginEmailAlertsUpdate(BaseModel):
    enabled: bool


class LoginSessionTrustUpdate(BaseModel):
    is_trusted: bool


class TwoFactorSetupOut(BaseModel):
    secret: str
    otpauth_url: str


class TwoFactorEnableRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class TwoFactorDisableRequest(BaseModel):
    password: str = Field(min_length=1)
    code: str = Field(min_length=6, max_length=6)
