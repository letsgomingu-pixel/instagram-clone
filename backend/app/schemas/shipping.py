import re

from pydantic import BaseModel, Field, field_validator


_PHONE_RE = re.compile(r"^01[0-9]-?\d{3,4}-?\d{4}$")
_POSTCODE_RE = re.compile(r"^\d{5}$")


def fill_pickup_address(data: object) -> object:
    """Pickup orders have no delivery address. Fill placeholders before validation."""
    if not isinstance(data, dict) or data.get("fulfillment_type") != "pickup":
        return data
    filled = dict(data)
    if not str(filled.get("postcode") or "").strip():
        filled["postcode"] = "00000"
    if not str(filled.get("address_line1") or "").strip():
        filled["address_line1"] = "매장 포장 수령"
    if not str(filled.get("address_line2") or "").strip():
        filled["address_line2"] = "-"
    return filled


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
