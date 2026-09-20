"""Wire formats. Field names are camelCase to match the existing frontend."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Condition = Literal["needs-work", "fair", "good", "excellent"]


class ValuationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    propertyType: str = Field(min_length=1)
    areaSqm: int = Field(ge=10)
    bedrooms: int = Field(ge=0)
    condition: Condition
    locationScore: int = Field(ge=0, le=100)
    latitude: float | None = None
    longitude: float | None = None


class BreakdownItem(BaseModel):
    label: str
    value: int
    detail: str


class ValuationResponse(BaseModel):
    estimatedValue: int
    lowValue: int
    highValue: int
    currency: str
    pricePerSqm: int
    confidence: int
    breakdown: list[BreakdownItem]
    methodology: list[str]


class PropertyLookupContext(BaseModel):
    model_config = ConfigDict(extra="allow")

    city: str | None = None
    country: str | None = None


class PropertyLookupResponse(BaseModel):
    displayName: str
    latitude: float
    longitude: float
    source: str
    context: PropertyLookupContext


class Skill(BaseModel):
    id: str
    name: str
    description: str
    instruction: str
    enabled: bool
    category: str


class SkillCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    instruction: str = Field(min_length=1)
    enabled: bool = True
    category: str = "Valuation"


class SkillUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    instruction: str | None = Field(default=None, min_length=1)
    enabled: bool | None = None
    category: str | None = None


class AssistantRequest(BaseModel):
    prompt: str = Field(min_length=1)
    context: str | None = None


class AssistantResponse(BaseModel):
    message: str
    configured: bool
