# Security Policy

## Supported versions

Xeptocore has not had a stable release yet. Only the latest commit on the `main` branch receives security fixes. This section will list supported versions once versioned releases exist.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's private vulnerability reporting instead: go to the repository's **Security** tab and choose **Report a vulnerability**, or open
[github.com/edgararya/Xeptocore/security/advisories/new](https://github.com/edgararya/Xeptocore/security/advisories/new).

<!-- Optional: add a contact email here if you want a second channel. -->

A useful report includes:

- what the problem is and which component it affects (backend API, Electron app, Docker setup, and so on),
- steps to reproduce it,
- the impact you expect (for example, reading history data, running code, or crashing the backend),
- logs or a proof of concept, if you have them.
  Please do not include images or videos of real people in a report. Use your own face or synthetic content.

### What to expect

This is a one-person project, so these are best-effort goals rather than guarantees:

- an acknowledgement within about 7 days,
- an assessment of the report and, if it is valid, a fix on `main`,
- credit in the fix notes if you want it.

## Scope

**In scope**

- The backend API (REST and WebSocket), including how it handles uploaded files and malformed input.
- The Electron app: the main process, the preload bridge and IPC handlers, screen capture, and the tray and widget windows.
- Local storage of detection history.
- The Docker configuration in this repository.
  **Out of scope**

- Detection accuracy: a wrong verdict, a missed deepfake, or a false alarm is not a security vulnerability. Please open a regular issue. Research on evading the models is welcome as an issue or discussion.
- Vulnerabilities in third-party dependencies that have no demonstrated impact on Xeptocore (report those upstream).
- Attacks that require an already compromised machine or physical access.

## Known limitations of the development setup

- The backend has **no authentication**, and the development Docker setup publishes port `8000`. Treat it as a local-only service: do not expose that port to untrusted networks. A packaged version of the app is planned; until then, this limitation applies.

## How your data is handled

- All analysis runs locally; nothing is sent to a cloud service.
- Live scan screenshots are analysed in memory and are not saved by the app.
- The history file (`history.json`) stores only the verdict label, scores, source, frame counts, and timestamps. It never stores images or frames.