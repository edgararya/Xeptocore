"""LiveSession turns one live scan connection into a single history entry."""

import types

import pytest

from app import live_session
from app.live_session import PERSIST_INTERVAL_S, LiveSession

START = 1_700_000_000_000


@pytest.fixture
def advance(monkeypatch):
    """Control the clock LiveSession uses to throttle writes."""
    state = {"now": 1000.0}
    monkeypatch.setattr(
        live_session, "time", types.SimpleNamespace(monotonic=lambda: state["now"])
    )

    def move(seconds):
        state["now"] += seconds

    return move


def only_entry(store):
    assert len(store.entries) == 1
    return next(iter(store.entries.values()))


def test_nothing_is_saved_until_a_frame_has_been_analysed(fake_store):
    session = LiveSession(fake_store, "desktop_screen")

    session.finish()

    assert fake_store.entries == {}
    assert fake_store.add_calls == 0
    assert fake_store.update_calls == 0


def test_first_analysed_frame_creates_one_entry(fake_store):
    session = LiveSession(fake_store, "desktop_screen")

    snapshot = session.record(0.30, False, START)

    entry = only_entry(fake_store)
    assert entry["source"] == "desktop_screen"
    assert entry["label"] == "real"
    assert entry["confidence"] == 0.30
    assert entry["timestamp"] == START
    assert entry["frames_scanned"] == 1
    assert entry["alert_count"] == 0
    assert snapshot["id"] == entry["id"]
    assert snapshot["timestamp"] == START


def test_alerts_make_the_session_fake_and_the_peak_is_kept(fake_store):
    session = LiveSession(fake_store, "desktop_screen")

    session.record(0.30, False, START)
    session.record(0.86, True, START + 1000)
    session.record(0.50, False, START + 2000)
    session.finish()

    entry = only_entry(fake_store)
    assert entry["label"] == "fake"
    assert entry["confidence"] == 0.86
    assert entry["frames_scanned"] == 3
    assert entry["alert_count"] == 1


def test_label_follows_alerts_not_the_peak_score(fake_store):
    session = LiveSession(fake_store, "desktop_screen")

    session.record(0.10, False, START)
    session.record(0.60, False, START + 1000)  # above 0.44, but no alert was raised
    session.finish()

    entry = only_entry(fake_store)
    assert entry["label"] == "real"
    assert entry["confidence"] == 0.60
    assert entry["alert_count"] == 0


def test_confidence_is_rounded_to_four_decimals(fake_store):
    session = LiveSession(fake_store, "desktop_screen")

    session.record(0.123456789, False, START)

    assert only_entry(fake_store)["confidence"] == 0.1235


def test_writes_are_throttled(fake_store, advance):
    session = LiveSession(fake_store, "desktop_screen")

    session.record(0.30, False, START)  # creates the entry
    assert (fake_store.add_calls, fake_store.update_calls) == (1, 0)

    advance(1)
    session.record(0.30, False, START + 1000)
    advance(PERSIST_INTERVAL_S - 1.5)
    session.record(0.30, False, START + 2000)  # still inside the interval
    assert fake_store.update_calls == 0

    advance(1.5)
    session.record(0.30, False, START + 3000)  # interval reached: one write
    assert fake_store.update_calls == 1
    assert only_entry(fake_store)["frames_scanned"] == 4


def test_the_store_lags_between_writes_but_finish_writes_the_final_numbers(fake_store, advance):
    session = LiveSession(fake_store, "desktop_screen")

    session.record(0.30, False, START)
    advance(1)
    session.record(0.30, False, START + 1000)

    assert only_entry(fake_store)["frames_scanned"] == 1  # not persisted yet

    session.finish()

    assert only_entry(fake_store)["frames_scanned"] == 2
    assert fake_store.update_calls == 1


def test_finish_does_not_write_again_when_nothing_changed(fake_store, advance):
    session = LiveSession(fake_store, "desktop_screen")
    session.record(0.30, False, START)
    advance(PERSIST_INTERVAL_S)
    session.record(0.30, False, START + 1000)  # persisted by the interval
    writes = fake_store.update_calls

    session.finish()

    assert fake_store.update_calls == writes


def test_the_returned_snapshot_is_current_even_when_not_persisted(fake_store, advance):
    session = LiveSession(fake_store, "desktop_screen")
    session.record(0.30, False, START)
    advance(1)

    snapshot = session.record(0.90, True, START + 1000)

    assert snapshot["frames_scanned"] == 2
    assert snapshot["alert_count"] == 1
    assert snapshot["label"] == "fake"
    assert snapshot["confidence"] == 0.90
    assert only_entry(fake_store)["frames_scanned"] == 1  # the store has not caught up


def test_a_deleted_entry_is_not_brought_back(fake_store, advance):
    session = LiveSession(fake_store, "desktop_screen")
    first = session.record(0.30, False, START)
    fake_store.delete(first["id"])

    advance(PERSIST_INTERVAL_S)
    assert session.record(0.30, False, START + 1000) is None  # notices the deletion
    assert session.record(0.30, False, START + 2000) is None  # and stays quiet

    session.finish()
    assert fake_store.entries == {}
    assert fake_store.add_calls == 1


def test_a_deletion_is_noticed_at_finish_too(fake_store):
    session = LiveSession(fake_store, "desktop_screen")
    first = session.record(0.30, False, START)
    session.record(0.30, False, START + 1000)  # unsaved change
    fake_store.delete(first["id"])

    session.finish()

    assert fake_store.entries == {}


def test_each_session_gets_its_own_entry(fake_store):
    first = LiveSession(fake_store, "desktop_screen")
    second = LiveSession(fake_store, "desktop_screen")

    first.record(0.30, False, START)
    second.record(0.90, True, START + 5000)
    first.finish()
    second.finish()

    labels = sorted(entry["label"] for entry in fake_store.entries.values())
    assert labels == ["fake", "real"]