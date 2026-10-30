# Xeptocore API Contract

The contract of the backend API (`backend/app/main.py`). This document follows the implementation; if it differs from the code, the code is right and this document needs fixing. FastAPI also serves interactive documentation for the REST endpoints at `http://localhost:8000/docs` (the WebSocket is not covered there).

## Summary

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Model status |
| `POST` | `/detect` | Analyse one image or video file |
| `WS` | `/ws/live-scan?source=desktop_screen` | Live scan: receive screenshots, reply with results and alerts |
| `GET` | `/history` | List history entries |
| `DELETE` | `/history/{id}` | Delete one entry |
| `DELETE` | `/history` | Delete all entries |

## Address and configuration

- **Address:** `http://localhost:{PORT}`. The backend uses the `PORT` environment variable (default `8000`) and prints `[Xeptocore] Backend ready on port {PORT}` when it is ready.
- **In development:** the backend runs in Docker (port `8000` is published), and the Electron app is pointed at it with `XEPTOCORE_BACKEND_PORT=8000`. In a packaged build (not available yet), Electron will start the backend itself and read the port from that `Backend ready on port ...` line.
- **No authentication, and CORS is open (`*`).** The backend is designed as a local service; see the security notes below.

| Constant | Value | Notes |
|---|---|---|
| `FAKE_THRESHOLD` | `0.44` | The label is `fake` when `confidence` is greater than this |
| `ALERT_THRESHOLD` | `0.75` | Live scan sets `alert` when `confidence` is greater than this |
| `SCAN_INTERVAL_MS` | `1000` | Suggested delay between live scan frames |
| Maximum size | 10 MB for images, 100 MB for videos | |
| Formats | `.jpg`, `.jpeg`, `.png`, `.mp4` | |
| Video sampling | every 10th frame | Only frames that contain a face are analysed |
| `HISTORY_FILE` | `backend/data/history.json` | Can be changed with an environment variable (in Docker: `/data/history.json`) |

## What `confidence` means

`confidence` is the **fake probability** (0 to 1), not the confidence in the label. For example, `label: "real"` with `confidence: 0.04` means a 4% chance of being fake. The UI shows the probability of the winning label (`fake`: `confidence`; `real`: `1 - confidence`), so that example is displayed as "Real, 96%".

---

## GET /health

```json
{ "status": "ok", "models_loaded": true, "version": "0.1.0" }
```

- `status`: `"ok"` (all four models loaded), `"degraded"` (some loaded; the ensemble weights are adjusted automatically), or `"error"` (none loaded).
- `models_loaded`: `false` only when `status` is `"error"`.

## POST /detect

**Request:** `multipart/form-data` with a single `file` field.

**Validation order** (a failure at any step returns an error immediately):

1. The file is not empty and can be read.
2. The extension is `.jpg`, `.jpeg`, `.png`, or `.mp4`.
3. The size is within the limit for its type.
4. The declared MIME type matches (generic types such as `application/octet-stream` are accepted).
5. The content really is an image (JPEG/PNG) or an MP4 container.
6. At least one model is loaded.
7. The image can be decoded and a face is detected (for videos: at least one sampled frame contains a face).

**Response 200:**

```json
{
  "label": "fake",
  "confidence": 0.87,
  "per_model_scores": {
    "mesonet_1": 0.81,
    "mesonet_2": 0.79,
    "mesonet_3": 0.85,
    "xception": 0.90
  },
  "ela_score": 0.72,
  "blur_score": 0.15,
  "media_type": "image",
  "frames_analyzed": null,
  "processing_time_ms": 1240
}
```

| Field | Notes |
|---|---|
| `label` | `"real"` or `"fake"` |
| `confidence` | The ensemble's fake probability (weighted average) |
| `per_model_scores` | Each model's fake probability; `null` if that model is not loaded |
| `ela_score` | Error Level Analysis, 0 to 1; higher means more signs of manipulation |
| `blur_score` | 0 is sharp, 1 is very blurry |
| `media_type` | `"image"` or `"video"` |
| `frames_analyzed` | Number of frames with a face that were analysed (videos); `null` for images |
| `processing_time_ms` | Processing time in the backend |

For videos, `confidence`, `per_model_scores`, `ela_score`, and `blur_score` are averages over all analysed frames. Every successful detection is saved to history automatically as a `file_upload` entry.

### Error format

All errors have the same shape. The messages are currently written in Indonesian by the backend:

```json
{
  "error_code": "UNSUPPORTED_FORMAT",
  "message": "Format file tidak didukung",
  "detail": "Hanya menerima jpg, png, atau mp4 (diterima: '.gif')"
}
```

| `error_code` | HTTP | When it happens |
|---|---|---|
| `INVALID_FILE` | 400 | The file is empty, unreadable, too large, cannot be decoded, **or no face was detected** |
| `UNSUPPORTED_FORMAT` | 400 | The extension, MIME type, or content does not match |
| `MODEL_LOAD_FAILED` | 503 | No model is loaded, or every model failed during inference |
| `INTERNAL_ERROR` | 500 | An unexpected error during inference |

The Electron app passes these errors on to the UI as the text `ERROR_CODE: message`.

---

## WS /ws/live-scan

The connection stays open while a scan runs. The `source` query parameter defaults to `desktop_screen`; the backend does not validate its value yet (other sources, such as `mobile_camera`, do not exist yet). **One connection is one live scan session.**

### Server to client: `connected` (once, when the connection opens)

```json
{ "type": "connected", "session_id": "a1b2c3", "scan_interval_ms": 1000 }
```

### Client to server: `frame` (every interval)

```json
{
  "type": "frame",
  "sequence": 42,
  "timestamp": 1795000000000,
  "image": "<raw base64 JPEG>"
}
```

`image` is **raw** base64, without a `data:image/jpeg;base64,` prefix. `timestamp` is in milliseconds. The backend processes frames one at a time, so a client should send the next frame only after it has received the `result` for the previous one (the app does this).

### Server to client: `result` (one per frame)

```json
{
  "type": "result",
  "sequence": 42,
  "label": "fake",
  "confidence": 0.91,
  "alert": true,
  "face_detected": true,
  "per_model_scores": {
    "mesonet_1": 0.88,
    "mesonet_2": 0.85,
    "mesonet_3": 0.90,
    "xception": 0.94
  },
  "timestamp": 1795000000230
}
```

- `alert` is `true` when `confidence` is greater than `0.75`.
- A frame that cannot be analysed (no image, broken base64, a corrupt image, no face, or a failed inference) gets a **neutral** result: `label: "real"`, `confidence: 0.0`, `alert: false`, `face_detected: false`, and every `per_model_scores` value `null`. Clients must check `face_detected` and must not treat this as a genuine "real" result.

### Server to client: `history_update` (only when `alert` is `true`)

```json
{
  "type": "history_update",
  "entry": {
    "id": "h_003",
    "source": "desktop_screen",
    "label": "fake",
    "confidence": 0.91,
    "timestamp": 1795000000230,
    "frames_scanned": 12,
    "alert_count": 4
  }
}
```

`entry` is the summary of the current **session**, not of a single frame (see the history section below). The UI currently ignores this message and reloads the history list whenever the History tab is opened.

### Closing

When the connection ends (the client closes it or drops), the backend writes the session's final summary to history. If an unexpected server-side error occurs, the connection is closed with code `1011`.

---

## History

History is stored in a single JSON file. Ids look like `h_001`, `h_002`, and so on.

### GET /history

```json
{
  "entries": [
    {
      "id": "h_002",
      "source": "file_upload",
      "label": "real",
      "confidence": 0.04,
      "timestamp": 1795000010000,
      "frames_scanned": null,
      "alert_count": null
    },
    {
      "id": "h_003",
      "source": "desktop_screen",
      "label": "fake",
      "confidence": 0.91,
      "timestamp": 1795000000230,
      "frames_scanned": 12,
      "alert_count": 4
    }
  ]
}
```

The response is in storage order (oldest first); the UI sorts newest first.

There are two kinds of entries:

| | Upload entry | Live scan session entry |
|---|---|---|
| `source` | `file_upload` | `desktop_screen` |
| `label` / `confidence` | The file's detection result | `fake` if at least one frame raised an alert (otherwise `real`); `confidence` is the **highest fake score** across all frames |
| `timestamp` | When the detection happened | When the first analysed frame was captured |
| `frames_scanned`, `alert_count` | `null` | How many frames were analysed, and how many raised an alert |

A session entry is created when the first frame is successfully analysed (a session in which no face is ever found leaves no entry), updated at most every 5 seconds, and written once more when the session ends. If the entry is deleted while the scan is still running, the session stops writing to it.

### DELETE /history/{id}

`200`: `{ "deleted": true, "id": "h_002" }`. If the id does not exist, `404`: `{ "deleted": false, "detail": "..." }`.

### DELETE /history

`200`: `{ "deleted": <number of entries removed> }`.

---

## Security notes

- There is no authentication and CORS is open. Do not expose the backend port to untrusted networks; in the Docker development setup, binding the port to `127.0.0.1` is safer.
- History stores only labels, scores, sources, frame counts, and timestamps, never images or frames.
- See `SECURITY.md` in the repository root for the reporting policy.
