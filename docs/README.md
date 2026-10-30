# Xeptocore Documentation

Design documents for the project. The main README in the repository root is the best place to start; these documents go deeper.

| Document | Contents |
|---|---|
| [`BRD.md`](BRD.md) | Background, goals, scope, business requirements, and their status |
| [`FLOW_DIAGRAM.md`](FLOW_DIAGRAM.md) | User flows, the window structure, and the list of screens with their status |
| [`design-system.md`](design-system.md) | Design tokens, components, icons, and accessibility |
| [`TECHNICAL_DESIGN.md`](TECHNICAL_DESIGN.md) | Architecture, technology, the detection engine, deployment, sequence and activity diagrams, decisions that changed, and technical debt |
| [`API_CONTRACT.md`](API_CONTRACT.md) | The REST and WebSocket contract, matching the backend implementation |

## Document status

These documents are synchronised with the code: the backend (`backend/app/main.py`, `detector.py`, `history.py`, `live_session.py`, `scoring.py`, `face_utils.py`) and the frontend (`frontend/src/main`, `frontend/src/renderer`). If a document and the code disagree, **the code is right** and the document needs fixing. Decisions that changed during implementation are recorded in the "Differences from the original plan" section of `TECHNICAL_DESIGN.md`.
