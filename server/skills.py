"""Agent skills store.

Hugging Face Spaces have no persistent disk on the free tier, so this is an
in-process store seeded with the reference app's three defaults. Edits survive
until the Space restarts, then reset to the seed.
"""

from __future__ import annotations

import uuid

from .schemas import Skill, SkillCreate, SkillUpdate

CATEGORIES = ["Valuation", "Trust", "Communication"]

SEED_SKILLS = [
    Skill(
        id="market-context",
        name="Market context",
        description="Use local market signals to keep the estimate grounded.",
        instruction=(
            "Explain which local market assumptions influence the estimate and "
            "call out where fresh comparable sales would improve confidence."
        ),
        enabled=True,
        category="Valuation",
    ),
    Skill(
        id="uncertainty-check",
        name="Uncertainty check",
        description="Make ranges and confidence visible before a decision is made.",
        instruction=(
            "Never present a single value without a range. Name the two biggest "
            "unknowns and state what additional evidence would narrow them."
        ),
        enabled=True,
        category="Trust",
    ),
    Skill(
        id="agent-summary",
        name="Agent summary",
        description="Turn the valuation into a concise client-ready explanation.",
        instruction=(
            "Write a short summary in plain language that an agent can share with "
            "a property owner, avoiding appraisal-grade certainty."
        ),
        enabled=True,
        category="Communication",
    ),
]


class SkillStore:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self._skills: dict[str, Skill] = {s.id: s.model_copy(deep=True) for s in SEED_SKILLS}

    def list(self) -> list[Skill]:
        return list(self._skills.values())

    def enabled(self) -> list[Skill]:
        return [skill for skill in self._skills.values() if skill.enabled]

    def create(self, payload: SkillCreate) -> Skill:
        skill = Skill(id=str(uuid.uuid4()), **payload.model_dump())
        self._skills[skill.id] = skill
        return skill

    def update(self, skill_id: str, payload: SkillUpdate) -> Skill | None:
        existing = self._skills.get(skill_id)
        if existing is None:
            return None
        updated = existing.model_copy(update=payload.model_dump(exclude_unset=True))
        self._skills[skill_id] = updated
        return updated

    def delete(self, skill_id: str) -> bool:
        return self._skills.pop(skill_id, None) is not None


store = SkillStore()
