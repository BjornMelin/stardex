# Repository Guidelines

## Project Structure

- `frontend/`: Next.js (App Router) UI.
  - `frontend/app/`: routes + page/layout components
  - `frontend/components/`: shared UI components (shadcn/ui-style)
  - `frontend/lib/`: client utilities (API calls, schemas)
  - `frontend/hooks/`, `frontend/store/`: state + hooks
- `backend/`: FastAPI service.
  - `backend/app/`: API (`app/main.py`), models, clustering logic
  - `backend/tests/`: pytest tests (e.g. `test_*.py`)

## Build, Test, and Development Commands

Run from repo root:

- `pnpm install`: install workspace deps.
- `pnpm dev`: run backend (`:8000`) + frontend dev server concurrently.
- `pnpm build`: compile backend (`python -m compileall`) + build frontend.
- `pnpm test`: run `pytest` (backend) + `vitest run` (frontend).
- `pnpm typecheck`: run `pyright` (backend) + `tsc --noEmit`.
- `pnpm lint`: run frontend ESLint.
- `pnpm biome`: run frontend Biome checks (format/lint).

## Coding Style & Naming Conventions

- Frontend: TypeScript/React with Biome formatting (run `pnpm -C frontend biome:format`) and ESLint. Use `PascalCase` for components and `kebab-case` for routes/segments under `frontend/app/` as needed.
- Backend: Python 3.11+ with Ruff + Pyright (run `cd backend && uv run ruff format` and `cd backend && uv run ruff check`). Prefer explicit types; keep Pyright clean (`pnpm typecheck:backend`).

## Testing Guidelines

- Frontend: Vitest. Prefer `*.test.ts(x)` near the module (example: `frontend/lib/github.test.ts`).
- Backend: pytest. Place tests in `backend/tests/` and name files `test_*.py`.

## Commit & Pull Request Guidelines

- Commits follow Conventional Commits: `type(scope): summary` (examples seen in history: `feat(frontend): …`, `refactor(backend): …`, `chore(deps): …`).
- PRs: include a short problem statement, key changes, and verification steps. Add screenshots/GIFs for UI changes; note API contract changes and any required env vars.

## Configuration & Secrets

- Local env: use `frontend/.env.local` (e.g. `NEXT_PUBLIC_API_URL=http://localhost:8000`). Do not commit `.env*`.
- Avoid putting secrets in `NEXT_PUBLIC_*` variables (they are exposed to the browser).
