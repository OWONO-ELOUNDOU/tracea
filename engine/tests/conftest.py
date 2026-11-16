from pathlib import Path

import pytest

from tracea_engine.domain import BuildingModel

ROOT = Path(__file__).resolve().parents[2]
FIXTURES_DIR = ROOT / "packages" / "domain" / "fixtures"
SCHEMA_PATH = ROOT / "packages" / "domain" / "schema" / "building-model.schema.json"


def load_fixture(name: str) -> BuildingModel:
    return BuildingModel.model_validate_json((FIXTURES_DIR / f"{name}.json").read_text("utf-8"))


@pytest.fixture
def house() -> BuildingModel:
    return load_fixture("house-rectangular")
