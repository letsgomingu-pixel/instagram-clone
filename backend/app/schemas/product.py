from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.models.product import AVAILABILITY_TYPES, STORAGE_TYPES


class ProductOut(BaseModel):
    id: int
    name: str
    price: int
    unit: str
    storage_type: str
    availability: str
    season_start: str | None = None
    season_end: str | None = None
    stock: int
    is_active: bool
    is_in_season: bool = True
    is_available: bool = True

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    price: int = Field(ge=0)
    unit: str = Field(min_length=1, max_length=50)
    storage_type: str
    availability: str
    season_start: date | None = None
    season_end: date | None = None
    stock: int = Field(ge=0, default=0)

    @field_validator("storage_type")
    @classmethod
    def validate_storage_type(cls, v: str) -> str:
        if v not in STORAGE_TYPES:
            raise ValueError(f"storage_type must be one of: {', '.join(STORAGE_TYPES)}")
        return v

    @field_validator("availability")
    @classmethod
    def validate_availability(cls, v: str) -> str:
        if v not in AVAILABILITY_TYPES:
            raise ValueError(f"availability must be one of: {', '.join(AVAILABILITY_TYPES)}")
        return v

    @field_validator("season_end")
    @classmethod
    def validate_season(cls, v: date | None, info) -> date | None:
        availability = info.data.get("availability")
        season_start = info.data.get("season_start")
        if availability == "seasonal":
            if not season_start or not v:
                raise ValueError("season_start and season_end are required for seasonal products")
        return v


class ProductUpdate(BaseModel):
    price: int | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
