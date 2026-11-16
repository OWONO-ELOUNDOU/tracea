from tracea_engine.domain import BuildingModel, Level, compute_metrics, validate_invariants


def codes(model: BuildingModel) -> list[str]:
    return [check.code for check in validate_invariants(model)]


def test_reference_fixture_has_no_violation(house: BuildingModel) -> None:
    assert validate_invariants(house) == []


def test_metrics_are_recomputable(house: BuildingModel) -> None:
    assert compute_metrics(house) == house.metrics


def test_wall_too_short(house: BuildingModel) -> None:
    model = house.model_copy(deep=True)
    model.walls[5].end = (7200, 4000)
    assert "WALL_TOO_SHORT" in codes(model)


def test_wall_thickness_out_of_range(house: BuildingModel) -> None:
    model = house.model_copy(deep=True)
    model.walls[4].thickness = 50
    assert "WALL_THICKNESS_OUT_OF_RANGE" in codes(model)


def test_opening_out_of_wall(house: BuildingModel) -> None:
    model = house.model_copy(deep=True)
    model.openings[2].offset = 11500
    assert "OPENING_OUT_OF_WALL" in codes(model)


def test_door_sill_must_be_zero(house: BuildingModel) -> None:
    model = house.model_copy(deep=True)
    model.openings[0].sillHeight = 100
    assert "OPENING_SILL_INVALID" in codes(model)


def test_openings_overlap(house: BuildingModel) -> None:
    model = house.model_copy(deep=True)
    model.openings[1].offset = 1500
    assert "OPENINGS_OVERLAP" in codes(model)


def test_room_without_door(house: BuildingModel) -> None:
    model = house.model_copy(deep=True)
    model.openings = [o for o in model.openings if o.id != "o_05"]
    result = validate_invariants(model)
    violation = next(c for c in result if c.code == "ROOM_NOT_ACCESSIBLE")
    assert violation.targetIds == ["r_03"]


def test_rooms_overlap(house: BuildingModel) -> None:
    model = house.model_copy(deep=True)
    model.rooms[1].polygon = [(6000, 150), (11850, 150), (11850, 3950), (6000, 3950)]
    model.rooms[1].area = 22_230_000
    model.metrics.habitableArea += 3_990_000
    model.metrics.floorArea += 3_990_000
    assert "ROOMS_OVERLAP" in codes(model)


def test_level_references_and_stairs(house: BuildingModel) -> None:
    model = house.model_copy(deep=True)
    model.levels.append(
        Level(id="lvl_1", name="Étage", index=1, elevation=2900, height=2500, slabThickness=200)
    )
    model.walls[0].levelId = "lvl_9"
    result = codes(model)
    assert "LEVEL_NOT_FOUND" in result
    assert "LEVEL_NOT_CONNECTED" in result


def test_metrics_mismatch(house: BuildingModel) -> None:
    model = house.model_copy(deep=True)
    model.metrics.habitableArea += 10
    assert "METRICS_MISMATCH" in codes(model)
