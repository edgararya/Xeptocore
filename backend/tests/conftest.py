"""Shared test setup.

These tests need neither TensorFlow nor the model weights, and they contain no
images of real people: test pictures are plain generated arrays, and face
detection is faked.
"""

import pytest


class FakeStore:
    """In-memory stand-in for HistoryStore (the methods LiveSession uses)."""

    def __init__(self):
        self.entries = {}
        self.add_calls = 0
        self.update_calls = 0
        self._counter = 0

    def add(self, source, label, confidence, timestamp=None, **extra):
        self._counter += 1
        entry = {
            "id": f"h_{self._counter:03d}",
            "source": source,
            "label": label,
            "confidence": confidence,
            "timestamp": timestamp if timestamp is not None else 1_700_000_000_000,
        }
        entry.update(extra)
        self.entries[entry["id"]] = entry
        self.add_calls += 1
        return entry

    def update(self, entry_id, **fields):
        entry = self.entries.get(entry_id)
        if entry is None:
            return None
        entry.update(fields)
        self.update_calls += 1
        return dict(entry)

    def delete(self, entry_id):
        return self.entries.pop(entry_id, None) is not None


@pytest.fixture
def fake_store():
    return FakeStore()