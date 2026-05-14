# InnovatEPAM Portal Engineering Constitution

## Purpose

This constitution defines the engineering rules used to keep the InnovatEPAM Portal implementation, documentation, and tests aligned with the completed 7-phase course project.

## Core Principles

### 1. Local Demo Reliability

The application must run on a local machine for the course showcase. Core behavior must not depend on a rented server, external cloud database, email service, or third-party API.

### 2. SQLite as the Local Source of Truth

The completed project uses SQLite through `better-sqlite3` as the local persistence layer. Browser storage may be used for UI state, but it must not be the primary source of truth for users, ideas, attachments, drafts, review history, blind review, or scores.

### 3. Phase Completion Traceability

All 7 phases must be traceable through documentation and implementation evidence:

1. Core Portal.
2. Smart Submission Forms.
3. Multi-Media Support.
4. Draft Management.
5. Multi-Stage Review.
6. Blind Review.
7. Scoring System.

### 4. Role-Safe Workflow Integrity

Submitter and admin behavior must be separated on the server side. UI hiding is not sufficient. Review actions, scoring, blind-review toggles, and draft access must enforce role and ownership checks in API logic.

### 5. Auditable Review History

Status transitions and stage actions must be recorded in history. Accepted/rejected decisions and revision requests must include comments so that the review trail is explainable during demo.

### 6. Tests Before Demo-Ready

Behavioral changes must pass the current test gate before being considered demo-ready.

## Current Test Gates

Run:

```powershell
npm test
npm run smoke:edge
```

The suite currently includes:

- 59 automated tests.
- 54 API integration tests using in-memory SQLite.
- 5 pure domain tests.
- Authentication and role-boundary tests.
- Idea submission and attachment tests.
- Draft management tests.
- Multi-stage review tests.
- Blind review tests.
- Scoring system tests.

`npm run smoke:edge` is required before demo when Microsoft Edge is available. If Edge/CDP is unavailable on the machine, document that limitation and rely on the automated API/domain tests plus manual browser verification.

## Manual Demo Gate

1. Start the app with `npm start`.
2. Open `http://localhost:4173`.
3. Login as submitter.
4. Submit an idea with category-specific fields and attachments.
5. Save and submit a draft.
6. Login as Evaluator Admin.
7. Move the idea through review stages.
8. Request revision and verify submitter resubmission.
9. Enable or demonstrate blind review before review starts.
10. Add scores and verify composite score display.
11. Open `PROJECT_SUMMARY.md` and show all phase checkboxes completed.
12. Open `specs/002-full-portal-phases-2-7/` and show SpecKit evidence.

## Documentation Rules

- `README.md` must describe setup, demo accounts, tests, and all completed phases.
- `PROJECT_SUMMARY.md` must follow the final deliverables template.
- `docs/prd.md` must describe the full 7-phase product scope.
- `docs/stories.md` must include user stories and acceptance criteria for phases 1-7.
- `docs/adr/` must document architectural decisions.
- `specs/001-phase1-mvp/` may remain as historical Phase 1 evidence.
- `specs/002-full-portal-phases-2-7/` must document the completed full portal scope.

## Runtime Constraints

- `npm install` is required before first run because `better-sqlite3` is a native dependency.
- `data/innovatepam.db` is a generated runtime database file.
- `.db-wal` and `.db-shm` are SQLite runtime helper files.
- Generated database files should not be committed unless seeded demo data is explicitly requested.

## Governance

This constitution supersedes the earlier Phase 1-only constitution where it conflicts with the completed 7-phase implementation. Future changes must update the PRD, stories, ADRs, SpecKit artifacts, tests, and README together.

**Version:** 2.0.0  
**Ratified:** 2026-05-14  
**Last Amended:** 2026-05-14