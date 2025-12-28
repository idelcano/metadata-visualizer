# Architecture

This app is a DHIS2 2.41 metadata visualization app focused on categories, category combos, category options, category option combos, and data elements. It follows Clean Architecture to keep domain rules independent from the DHIS2 runtime, while keeping the UI thin and testable.

## Layers and directories

- Domain (`src/domain`)
  - Core metadata types and rules: `ResourceType`, `MetadataItem`, graph model, identicon generation.
  - Repository interfaces that describe the data the app needs (no DHIS2 or React imports).
- Application (`src/application`)
  - Use cases orchestrating domain logic:
    - `ListMetadataUseCase`
    - `BuildMetadataGraphUseCase`
    - `ListCategoryOptionCombosUseCase`
    - `GetCurrentUserUseCase`
    - `GetUiLocaleUseCase`
- Infrastructure (`src/data`)
  - DHIS2 implementations of repositories using `@dhis2/app-runtime` `DataEngine`.
  - Async helpers (`promiseToFuture`) to map DHIS2 requests into domain-friendly `Future`.
- Presentation (`src/webapp`)
  - React components for query builder, table, identicons, and relationship graph.
  - Orchestration for user interactions and visual state only.

## Data flow

1. User configures a query in the UI (`MetadataQueryBuilder`).
2. `ListMetadataUseCase` calls `MetadataDhis2Repository`, which uses the DHIS2 data engine (no direct fetch).
3. Results render in `MetadataTable` with identicons derived from SHA-256.
4. Clicking a row invokes `BuildMetadataGraphUseCase` to build a normalized graph model.
5. Category option combos are loaded lazily via `ListCategoryOptionCombosUseCase` and injected into the graph view.

## Identicons

Identicons are deterministic SVGs generated from:

```
<resourceType>:<uid>:v1
```

The seed is hashed with SHA-256, then rendered as a symmetric grid. The implementation lives in `src/domain/metadata/Identicon.ts` and is used from the presentation layer only.

## Relationship graph

The graph model (`MetadataGraph`) is a normalized list of nodes, edges, and groups:

- Center node = selected item.
- Parent/child groups determine layout.
- Lazy category option combos are appended at render time to avoid API explosion.

The renderer is a lightweight HTML/SVG layout in `src/webapp/components/metadata/MetadataGraphView.tsx`.

## Extending the app

- Add new resource types in `src/domain/metadata/ResourceType.ts`.
- Add default fields in `src/webapp/pages/metadata/MetadataExplorerPage.tsx`.
- Extend graph logic in `src/application/metadata/BuildMetadataGraphUseCase.ts`.
- Add lazy loaders if a relationship can grow large.
