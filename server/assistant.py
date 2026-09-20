"""The assistant: the one place this app calls a language model.

Enabled skills are folded into the system prompt, so the /skills page changes
how the assistant reasons.
"""

from __future__ import annotations

import httpx

from . import config
from .schemas import AssistantRequest, AssistantResponse
from .skills import store

BASE_PERSONA = (
    "You are a cautious property valuation copilot. You help an agent "
    "pressure-test a deterministic estimate. Be concrete and brief. Never "
    "present a figure as a formal appraisal, and say plainly when the "
    "evidence available is too thin to support a conclusion."
)

UNCONFIGURED_MESSAGE = (
    "Assistant configuration is limited; this response is based on the "
    "available workspace context."
)

UNAVAILABLE_MESSAGE = "The assistant is unavailable right now. Try again in a moment."


def build_system_prompt() -> str:
    parts = [BASE_PERSONA]
    active = store.enabled()
    if active:
        parts.append("Apply these operating instructions:")
        parts.extend(f"- {skill.name}: {skill.instruction}" for skill in active)
    return "\n".join(parts)


def build_messages(request: AssistantRequest) -> list[dict[str, str]]:
    messages = [{"role": "system", "content": build_system_prompt()}]
    if request.context:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Current valuation context as JSON. Treat these numbers as "
                    f"given, do not recompute them:\n{request.context}"
                ),
            }
        )
    messages.append({"role": "user", "content": request.prompt})
    return messages


async def respond(request: AssistantRequest) -> AssistantResponse:
    if not config.assistant_configured():
        return AssistantResponse(message=UNCONFIGURED_MESSAGE, configured=False)

    payload = {
        "model": config.MODEL_ID,
        "messages": build_messages(request),
        "temperature": 0.3,
        "max_tokens": 700,
    }
    headers = {
        "Authorization": f"Bearer {config.INFERENCE_TOKEN}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=config.REQUEST_TIMEOUT) as client:
            response = await client.post(
                f"{config.INFERENCE_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            body = response.json()
        message = body["choices"][0]["message"]["content"].strip()
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        # The token exists but the call failed: surface the reference app's
        # transient-failure copy rather than leaking provider internals.
        return AssistantResponse(message=UNAVAILABLE_MESSAGE, configured=True)

    return AssistantResponse(message=message, configured=True)
