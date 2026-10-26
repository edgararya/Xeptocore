import time

# A running session's summary is rewritten to history.json at most this often.
# Frames arrive about once a second and the store rewrites the whole file on
# every save, so saving each frame would be wasteful. finish() always writes
# the final numbers, so only a hard crash can lose the last few seconds.
PERSIST_INTERVAL_S = 5.0


class LiveSession:
    """Aggregates one live-scan connection into a single history entry.

    The entry is created when the first frame is actually analysed, so a
    session in which no face was ever found leaves no history behind. After
    that the counters are kept up to date in memory on every frame and
    persisted every PERSIST_INTERVAL_S (and once more in finish()).

    The entry's fields:
      label       "fake" if at least one frame raised an alert, else "real"
      confidence  highest fake probability seen in any frame (the peak)
      timestamp   when the session's first analysed frame was captured
      frames_scanned / alert_count   how many frames were analysed / alerted

    If the user deletes the entry while the scan is still running, the session
    stops writing instead of bringing the entry back.
    """

    def __init__(self, store, source: str):
        self._store = store
        self._source = source
        self._entry_id = None
        self._started_at = None
        self._frames = 0
        self._alerts = 0
        self._peak = 0.0
        self._last_persist = 0.0
        self._dirty = False
        self._discarded = False

    def _fields(self) -> dict:
        return {
            "label": "fake" if self._alerts > 0 else "real",
            "confidence": round(self._peak, 4),
            "frames_scanned": self._frames,
            "alert_count": self._alerts,
        }

    def _snapshot(self) -> dict:
        entry = {
            "id": self._entry_id,
            "source": self._source,
            "timestamp": self._started_at,
        }
        entry.update(self._fields())
        return entry

    def _persist(self, now: float):
        entry = self._store.update(self._entry_id, **self._fields())
        if entry is None:
            # Deleted by the user while the scan was running.
            self._discarded = True
            return None
        self._last_persist = now
        self._dirty = False
        return entry

    def record(self, confidence: float, alert: bool, timestamp: int):
        """Count one analysed frame. Returns the session's current entry (for
        the live history_update message), or None if it was deleted."""
        self._frames += 1
        if alert:
            self._alerts += 1
        self._peak = max(self._peak, float(confidence))
        self._dirty = True

        if self._discarded:
            return None

        now = time.monotonic()

        if self._entry_id is None:
            self._started_at = int(timestamp)
            fields = self._fields()
            entry = self._store.add(
                self._source,
                fields["label"],
                fields["confidence"],
                self._started_at,
                frames_scanned=fields["frames_scanned"],
                alert_count=fields["alert_count"],
            )
            self._entry_id = entry["id"]
            self._last_persist = now
            self._dirty = False
            return self._snapshot()

        if now - self._last_persist >= PERSIST_INTERVAL_S:
            self._persist(now)
            if self._discarded:
                return None

        return self._snapshot()

    def finish(self):
        """Write the final numbers. Call when the connection ends."""
        if self._entry_id is not None and self._dirty and not self._discarded:
            self._persist(time.monotonic())
