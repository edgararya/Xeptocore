# Business Requirement Document (BRD)

## Xeptocore: A Desktop App for Deepfake Detection

**Version:** 0.2 (synchronised with the implementation)
**Author:** Gede Edgar Arya Saputra

This document describes the business and user requirements. The technical design is in [`TECHNICAL_DESIGN.md`](TECHNICAL_DESIGN.md); the **Status** columns below show how far the current implementation meets each requirement.

---

## 1. Background

Deepfake content is getting easier to make thanks to generative AI, and it is increasingly misused for disinformation, fraud (for example, fake video calls used for financial scams), and defamation. Most existing deepfake detection tools have two main limitations:

1. They are cloud or web based, so users must upload their content to a third-party server and depend on an internet connection.
2. They can only check a file after the fact, not warn the user while the content is on their screen.

Xeptocore is built as a desktop app that runs locally on the user's machine, with two modes: analysing an uploaded file, and watching the screen periodically with automatic alerts.

## 2. Business goals

- Provide a deepfake detection tool that is used directly on the desktop, without relying on third-party cloud services.
- Give an early warning when the user is watching or receiving content that may be a deepfake on their screen.
- Show how an ensemble of machine learning models (three MesoNet variants and XceptionNet) can be applied in a usable product, not just a research notebook.
- Serve as a portfolio piece that shows end-to-end ability: models, system design, backend, and a desktop app.

## 3. Scope

### In scope

- Deepfake detection for uploaded image files (JPEG, PNG) and video files (MP4).
- Live scan of the primary display, with an automatic alert when a deepfake is suspected.
- A locally stored history of detection results: one entry per uploaded file, and one summary per live scan session.

### Out of scope (planned for later phases)

- A mobile version.
- Deepfake detection for audio or voice.
- Analysis from a camera/webcam (this version only captures the screen).
- Account or cross-device history sync.
- A one-click installer (today the app runs in a development setup with Docker).

## 4. Stakeholders

| Stakeholder | Interest |
|---|---|
| End users | Verifying the authenticity of visual content they receive or see (video calls, circulating videos, images on social media) |
| Developer (Edgar) | Building, maintaining, and demonstrating this project |
| Portfolio readers (recruiters, open-source contributors) | Judging the software engineering quality and ML application of this project |

## 5. Business requirements

| # | Requirement | Status |
|---|---|---|
| 1 | Analyse an uploaded file and give a clear label (real or deepfake) with a confidence level | Met |
| 2 | Watch the screen continuously and alert automatically when a deepfake is suspected, without the user triggering a manual check each time | Met (a single alert level) |
| 3 | Store a history of detection results so users can review earlier ones | Met (a summary; no per-model detail) |
| 4 | Keep the interface responsive while analysis runs | Partly: the interface does not freeze, but the backend processes one frame at a time and holds up other requests while it does |
| 5 | Be extendable to a mobile platform without a major architecture overhaul | Not tested: input sources are already separated (`source`), but there is no mobile client |

## 6. Assumptions and constraints

- The models run entirely locally; nothing is processed on a cloud server.
- The model accuracy target is 87 to 90%. This is still a **target**; measured results on a labelled test set have not been published. Detection results are probabilistic indications, not conclusive proof.
- The models analyse **faces**. Content without a visible face, fully synthetic scenes, and audio are not analysed.
- Live scan takes one screenshot per second from the primary display (not every frame), because of the inference speed limits of consumer hardware.
- Currently only tested on Windows.

## 7. Success criteria

| Criterion | Status |
|---|---|
| At least 87% accuracy on test data | Not measured yet |
| Live scan returns a result every interval without freezing the interface | Works in manual testing |
| Image detection takes less than a few seconds | Not measured systematically (the `/detect` response already includes `processing_time_ms` for this purpose) |
| The app can be packaged into an installer that installs without setting up a Python environment by hand | Not yet |

## 8. Risks

| Risk | Mitigation | Status |
|---|---|---|
| False positives/negatives can mislead if the results are trusted blindly | Show the confidence, use neutral language, and state the limitations in the README | Applied |
| A permissive face detector can give a verdict on objects that are not faces | Tighten or replace the face detector | Not yet |
| A large installer because of TensorFlow | Consider migrating to TFLite or ONNX Runtime | Not yet |
| Live scan is heavy on low-spec laptops | Make the scan interval adjustable (today it is fixed at 1 second by the backend) | Not yet |
| Test data and screenshots contain other people's faces | The privacy rules in `CONTRIBUTING.md`: no images of people without permission in the repository, issues, or screenshots | Applied |

---

*This document is updated as the project evolves.*
