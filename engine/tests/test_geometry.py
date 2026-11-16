from hypothesis import given
from hypothesis import strategies as st

from tracea_engine.geometry import area, is_simple_polygon, point_strictly_inside, polygons_overlap

SQUARE = [(0, 0), (1000, 0), (1000, 1000), (0, 1000)]


def test_rectangle_area() -> None:
    assert area(SQUARE) == 1_000_000


def test_l_shape_area() -> None:
    l_shape = [(0, 0), (2000, 0), (2000, 1000), (1000, 1000), (1000, 2000), (0, 2000)]
    assert area(l_shape) == 3_000_000


def test_bowtie_is_not_simple() -> None:
    assert not is_simple_polygon([(0, 0), (1000, 1000), (1000, 0), (0, 1000)])
    assert is_simple_polygon(SQUARE)


def test_boundary_is_outside() -> None:
    assert point_strictly_inside((500, 500), SQUARE)
    assert not point_strictly_inside((0, 500), SQUARE)


def test_adjacent_rooms_do_not_overlap() -> None:
    neighbour = [(1000, 0), (2000, 0), (2000, 1000), (1000, 1000)]
    assert not polygons_overlap(SQUARE, neighbour)


def test_shifted_rooms_overlap() -> None:
    shifted = [(500, 500), (1500, 500), (1500, 1500), (500, 1500)]
    assert polygons_overlap(SQUARE, shifted)
    assert polygons_overlap(SQUARE, SQUARE)


@given(
    w=st.integers(min_value=1, max_value=50_000),
    h=st.integers(min_value=1, max_value=50_000),
    x=st.integers(min_value=-100_000, max_value=100_000),
    y=st.integers(min_value=-100_000, max_value=100_000),
)
def test_rectangle_area_is_width_times_height(w: int, h: int, x: int, y: int) -> None:
    rect = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    assert area(rect) == w * h
    assert is_simple_polygon(rect)
