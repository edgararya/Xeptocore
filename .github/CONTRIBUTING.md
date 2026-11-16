# Contributing to Xeptocore

Thanks for your interest in Xeptocore! It is a personal project built in the open, so contributions are welcome and reviewed on a best-effort basis. Issues and pull requests can be written in English or Bahasa Indonesia.

## Ways to help

- **Report a bug.** Include your OS, how you ran the backend (Docker or otherwise), what you did, what you expected, and what happened. Logs and error messages help a lot.
- **Suggest an improvement.** Open an issue and describe the problem you want solved, not only the solution.
- **Pick up a roadmap item.** The [roadmap in the README](README.md#roadmap) lists what is planned. Comment on the issue (or open one) before you start, so work is not duplicated.
- **Improve the docs.** Typos, unclear steps, and missing explanations are all fair game.

## Before you start

- Open an issue **before** large changes: new features, refactors, or anything that touches the architecture.
- Small fixes (typos, docs, obvious bugs) can go straight to a pull request.
- Security problems are different: do not open a public issue. See [SECURITY.md](SECURITY.md).

## Development setup

The full steps are in [Getting started](README.md#getting-started). In short:

```bash
# Backend (needs the model weights in backend/weights/)
docker compose up -d --build

# App
cd frontend
npm install
# PowerShell
$env:XEPTOCORE_BACKEND_PORT = 8000; npm run dev
```

Without the weights, `/detect` returns an error, but you can still work on the UI, the history, and anything else that does not need inference.

## Workflow

1. Fork the repository and create a branch from `main`. Name it `issue-<number>-<short-description>`, for example `issue-17-live-scan-history`.
2. Keep each pull request small and focused on one concern.
3. Write the pull request description so a reviewer can follow it: what changed, why, and how you verified it. Link the issue with `Closes #<number>`.
4. Write commit messages in the imperative, for example "Add clear-all button to history".

### Verification

There is no automated test suite yet, so please describe how you checked your change by hand (what you ran, clicked, or sent to the API). If your change contains logic that can be unit-tested, add tests. A pull request that introduces a test setup or CI is especially welcome.

## Code style

Match the style of the file you are editing. In particular:

- **JavaScript.** 2-space indentation, single quotes, semicolons. The Electron main process (`frontend/src/main`) uses CommonJS (`require`); the React renderer (`frontend/src/renderer`) uses ES modules.
- **Python.** 4-space indentation, and type hints where the surrounding code uses them.

### Architecture conventions

- Renderer **components** do not call `window.api` directly. Hooks in `frontend/src/renderer/hooks` own the IPC calls and the loading and error state.
- Renderer code never imports `electron` or `ipcRenderer`. Everything it can do is exposed, explicitly and minimally, through `frontend/src/main/preload.js`.
- Colors come from the semantic tokens in `tailwind.config.js` (`brand`, `safe`, `warning`, `danger`, and so on), and a status is never shown by color alone: pair it with text or an icon.

## Privacy and data rules

Xeptocore deals with people's faces, so these rules matter:

- **Do not commit, attach, or post images, videos, or frames of real people** unless you have their explicit permission. This applies to pull requests, issues, screenshots, and GIFs. Use your own face, or blur or crop everyone else out. Screenshots of results do not need faces at all.
- **Do not commit datasets, model weights, or history files.** `weights/`, `*.h5`, `data/`, and `testing/` are already git-ignored; keep it that way.
- Do not post material from research datasets whose licenses forbid redistribution.

## License

By contributing, you agree that your contributions are licensed under the project's license (see [LICENSE](LICENSE)).

## Conduct

Be respectful and assume good faith. Harassment and personal attacks are not tolerated.
