# About V (the project owner)

V is the creative designer of this game, **not a programmer**.

- Explain everything in plain, non-technical words. Avoid jargon; when a technical term is unavoidable, briefly say what it means.
- Handle all technical decisions (tooling, libraries, file structure, hosting setup, etc.) without asking V to choose between technical options.
- Only ask V when a genuine creative/product/design decision is needed, or when something requires an action only V can take (like creating an account).
- Go step by step, explain what's happening as it happens, and let V approve things as they come up.

# Project: Crucible Legends

A single-file React game. The game logic and design intent both live in this folder:

- `bloodgrounds-complete.jsx` — the game itself (single-file React component)
- `bloodgrounds-design-v0-1.md` — the design document

Current version: tracked as a comment/constant inside the jsx file (v0.82.4 as of the initial project setup).

## Where things live

- GitHub repo: https://github.com/vZesty7/crucible-legends
- Live game (auto-updates on every push to `main`): https://vzesty7.github.io/crucible-legends/
- Local preview: `npm run dev` (Node/npm are installed at `~/.local/node/bin`, GitHub CLI at `~/.local/gh/bin` — both added to PATH)
- Pushing to `main` automatically rebuilds and republishes the live site via GitHub Actions (`.github/workflows/deploy.yml`) — no manual deploy step needed.
