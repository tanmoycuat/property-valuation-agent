"""Property lookup backed by OpenStreetMap Nominatim.

Results are cached in-process: Nominatim asks for at most one request per
second and a showcased Space gets far more traffic than a private one.
"""

from __future__ import annotations

from collections import OrderedDict

import httpx

from . import config
from .schemas import PropertyLookupContext, PropertyLookupResponse

_cache: OrderedDict[str, PropertyLookupResponse | None] = OrderedDict()

# Nominatim returns a deep address object; these are the keys worth surfacing.
_CITY_KEYS = ("city", "town", "village", "municipality", "hamlet", "suburb")


def _remember(key: str, value: PropertyLookupResponse | None) -> None:
    _cache[key] = value
    _cache.move_to_end(key)
    while len(_cache) > config.GEOCODER_CACHE_SIZE:
        _cache.popitem(last=False)


def _to_context(address: dict) -> PropertyLookupContext:
    city = next((address[key] for key in _CITY_KEYS if address.get(key)), None)
    return PropertyLookupContext(city=city, country=address.get("country"))


async def lookup_property(query: str) -> PropertyLookupResponse | None:
    key = query.strip().casefold()
    if key in _cache:
        _cache.move_to_end(key)
        return _cache[key]

    params = {"q": query, "format": "jsonv2", "limit": 1, "addressdetails": 1}
    headers = {"User-Agent": config.GEOCODER_USER_AGENT, "Accept": "application/json"}

    async with httpx.AsyncClient(timeout=config.REQUEST_TIMEOUT) as client:
        response = await client.get(config.GEOCODER_URL, params=params, headers=headers)
        response.raise_for_status()
        results = response.json()

    if not results:
        _remember(key, None)
        return None

    top = results[0]
    found = PropertyLookupResponse(
        displayName=top.get("display_name", query),
        latitude=float(top["lat"]),
        longitude=float(top["lon"]),
        source="OpenStreetMap Nominatim",
        context=_to_context(top.get("address") or {}),
    )
    _remember(key, found)
    return found
