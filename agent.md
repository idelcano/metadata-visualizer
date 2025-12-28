# Agent Guide

This repo is a DHIS2 2.41 metadata visual explorer (web + server). Follow these rules strictly.

## Non-negotiables

1) **Never expose DHIS2 PAT/token to the browser.**
2) The browser must call ONLY our server. No direct DHIS2 calls.
3) Validate resource type strictly (allow-list).
4) Prevent API explosions:
   - enforce max pageSize
   - use lazy expansion for categoryOptionCombos
5) Keep Clean Architecture boundaries:
   - Domain has no HTTP/cache/framework imports.
   - Application depends on ports/interfaces.
   - Infrastructure provides implementations.
   - Presentation is routing + DTOs only.

## Repo layout

- `apps/server` = Node/Express TypeScript server (DHIS2 proxy + graph)
- `apps/web` = Vite + React TypeScript UI

## Environment variables

Server requires:
- `DHIS2_BASE_URL`
- `DHIS2_PAT`
- `CACHE_TTL_SECONDS`
- `HTTP_TIMEOUT_MS`
- optional: `ALLOW_INSECURE_SSL=false`

Web may read only safe config from server `/config`.

Do not add env vars that contain secrets to the web package.

## Commands (examples)

- Install deps (monorepo):
  - `npm install`
- Run dev:
  - `npm run dev`
- Build:
  - `npm run build`
- Lint/test (if present):
  - `npm run lint`
  - `npm run test`

(Keep commands single-line.)

## DHIS2 API usage (2.41)

- Use `/api/<resource>` endpoints.
- Use `fields=` for projection.
- Use `filter=` for filtering.
- Use paging with `paging=true&page=1&pageSize=50` when listing.
- Use `/api/me` for connection testing.

Prefer `displayName` if available; otherwise fallback to `name`.

## Fields and filters safety

- `fields` must be sanitized:
  - allow only `[A-Za-z0-9_.,:\\[\\]()]` and commas
  - reject anything else
- `filter` should be constructed from a structured builder if possible.
  - If accepting raw filter strings, reject dangerous characters and enforce a max length.
- Enforce max `pageSize` (e.g., 200).

## Graph rules (relationship map)

Graph must be readable and bounded.

Default expansions:
- dataElement:
  - categoryCombo (direct)
  - categories (via categoryCombo)
  - categoryOptions (via categories)
- categoryCombo:
  - categories
  - categoryOptionCombos should be LAZY and paged
- category:
  - categoryOptions
- categoryOptionCombo:
  - categoryCombo, and optionally categoryOptions (only if requested)

COC explosion rule:
- Never fetch all COCs by default.
- Provide count + paged expansion endpoint with filters.

## Identicon / Avatar

- Deterministic per uid:
  - seed = `<type>:<uid>:v1`
  - hash = SHA-256(seed)
- Generate SVG identicon (5x5 or 7x7 symmetric grid).
- Derive:
  - foreground color from hash (HSL)
  - background with strong contrast
  - stable `nodeColor` for graphs

Never store avatars as files unless explicitly added later.

## Extending the app

When adding a new DHIS2 resource type:
1) Add to `ResourceType` allow-list.
2) Add field presets in the web query builder.
3) Add graph relationship resolver rules.
4) Add at least one smoke flow:
   - list -> select -> graph -> expand (if applicable)

## Error handling UX

- Show user-safe errors in UI (no tokens, no internal stack traces).
- Map common DHIS2 errors:
  - 401/403 => “Authentication/permission issue”
  - 404 => “Not found”
  - 500/timeouts => “DHIS2 unreachable / timeout”
- Include request correlation id in server logs (optional).

## Performance notes

- Always request only needed fields.
- Cache list and details briefly to reduce load on DHIS2.
- Avoid N+1 calls: prefer richer `fields=` for detail calls, and load heavy neighbors lazily.

## Coding standards

- TypeScript strict where possible.
- Small functions, clear naming.
- No hidden side effects in Domain.
- Keep modules testable.
