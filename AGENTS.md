
# AGENTS — quick guide for AI coding agents

Purpose: provide concise, actionable guidance so an AI coding agent can be immediately productive in this repository.

1) Architecture — big picture
- Frontend: React + TypeScript + Vite. App entry: `src/main.tsx` → `src/App.tsx`.
- Backend API: all requests are sent to the `/api` prefix (see Axios client: `src/api/client.ts`).
- Dynamic forms and metadata: entity field configuration is served by the backend at `GET /api/config` and cached in `src/api/entityConfig.ts`.

2) Key files / places to edit
- `src/api/` — Axios clients per module (e.g. `canvas.ts`, `investments.ts`). Pay attention to `client.ts` (auth interceptor + paramsSerializer).
- `src/components/ui/DynamicForm.tsx` — form generator driven by entity config (fields: `strValues`, `intValues`, `dynamicStrValues`, `wysiwyg`, `dataType`, `min`/`max`).
- `src/auth/AuthContext.tsx` — auth flow: token stored in `localStorage['token']`, `me()` is fetched on startup, logout clears token.
- `src/styles/variables.css` — canonical CSS variables (colors, spacing, radii) — use these instead of hardcoded colors.

3) Project-specific conventions and patterns
- Never use raw HTML inputs/buttons directly; use shared UI components in `src/components/ui/` (`Button`, `TextField`, `SelectField`, `Dialog`, `DynamicForm`, etc.).
- Entity-config is fetched once and cached at module level (`src/api/entityConfig.ts`). Components depend on that cache; `getEntityConfigs()` is prefetched in `src/main.tsx`.
- Axios `paramsSerializer` removes empty/undefined values and serializes arrays as repeated query params — construct requests accordingly.
- Auth: token in `localStorage`; `src/api/client.ts` attaches `Authorization: Bearer <token>` and on 401 removes token and redirects to `/login`.

4) Build / run / test — concrete commands
- Dev: `npm install && npm run dev` (Vite dev server, default proxy `/api` → `https://127.0.0.1:8091`, see `vite.config.ts`).
- Production build: `npm run build` (runs `tsc -b` before `vite build`).
- Preview: `npm run preview`.
- Playwright e2e: `npm run test:e2e` (uses `playwright.config.ts`, which starts `npm run dev` via `webServer`). For interactive mode: `npm run test:e2e:ui`.
- Integration tests (frontend + backend): `npm run test:integration` — wrapper `scripts/run-integration-tests.sh`:
  - Requires: Docker, Maven, and a built backend (`../my-tools` built via `mvn install -DskipTests`).
  - Script starts Vite with `vite.integration.config.ts` (proxy → `http://localhost:9091`) and then runs Maven tests which start the backend with TestContainers.

5) Proxy / environments — differences between dev and integration
- `vite.config.ts` (dev) proxies `/api` → `https://127.0.0.1:8091` (HTTPS local backend).
- `vite.integration.config.ts` (integration) proxies `/api` → `http://localhost:9091` (HTTP test backend). Used by `npm run dev:integration` and `scripts/run-integration-tests.sh`.

6) Debug / troubleshooting hints (where to look)
- Strange query params? Inspect `src/api/client.ts` — `paramsSerializer` strips empty values and expands arrays to multiple params.
- Forms missing fields? Ensure `GET /api/config` returned data and cache in `src/api/entityConfig.ts` is populated; `src/main.tsx` prefetched it.
- 401 behavior: interceptor clears `token` and redirects to `/login` (see `src/api/client.ts`).

7) Notes about inconsistencies
- The `README.md` mentions variables with prefix `--bervan-*`, but `src/styles/variables.css` actually uses `--color-*`, `--space-*`, etc. Trust `src/styles/variables.css` as the source of truth.

8) Quick copy-paste examples
- Read table columns: `import { getTableColumns } from 'src/api/entityConfig'; getTableColumns('Project')`.
- Call API with auth attached: `import client from 'src/api/client'; await client.get('/projects')`.

If desired, I can expand this file with: a local backend startup checklist, an ASCII flow diagram (frontend → backend → tests), or Playwright debugging notes.

