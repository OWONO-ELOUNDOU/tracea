"""Contract tests: every fixture in packages/domain/fixtures must be accepted by the Pydantic
model, by the exported JSON Schema, and must satisfy the invariants on the Python side."""

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

from tests.conftest import FIXTURES_DIR, SCHEMA_PATH
from tracea_engine.domain import BuildingModel, validate_invariants

FIXTURES = sorted(FIXTURES_DIR.glob("*.json"))


@pytest.mark.parametrize("path", FIXTURES, ids=[p.stem for p in FIXTURES])
def test_fixture_is_valid_for_pydantic(path: Path) -> None:
    model = BuildingModel.model_validate_json(path.read_text("utf-8"))
    assert validate_invariants(model) == []


@pytest.mark.parametrize("path", FIXTURES, ids=[p.stem for p in FIXTURES])
def test_fixture_is_valid_for_json_schema(path: Path) -> None:
    if not SCHEMA_PATH.exists():
        pytest.skip("JSON Schema not exported yet (run `pnpm --filter @tracea/domain schema`)")
    schema = json.loads(SCHEMA_PATH.read_text("utf-8"))
    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(json.loads(path.read_text("utf-8"))), key=str)
    assert errors == [], "\n".join(e.message for e in errors)
