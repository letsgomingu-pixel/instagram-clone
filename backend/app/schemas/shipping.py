import re

from pydantic import BaseModel, Field, field_validator


_PHONE_RE = re.compile(r"^01[0-9]-?\d{3,4}-?\d{4}$")
_POSTCODE_RE = re.compile(r"^\d{5}$")


class ShippingFields(BaseModel):
    phone: str = Field(min_length=1, max_length=20)
    postcode: str = Field(min_length=5, max_length=10)
    address_line1: str = Field(min_length=1, max_length=255)
    address_line2: str = Field(min_length=1, max_length=255)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        normalized = v.strip()
        if not _PHONE_RE.match(normalized):
            raise ValueError("Invalid phone number format")
        return normalized

    @field_validator("postcode")
    @classmethod
    def validate_postcode(cls, v: str) -> str:
        normalized = v.strip()
        if not _POSTCODE_RE.match(normalized):
            raise ValueError("Postcode must be 5 digits")
        return normalized

    @field_validator("address_line1", "address_line2")
    @classmethod
    def validate_address(cls, v: str) -> str:
        normalized = v.strip()
        if not normalized:
            raise ValueError("Address is required")
        return normalized
