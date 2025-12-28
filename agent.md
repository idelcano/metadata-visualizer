# Agent Guide

Use this guide when extending the DHIS2 metadata visualizer.

## Non-negotiables

1) Use the DHIS2 app runtime data engine for all API access.
2) Never expose credentials or tokens in the UI or config.
3) Do not store secrets in `VITE_` env vars; use non-exposed vars like `DHIS2_AUTH` for dev proxy only.
4) Keep Clean Architecture boundaries:
   - Domain has no framework/HTTP dependencies.
   - Application orchestrates use cases only.
   - Infrastructure wraps DHIS2 data engine.
   - Presentation is React UI and state.
4) Avoid metadata explosions:
   - Always use fields projections.
   - Use paging for lists.
   - Lazy-load category option combos.

## Where to change things

- Resource types allow-list: `src/domain/metadata/ResourceType.ts`
- Default fields: `src/webapp/pages/metadata/MetadataExplorerPage.tsx`
- Graph rules: `src/application/metadata/BuildMetadataGraphUseCase.ts`
- Lazy COC loading: `src/application/metadata/ListCategoryOptionCombosUseCase.ts`
- UI graph rendering: `src/webapp/components/metadata/MetadataGraphView.tsx`
- Composition root wiring: `src/CompositionRoot.ts`

## Adding a new DHIS2 resource type

1) Add it to `resourceTypes` and `resourceTypeLabels`.
2) Add a sensible default `fields` projection.
3) Extend graph logic in `BuildMetadataGraphUseCase`:
   - Define parent/child relationships.
   - Keep large collections lazy.
4) Update any UI labels or helper text as needed.

## DHIS2 specifics (2.41)

- Use plural resources (`dataElements`, `categories`, etc).
- Use `fields` and `filter` params.
- Use `page` + `pageSize` for paging.
- Prefer `displayName`, fallback to `name` or `id`.

## Identicons

- Seed format: `<resourceType>:<uid>:v1`
- SHA-256 + symmetric SVG grid.
- Generation lives in `src/domain/metadata/Identicon.ts`.

## Design and UX

- Favor correctness over visual polish.
- Keep layouts simple and readable.
- Show clear errors without leaking sensitive data.
