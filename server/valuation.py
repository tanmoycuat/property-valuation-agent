"""Deterministic valuation engine.

Every constant and rounding rule here was recovered by probing the reference
implementation and is pinned by golden vectors in tests/test_valuation.py.
Change nothing without re-running those tests.
"""

from __future__ import annotations

import math

from .schemas import BreakdownItem, Condition, ValuationRequest, ValuationResponse

CURRENCY = "SEK"

# Baseline price per m2 by property type. Anything unlisted falls back to
# DEFAULT_BASE_SQM -- the reference does the same, so "Site / land" and any
# unknown type both price as 4200.
BASE_SQM_BY_TYPE: dict[str, int] = {"Apartment": 5200}
DEFAULT_BASE_SQM = 4200

CONDITION_ADJUSTMENT: dict[Condition, float] = {
    "excellent": 12.0,
    "good": 0.0,
    "fair": -7.0,
    "needs-work": -18.0,
}

# locationScore 0 -> -22%, 55 -> 0%, 100 -> +18%
LOCATION_SLOPE = 0.4
LOCATION_INTERCEPT = -22.0

# Bedrooms lift price per m2; floor area deliberately does not (it only scales
# the total). Capped, so a 7-bed and a 70-bed price identically.
BEDROOM_ADJUSTMENT_EACH = 1.8
BEDROOM_ADJUSTMENT_CAP = 12.0

CONFIDENCE_BASE = 66.0
CONFIDENCE_PER_LOCATION_POINT = 0.25

# The reference penalises every condition except "good" -- including
# "excellent", which reads as a bug but is reproduced deliberately. Set to 0.0
# to make confidence depend on location alone.
NON_GOOD_CONDITION_CONFIDENCE_PENALTY = 8

# Half-width of the published range, as a fraction of the estimate.
SPREAD_INTERCEPT = 160

METHODOLOGY = [
    "Starts with a transparent benchmark by property type.",
    "Adjusts for condition, location score, and bedroom count.",
    "Presents a range so the estimate is not mistaken for a formal appraisal.",
]


def js_round(value: float) -> int:
    """Round half away from zero, matching JavaScript's Math.round.

    Python's built-in round() is banker's rounding: round(78.5) is 78, where
    Math.round(78.5) is 79. Confidence hits exactly .5 on even location
    scores, so this distinction is load-bearing.
    """
    return math.floor(value + 0.5)


def base_price_per_sqm(property_type: str) -> int:
    return BASE_SQM_BY_TYPE.get(property_type, DEFAULT_BASE_SQM)


def location_adjustment(location_score: int) -> float:
    return location_score * LOCATION_SLOPE + LOCATION_INTERCEPT


def bedroom_adjustment(bedrooms: int) -> float:
    return min(bedrooms * BEDROOM_ADJUSTMENT_EACH, BEDROOM_ADJUSTMENT_CAP)


def confidence_for(location_score: int, condition: Condition) -> int:
    score = js_round(CONFIDENCE_BASE + CONFIDENCE_PER_LOCATION_POINT * location_score)
    if condition != "good":
        score -= NON_GOOD_CONDITION_CONFIDENCE_PENALTY
    return score


def calculate_valuation(request: ValuationRequest) -> ValuationResponse:
    base = base_price_per_sqm(request.propertyType)
    location = location_adjustment(request.locationScore)
    condition = CONDITION_ADJUSTMENT[request.condition]
    profile = bedroom_adjustment(request.bedrooms)

    # Adjustments compose multiplicatively, not additively.
    price_per_sqm = js_round(
        base
        * (1 + location / 100)
        * (1 + condition / 100)
        * (1 + profile / 100)
    )
    estimated_value = price_per_sqm * request.areaSqm

    confidence = confidence_for(request.locationScore, request.condition)
    spread = (SPREAD_INTERCEPT - confidence) / 1000

    return ValuationResponse(
        estimatedValue=estimated_value,
        lowValue=js_round(estimated_value * (1 - spread)),
        highValue=js_round(estimated_value * (1 + spread)),
        currency=CURRENCY,
        pricePerSqm=price_per_sqm,
        confidence=confidence,
        breakdown=[
            BreakdownItem(
                label="Local market baseline",
                value=base,
                detail=f"{request.propertyType} benchmark before adjustments",
            ),
            BreakdownItem(
                label="Location signal",
                value=js_round(location),
                detail=f"Location score {request.locationScore}/100",
            ),
            BreakdownItem(
                label="Condition",
                value=js_round(condition),
                detail=f"{request.condition} condition adjustment",
            ),
            BreakdownItem(
                label="Home profile",
                value=js_round(profile),
                detail=f"{request.bedrooms} bedrooms and {request.areaSqm} m²",
            ),
        ],
        methodology=list(METHODOLOGY),
    )
