"""FastAPI application: API routes plus the built single-page client."""

from __future__ import annotations

import json
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import assistant, config
from .geocode import lookup_property
from .schemas import (
    AssistantRequest,
    AssistantResponse,
    PropertyLookupResponse,
    Skill,
    SkillCreate,
    SkillUpdate,
    ValuationRequest,
    ValuationResponse,
)
from .skills import store
from .valuation import calculate_valuation

CLIENT_DIST = Path(__file__).resolve().parent.parent / "client" / "dist"

app = FastAPI(title="Property Valuation Agent", docs_url="/api/docs", openapi_url="/api/openapi.json")


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Mirror the reference app's error envelope: {"error": "<json string>"}."""
    return JSONResponse(status_code=400, content={"error": json.dumps(exc.errors(), default=str)})


@app.get("/api/health")
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "assistantConfigured": config.assistant_configured(),
        "model": config.MODEL_ID,
    }


@app.get("/api/properties/lookup", response_model=PropertyLookupResponse)
async def properties_lookup(query: str) -> PropertyLookupResponse:
    if len(query.strip()) < 3:
        raise HTTPException(status_code=400, detail="Query must be at least 3 characters.")
    try:
        found = await lookup_property(query)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="The lookup service is unavailable.")
    if found is None:
        raise HTTPException(status_code=404, detail="We couldn't locate that place.")
    return found


@app.post("/api/valuations", response_model=ValuationResponse)
async def valuations(request: ValuationRequest) -> ValuationResponse:
    return calculate_valuation(request)


@app.get("/api/skills", response_model=list[Skill])
async def list_skills() -> list[Skill]:
    return store.list()


@app.post("/api/skills", response_model=Skill, status_code=201)
async def create_skill(payload: SkillCreate) -> Skill:
    return store.create(payload)


@app.patch("/api/skills/{skill_id}", response_model=Skill)
async def update_skill(skill_id: str, payload: SkillUpdate) -> Skill:
    updated = store.update(skill_id, payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="Skill not found.")
    return updated


@app.delete("/api/skills/{skill_id}", status_code=204)
async def delete_skill(skill_id: str) -> None:
    if not store.delete(skill_id):
        raise HTTPException(status_code=404, detail="Skill not found.")


@app.post("/api/assistant/respond", response_model=AssistantResponse)
async def assistant_respond(request: AssistantRequest) -> AssistantResponse:
    return await assistant.respond(request)


# Static client last, so it never shadows an API route.
if CLIENT_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=CLIENT_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str) -> FileResponse:
        candidate = CLIENT_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(CLIENT_DIST / "index.html")
