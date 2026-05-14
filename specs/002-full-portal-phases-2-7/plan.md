# Implementation Plan: Full InnovatEPAM Portal - Phases 2-7

**Branch:** `002-full-portal-phases-2-7`  
**Spec:** `specs/002-full-portal-phases-2-7/spec.md`  
**Status:** Complete  
**Date:** 2026-05-14

## Summary

Complete the InnovatEPAM Portal beyond the Phase 1 MVP by adding smart forms, multi-file attachments, draft management, multi-stage review, blind review, and scoring. Keep the project local-demo friendly while migrating authoritative persistence from browser storage to SQLite.

## Technical Context

- **Language:** JavaScript ES modules.
- **Frontend:** Plain HTML/CSS/JS SPA.
- **Backend:** Node.js built-in HTTP server.
- **Database:** SQLite through `better-sqlite3`.
- **Tests:** Node built-in test runner.
- **Runtime:** Local machine, `npm start`.
- **Database path:** `data/innovatepam.db`.

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| Local demo reliability | Pass | Runs locally, no hosted service required |
| SQLite source of truth | Pass | Users, ideas, attachments, drafts, review, scores stored in SQLite |
| Full phase traceability | Pass | README, PROJECT_SUMMARY, docs, ADRs, and specs cover phases 1-7 |
| Role-safe workflow | Pass | Admin/submitter restrictions enforced in API |
| Auditable decisions | Pass | History rows record submission, review, revision, terminal decisions |
| Test gates | Pass | `npm test` contains 59 tests |

## Project Structure Impact

```text
src/server/domain.js       # Categories, stages, score dimensions, validation
src/server/db.js           # SQLite schema, migrations, seeding
src/server/repository.js   # SQL access layer
src/server/api.js          # JSON API endpoints and role checks
src/api-client.js          # Frontend API wrapper
src/app.js                 # UI state, routes, rendering, forms
src/styles.css             # Visual styles
server.js                  # Static + API server
tests/api.test.mjs         # API integration tests
tests/portal-core.test.mjs # Domain tests
docs/adr/                  # Architecture decisions
docs/prd.md                # Product requirements
docs/stories.md            # User stories
```

## Phase Plan

### Phase 2 - Smart Submission Forms

- Add `CATEGORY_FIELDS` in domain layer.
- Add `GET /api/categories`.
- Render dynamic fields in frontend.
- Validate required fields.
- Store and display `extra_fields`.

### Phase 3 - Multi-Media Support

- Add `attachments` table.
- Accept attachment arrays in idea create/update flows.
- Enforce count and size constraints.
- Add blob download endpoint.
- Preserve legacy single-attachment route.

### Phase 4 - Draft Management

- Represent drafts with `status = 'draft'` in `ideas`.
- Add draft CRUD API.
- Add lenient draft validation.
- Add full validation when submitting draft.
- Hide drafts from admin and normal idea lists.

### Phase 5 - Multi-Stage Review

- Add `STAGES` domain constant.
- Add `current_stage`, `revision_requested`, and `revision_from_stage` fields.
- Add stage action endpoint.
- Add revision flow.
- Add stage-aware history.

### Phase 6 - Blind Review

- Add `blind_review` field.
- Add blind-review toggle endpoint.
- Anonymize author identity during active review.
- Reveal identity after terminal decision.
- Lock toggle after review starts.

### Phase 7 - Scoring System

- Add `SCORE_DIMENSIONS` domain constant.
- Add `scores` table.
- Add score write/read endpoints.
- Validate dimensions and 1-5 values.
- Calculate per-dimension averages and composite score.
- Restrict score visibility to admins.

## Data Model Summary

- `users`: account and role data.
- `sessions`: login session token mapping.
- `ideas`: core idea and draft records.
- `attachments`: multi-file metadata/blob rows.
- `idea_history`: audit trail and stage transitions.
- `scores`: evaluator score data.

Full details: `data-model.md`.

## API Contract

Full details: `contracts/api-contract.md`.

## Testing Strategy

Run:

```powershell
npm test
npm run smoke:edge
```

Test coverage targets:

- Authentication and sessions.
- Submitter/admin role boundaries.
- Category-specific fields.
- Attachment constraints.
- Draft behavior.
- Multi-stage review.
- Revision loop.
- Blind review identity masking.
- Scoring validation and visibility.
- Demo reset behavior.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Native dependency install issue | Document `npm install`; use local Node environment |
| Documentation drift | Update README, PRD, stories, ADRs, summary, and specs together |
| Attachment payload size | Enforce 5 files and 8 MB total |
| Role boundary mistakes | Server-side checks and API tests |
| Review state confusion | Explicit `status`, `current_stage`, and history model |

## Completion Evidence

- 7 phase checklist in `PROJECT_SUMMARY.md`.
- Updated feature list in `README.md`.
- ADRs 0001-0006.
- 59 automated tests.
- Full SpecKit artifacts in this directory.