"""Golden vectors captured from the reference implementation.

Each case is a real request/response pair recorded from the live service, so a
failure here means we have drifted from the app we are replicating.
"""

from __future__ import annotations

import pytest

from server.schemas import ValuationRequest
from server.valuation import calculate_valuation, js_round


def value(property_type="Detached house", area=100, beds=0, condition="good", score=50):
    return calculate_valuation(
        ValuationRequest(
            propertyType=property_type,
            areaSqm=area,
            bedrooms=beds,
            condition=condition,
            locationScore=score,
        )
    )


# (kwargs, pricePerSqm, estimatedValue, lowValue, highValue, confidence)
GOLDEN = [
    (dict(area=118, beds=3, score=76), 4799, 566282, 523811, 608753, 85),
    (dict(), 4116, 411600, 378260, 444940, 79),
    (dict(score=0), 3276, 327600, 296806, 358394, 66),
    (dict(score=100), 4956, 495600, 461404, 529796, 91),
    (dict(property_type="Apartment"), 5096, 509600, 468322, 550878, 79),
    (dict(property_type="Apartment", area=60, beds=2, condition="fair", score=88),
     5671, 340260, 313039, 367481, 80),
    (dict(condition="excellent"), 4610, 461000, None, None, 71),
    (dict(condition="fair"), 3828, 382800, None, None, 71),
    (dict(condition="needs-work"), 3375, 337500, None, None, 71),
    (dict(condition="excellent", score=0), 3669, None, None, None, 58),
    (dict(condition="needs-work", score=0), 2686, None, None, None, 58),
    (dict(condition="excellent", score=100), 5551, None, None, None, 83),
    (dict(condition="needs-work", score=100), 4064, None, None, None, 83),
    (dict(beds=1), 4190, 419000, None, None, 79),
    (dict(beds=2), 4264, 426400, None, None, 79),
    (dict(beds=4), 4412, 441200, None, None, 79),
    (dict(beds=6), 4561, None, None, None, 79),
    (dict(beds=7), 4610, None, None, None, 79),
    (dict(beds=8), 4610, None, None, None, 79),
    (dict(beds=10), 4610, None, None, None, 79),
    (dict(area=50), 4116, 205800, None, None, 79),
    (dict(area=120), 4116, 493920, None, None, 79),
    (dict(area=200), 4116, 823200, None, None, 79),
    (dict(area=300), 4116, 1234800, None, None, 79),
]


@pytest.mark.parametrize("kwargs,pps,est,low,high,confidence", GOLDEN)
def test_matches_reference(kwargs, pps, est, low, high, confidence):
    result = value(**kwargs)
    assert result.pricePerSqm == pps
    assert result.confidence == confidence
    if est is not None:
        assert result.estimatedValue == est
    if low is not None:
        assert result.lowValue == low
    if high is not None:
        assert result.highValue == high


@pytest.mark.parametrize(
    "property_type", ["Semi-detached house", "Terraced house", "Site / land", "Castle"]
)
def test_unlisted_types_use_the_default_baseline(property_type):
    """Only Apartment has its own baseline; everything else falls back to 4200."""
    result = value(property_type=property_type)
    assert result.pricePerSqm == 4116
    assert result.breakdown[0].value == 4200


def test_js_round_is_half_away_from_zero():
    """Python's round(78.5) == 78; the reference gives 79."""
    assert js_round(78.5) == 79
    assert js_round(70.5) == 71
    assert js_round(8.4) == 8


def test_floor_area_does_not_move_price_per_sqm():
    assert value(area=50).pricePerSqm == value(area=300).pricePerSqm


def test_excellent_condition_lowers_confidence_like_the_reference():
    """Reproduces a quirk in the original: only "good" escapes the penalty."""
    assert value(condition="excellent").confidence == value(condition="fair").confidence
    assert value(condition="good").confidence > value(condition="excellent").confidence


def test_breakdown_shape_and_copy():
    result = value(property_type="Apartment", area=60, beds=2, condition="fair", score=88)
    assert [item.label for item in result.breakdown] == [
        "Local market baseline",
        "Location signal",
        "Condition",
        "Home profile",
    ]
    assert [item.value for item in result.breakdown] == [5200, 13, -7, 4]
    assert result.breakdown[0].detail == "Apartment benchmark before adjustments"
    assert result.breakdown[1].detail == "Location score 88/100"
    assert result.breakdown[2].detail == "fair condition adjustment"
    assert result.breakdown[3].detail == "2 bedrooms and 60 m²"
    assert result.currency == "SEK"
    assert len(result.methodology) == 3
