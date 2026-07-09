# Development Guide

This document describes how to add features to Research OS, where code belongs, and project conventions.

---

## 1. Architectural Layers

When adding a feature, place code in the correct layer:

```
frontend/
  src/
    api/        ← Typed fetch wrappers (thin functions, no logic)
    stores/     ← One Zustand store per domain
    pages/      ← Route-level React components
    components/ ← Shared UI components
    theme/      ← Tailwind tokens, colors, font stack

backend/
  app/
    routers/      ← FastAPI routers with DI, no business logic
    services/     ← Business logic, validation, orchestration
    repositories/ ← SQLAlchemy CRUD only
    models/       ← ORM classes (SQLAlchemy)
    schemas/      ← Pydantic request/response/domain models
    evaluation/   ← EvaluationEngine ABC + implementations
    waveform/     ← WaveformProvider ABC + concrete providers
    readers/      ← Dataset reader implementations
    config.py     ← Settings (workspace_root, database_url)
```

---

## 2. Adding a Feature

### 2.1 Adding a New Modality

1. **Schema**: Add modality string to `DatasetCreate` / `DatasetUpdate` in `schemas/dataset.py`.
2. **Model**: If modality-specific columns are needed, extend `Dataset` model.
3. **Reader**: Implement `DatasetReader` in `readers/new_modality_reader.py`.
4. **Service**: Add reader instance to `_READERS` dict in `DatasetService`.
5. **Frontend**: Update the Dataset creation form to include modality-specific fields.
6. **API**: No new endpoints needed unless the modality requires new operations.

### 2.2 Adding a New Waveform Provider

1. **Provider**: Implement `WaveformProvider` ABC in `waveform/new_provider.py`.
2. **Registry**: Register in `waveform/__init__.py`:
   ```python
   ProviderRegistry.register("new_format", NewProvider)
   ```
3. **Frontend**: Update `WaveformViewer.tsx` if the provider has unique display needs.

### 2.3 Adding a New Visualization

1. **Page**: Create `frontend/src/pages/NewPage.tsx` with routing in `App.tsx`.
2. **Store**: Add a Zustand store in `frontend/src/stores/NewStore.ts` if needed.
3. **API**: Add `frontend/src/api/new_api.ts` for fetch functions.
4. **Backend**: Add router, service, and repository if data fetching is needed.

### 2.4 Adding a New Investigation Tool

1. **Schema**: Extend `schemas/investigation.py` with new query/response types.
2. **Service**: Add method to `InvestigationService`.
3. **Router**: Add endpoint to `investigation/router.py`.
4. **API**: Add extraction in `frontend/src/api/investigation.ts`.
5. **UI**: Build investigation tool in `frontend/src/pages/Investigation.tsx`.

### 2.5 Adding a New SDK Capability (Platform-Side)

1. Define the output file contract (filename, schema).
2. Add detection logic in `OutputService.scan_output_directory()`.
3. Add output type handling in `OutputRepository`.
4. Add parsing, querying, or UI in a new or existing service/frontend page.

### 2.6 Adding a New Artifact Type

1. Update `OutputRepository.get_by_run_and_type()` to support the new type.
2. Extend `artifacts.json` parsing if the SDK writes new schema keys.
3. Add UI for the new artifact type in `RunDetail.tsx`.

### 2.7 Adding a New Evaluation Output Format

1. Create `evaluation/new_engine.py` implementing `EvaluationEngine` ABC.
2. Update `config.py` to point to the new engine class.
3. Service layer, routers, and frontend remain unchanged.

### 2.8 Adding a New Dataset Reader

1. Implement `DatasetReader` ABC in `readers/new_reader.py`.
2. Add instance to `_READERS` dict in `DatasetService`.
3. Update `DatasetCreate` schema if the modality has special registration fields.

---

## 3. Conventions

### 3.1 Python

- **Type hints required** on all function signatures.
- **Docstrings** required on all public classes and methods.
- Use `PEP 8` with `black` formatting.
- Use `pydantic` for data validation (schemas layer).
- Use `SQLAlchemy` ORM (models layer).
- Use `pandas` for tabular data operations (readers, evaluation, investigation).

### 3.2 TypeScript

- **Strict mode** enabled.
- All exported functions must have typed return types.
- No `any` types without a comment explaining why.

### 3.3 Frontend State

- One Zustand store per domain (`datasetStore`, `experimentStore`, `runStore`).
- Store interfaces define the public shape; internal state is private.
- Stores call API functions, not raw `fetch`.
- Each store handles its own loading and error states.

### 3.4 Error Handling

- Backend: raise `HTTPException` with appropriate status codes and detail messages.
- Frontend: catch errors in store actions and set `error` state.
- API client: surface `error.message` to the store.

### 3.5 Database

- Use SQLAlchemy `relationship` for foreign keys.
- Use `ondelete=CASCADE` for hierarchical data.
- Use `server_default=func.now()` for timestamps.
- Repository generic methods handle common CRUD; domain-specific queries extend the repository.

---

## 4. Testing

- Unit tests for services and specialists (Pytest).
- API tests for routers.
- Frontend tests for stores and components (Vitest + React Testing Library).
- Integration tests for the evaluation pipeline.

---

## 5. Common Tasks

### 5.1 Add a New API Endpoint

1. Create or update the router in `routers/`.
2. Create or update the service in `services/`.
3. Create or update the repository in `repositories/`.
4. Create or update the Pydantic schema in `schemas/`.
5. Add the typed fetch function in `frontend/src/api/`.
6. Wire into the relevant store and page.

### 5.2 Modify a Database Column

1. Update the SQLAlchemy model in `models/`.
2. Update the affected Pydantic schema in `schemas/`.
3. Update the service if business logic references the column.
4. Update the frontend store and page if the column is displayed.

---

## 6. Debugging Tips

### Backend

- Use `uvicorn --reload` for hot reloading during development.
- Log requests in `main.py` or router decorators.
- Use SQLAlchemy echo (`echo=True` in `create_engine`) to see generated SQL.
- Use `pdb` or `ipdb` for Python debugging.

### Frontend

- Use React DevTools to inspect store state.
- Use `console.error` sparingly; prefer the store's `error` field.
- Use network tab to inspect failed API calls.

### Filesystem / SDK

- Verify the workspace directory exists and is writable.
- Verify `evaluation.parquet` is a valid parquet file.
- Verify the dataset CSV is readable from the backend process.
