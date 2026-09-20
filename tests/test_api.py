from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from server import assistant, config
from server.main import app
from server.schemas import AssistantRequest, SkillUpdate
from server.skills import store


@pytest.fixture()
def client():
    store.reset()
    return TestClient(app)


def test_valuation_endpoint_matches_reference(client):
    response = client.post(
        "/api/valuations",
        json={
            "propertyType": "Detached house",
            "areaSqm": 118,
            "bedrooms": 3,
            "condition": "good",
            "locationScore": 76,
            "latitude": 59.9133301,
            "longitude": 10.7389701,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["estimatedValue"] == 566282
    assert body["lowValue"] == 523811
    assert body["highValue"] == 608753
    assert body["pricePerSqm"] == 4799
    assert body["confidence"] == 85
    assert body["currency"] == "SEK"
    assert len(body["breakdown"]) == 4


@pytest.mark.parametrize(
    "payload",
    [
        {"areaSqm": 9, "bedrooms": 1, "condition": "good", "locationScore": 50},
        {"areaSqm": 60, "bedrooms": -1, "condition": "good", "locationScore": 50},
        {"areaSqm": 60, "bedrooms": 1, "condition": "good", "locationScore": 101},
        {"areaSqm": 60, "bedrooms": 1, "condition": "poor", "locationScore": 50},
    ],
)
def test_valuation_rejects_out_of_range_input(client, payload):
    response = client.post("/api/valuations", json={"propertyType": "Apartment", **payload})
    assert response.status_code == 400
    assert "error" in response.json()


def test_skills_crud_round_trip(client):
    seeded = client.get("/api/skills").json()
    assert [s["id"] for s in seeded] == ["market-context", "uncertainty-check", "agent-summary"]

    created = client.post(
        "/api/skills",
        json={
            "name": "Rental yield",
            "description": "Check the income case.",
            "instruction": "State the implied gross yield when rent is known.",
            "enabled": True,
            "category": "Valuation",
        },
    ).json()
    assert created["id"] not in {s["id"] for s in seeded}

    patched = client.patch(f"/api/skills/{created['id']}", json={"enabled": False}).json()
    assert patched["enabled"] is False
    assert patched["name"] == "Rental yield"

    assert client.delete(f"/api/skills/{created['id']}").status_code == 204
    assert client.delete(f"/api/skills/{created['id']}").status_code == 404


def test_assistant_reports_unconfigured_without_a_token(client, monkeypatch):
    monkeypatch.setattr(config, "INFERENCE_TOKEN", None)
    body = client.post("/api/assistant/respond", json={"prompt": "Anything?"}).json()
    assert body["configured"] is False
    assert body["message"] == assistant.UNCONFIGURED_MESSAGE


def test_enabled_skills_shape_the_system_prompt():
    store.reset()
    prompt = assistant.build_system_prompt()
    assert "cautious property valuation copilot" in prompt
    assert "Uncertainty check" in prompt

    store.update("uncertainty-check", SkillUpdate(enabled=False))
    assert "Uncertainty check" not in assistant.build_system_prompt()
    store.reset()


def test_context_is_passed_to_the_model_as_a_system_message():
    messages = assistant.build_messages(
        AssistantRequest(prompt="What next?", context='{"estimatedValue": 566282}')
    )
    assert messages[0]["role"] == "system"
    assert "566282" in messages[1]["content"]
    assert messages[-1] == {"role": "user", "content": "What next?"}


def test_health_reports_assistant_state(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert "assistantConfigured" in body
