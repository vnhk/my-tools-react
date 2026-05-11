# my-tools-react

React + TypeScript frontend for the `my-tools` backend. Single-page application covering all tool modules: canvas, cook-book, ebook analysis, file storage, interview management, investments, language learning, pocket notes, project management, shopping stats, and spreadsheets.

## Tech Stack

| Tool | Version |
|------|---------|
| React | 18.3 |
| TypeScript | 5.6 |
| Vite | 5.4 |
| React Router | 7 |
| Recharts | 3 |
| Axios | 1.15 |
| hls.js | 1.6 |
| Playwright | 1.59 (E2E tests) |

## Running

```bash
npm install
npm run dev          # dev server on :5173, proxies /api → https://127.0.0.1:8091
npm run build        # type-check + production build → dist/
npm run preview      # preview the production build
```

## Tests

```bash
npm run test:e2e               # Playwright E2E tests
npm run test:e2e:ui            # Playwright with UI mode
npm run test:e2e:integration   # integration test suite
npm run test:integration       # full integration run (scripts/run-integration-tests.sh)
```

## Project Structure

```
src/
├── api/            # Axios API clients per module (client.ts, canvas.ts, investments.ts, …)
├── auth/           # JWT token handling, auth context
├── components/     # Shared UI components
│   ├── ui/         # Button, Badge, StatusBadge, CustomSelect, TextField, TextArea,
│   │               # InlineEditableField, Dialog, DynamicForm
│   ├── table/      # Reusable data table
│   ├── form/       # Form helpers
│   ├── fields/     # Field components
│   ├── layout/     # Page layout, navigation
│   └── ie/         # Import/Export helpers
├── hooks/          # Custom React hooks
├── pages/          # One folder per module
│   ├── canvas/
│   ├── cook-book/
│   ├── ebook/
│   ├── files/
│   ├── interview/
│   ├── invest-track/
│   ├── language-learning/
│   ├── pocket/
│   ├── projects/
│   ├── shopping/
│   ├── spreadsheet/
│   └── streaming-platform/
├── styles/
│   ├── variables.css   # CSS custom properties (--bervan-*)
│   ├── global.css
│   └── themes.css
├── types/          # Shared TypeScript types
└── utils/          # Utility functions
```

## Shared Components

All modules use the same shared components — never raw `<button>`/`<select>`/`<input>`:

`Button`, `Badge`, `StatusBadge`, `CustomSelect`, `TextField`, `TextArea`, `InlineEditableField`, `Dialog`, `DynamicForm`

`DynamicForm` fetches field metadata from `GET /api/config` (served by `common`'s entity config API) to auto-generate forms from backend YML definitions.

## Styling Rules

- All colors use CSS variables from `src/styles/variables.css` — never hardcode `rgb`/`hex` in `.module.css` files
- Variables follow the `--bervan-*` naming convention (`--bervan-text-primary`, `--bervan-surface-hover`, `--bervan-spacing-md`, etc.)
- If a needed variable doesn't exist, add it to `variables.css` first

## API Proxy

In development, Vite proxies `/api/*` to `https://127.0.0.1:8091` (the `my-tools-app` Spring Boot backend).

## Docker

```bash
docker build -t my-tools-react .
```

The `nginx.conf` is used in the production Docker image to serve the built assets.
