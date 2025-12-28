You are Codex acting as a senior full-stack engineer. Build a new project from scratch: a DHIS2 2.41 metadata visual explorer specialized in:
- categories
- categoryCombos
- categoryOptions
- categoryOptionCombos
- dataElements

Goal:
A web app that lets the user:
1) Choose a resource type (from the list above).
2) Configure query: fields (projection) + filters (DHIS2 filter params) + paging.
3) Fetch data from DHIS2 2.41 via a secure server-side proxy (never expose DHIS2 token to the browser).
4) Render results in a table. Each row shows:
   - an identicon avatar generated deterministically from the UID (DHIS2 id)
   - displayName
   - id
   - additional selected fields
5) Clicking an item opens a "Relationship Map" view (graph) similar to phpMyAdmin foreign-key diagram:
   - Center node = selected item (with same avatar and consistent color derived from UID).
   - Expand to show its parent/child relationships, tailored per resource type.
   - Must avoid "explosion" for categoryOptionCombos: load COCs lazily with paging and filters.

DHIS2 2.41 assumptions:
- Use /api endpoints, resources plural.
- Objects have "id" as UID, and commonly "displayName".
- Use fields=... and filter=... query params.
- Use paging=true&page=1&pageSize=... or paging=false where appropriate.
- Use /api/me for connection testing.

Tech stack requirements:
- Monorepo with two packages: /apps/web (React) and /apps/server (Node/Express).
- Typescript everywhere.
- Web uses Vite + React + minimal UI (no heavy frameworks required).
- Server uses Express, with environment variables for DHIS2_BASE_URL and DHIS2_PAT.
- Implement caching server-side:
  - API responses cache: in-memory LRU with TTL configurable.
  - Identicons: generated on the fly (SVG) without caching files (optional memoization).
- Clean Architecture:
  - Domain: entities and value objects (UID, ResourceType, Graph model)
  - Application: use cases (ListResourceItems, GetResourceItemDetails, GetResourceGraph)
  - Infrastructure: DHIS2 API client, cache adapter
  - Presentation: Express controllers + React UI

Features:
- UI:
  - Left panel: Resource selector + Query builder.
  - Query builder supports:
    - Fields: multi-select presets per resource type ("Minimal", "Relations", "Debug") + custom comma-separated.
    - Filters: repeatable rows: <property> <operator> <value> producing DHIS2 filter params.
    - Paging: page size, page number.
    - Search box that maps to a default filter on displayName (ilike) if user chooses.
  - Main area: Results table with columns.
  - Right drawer/modal: Item details + Relationship graph.
- Graph view:
  - Use a simple HTML/SVG renderer (no heavy graph libs required) OR a lightweight library if needed.
  - Must support "expand" actions:
    - Expand categories -> categoryOptions
    - Expand categoryCombo -> categories
    - Expand dataElement -> categoryCombo
    - Expand categoryCombo -> COCs (lazy, paged)
  - Show relationship direction and labels.
  - Keep graph readable (limit nodes; show counts; "load more" buttons).

API endpoints (server):
- GET /health
- GET /config (safe config needed by web; NEVER send token)
- GET /dhis2/list?type=...&fields=...&filter=...&page=...&pageSize=...&paging=true|false
- GET /dhis2/item/:type/:id?fields=...
- GET /dhis2/graph/:type/:id (returns a normalized graph model with nodes and edges, plus paging info for expandable edges like COCs)

Avatar:
- Deterministic identicon SVG derived from SHA-256 of "<type>:<uid>:v1"
- 5x5 or 7x7 symmetric grid pattern
- foreground color derived from hash (HSL) with strong contrast background
- Same uid -> same image; different uids -> visually distinct with extremely low collision probability.
- Also derive a stable "nodeColor" from the hash for graph nodes.

Deliverables:
- Full project scaffold with README and instructions.
- Create ARCHITECTURE.md explaining Clean Architecture decisions and module boundaries.
- Create AGENT.md with instructions for future contributors/agents (coding standards, commands, how to add new DHIS2 resource types, how to handle DHIS2 fields/filters safely, how to extend graph resolvers, caching rules, security rules).
- Provide example .env.example for server and web.
- Implement at least:
  - Listing for one resource (dataElements) with fields/filter/paging
  - Details for one item
  - Graph resolver for dataElements -> categoryCombo -> categories (and category -> categoryOptions)
  - Lazy COC expansion endpoint for a given categoryCombo (paged)
- Add basic error handling and user-visible messages.

Constraints:
- Do not hardcode token in client.
- Always validate resource types and sanitize fields/filter inputs server-side.
- Keep it simple but complete enough to run locally.

Now generate:
1) Repo structure
2) Package manifests
3) Core code files for server and web
4) The two docs ARCHITECTURE.md and AGENT.md
5) README with run commands

Make sure all code compiles.
