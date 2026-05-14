# InnovatEPAM Portal

Employee innovation intake and evaluation platform for the A201 Beyond Vibe Coding capstone sprint.

## Overview

InnovatEPAM Portal enables employees to submit innovation ideas and enables evaluator admins to review, revise, anonymize, score, and decide those ideas through a structured workflow. The repository now represents the completed course project with **all 7 phases implemented**.

The application is intentionally local-demo friendly. It runs with a Node.js HTTP server and persists data in a local SQLite database at `data/innovatepam.db`. It does not require a rented server, cloud database, or external service for the presentation demo.

## Phase Completion Status

| Phase | Feature Area | Status |
|---|---|---|
| Phase 1 | Core Portal MVP | Completed |
| Phase 2 | Smart Submission Forms | Completed |
| Phase 3 | Multi-Media Support | Completed |
| Phase 4 | Draft Management | Completed |
| Phase 5 | Multi-Stage Review | Completed |
| Phase 6 | Blind Review | Completed |
| Phase 7 | Scoring System | Completed |

## What Is Included

- Register, login, logout, and seeded demo accounts.
- Role distinction between submitters and Evaluator Admin users.
- Idea submission with title, description, category, category-specific extra fields, and attachments.
- Idea listing, role-aware dashboard, protected routes, status history, and guided demo flow.
- SQLite persistence using `better-sqlite3`.
- Dynamic smart submission forms served by `GET /api/categories`.
- Multi-file attachment support with maximum 5 files and maximum 8 MB total size.
- Attachment metadata display, download endpoint, image previews, and type labels.
- Draft management for incomplete ideas.
- Four-stage review pipeline: Initial Screening, Technical Review, Business Impact, Final Selection.
- Revision loop when an evaluator requests changes.
- Blind review mode with anonymized author identity during active review.
- 1-5 scoring across Impact, Feasibility, Effort, and Innovation.
- Composite score calculation with inverted Effort scoring.
- Admin-only score visibility and score sorting support.
- ADRs, PRD, user stories, SpecKit artifacts, tests, and demo script.

## Run Locally

```powershell
npm install
npm test
npm start
```

Open:

```text
http://localhost:****
```

On first boot, the application creates and seeds:

```text
data/innovatepam.db
```

To delete and reseed the local demo database:

```powershell
npm run reset:db
npm start
```

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Evaluator Admin | `admin@innovatepam.local` | `Admin123!` |
| Submitter | `aylin@epam.local` | `Submit123!` |

## Routes

| Route | Purpose |
|---|---|
| `#login` | Public login and registration entry point |
| `#dashboard` | Authenticated idea board |
| `#submit` | Authenticated idea submission focus |
| `#guide` | User guide for the demo workflow |

Unauthenticated users who open protected routes are redirected back to `#login`.

## Project Structure

```text
.
|-- index.html
|-- server.js
|-- src/
|   |-- app.js                 # Frontend SPA: routing, rendering, events
|   |-- api-client.js          # Fetch wrapper for API calls
|   |-- portal-core.js         # Backward-compatible domain re-export
|   |-- styles.css             # UI styling
|   `-- server/
|       |-- api.js              # HTTP JSON API handler
|       |-- db.js               # SQLite open/init/seed/migrate
|       |-- domain.js           # Pure domain rules and constants
|       `-- repository.js       # SQL prepared statements and data access
|-- assets/
|   `-- workflow-map.svg
|-- data/
|   `-- innovatepam.db         # Runtime SQLite database, created locally
|-- tests/
|   |-- api.test.mjs           # 54 API integration tests with in-memory SQLite
|   `-- portal-core.test.mjs   # 5 pure domain tests
|-- docs/
|   |-- adr/
|   |   |-- 0001-local-first-no-dependency-mvp.md
|   |   |-- 0002-sqlite-backend.md
|   |   |-- 0003-phase2-3-extensions.md
|   |   |-- 0004-phase4-drafts.md
|   |   |-- 0005-phase5-multistage.md
|   |   `-- 0006-phase6-7-blind-review-and-scoring.md
|   |-- constitution.md
|   |-- prd.md
|   `-- stories.md
|-- specs/
|   |-- 001-phase1-mvp/        # Historical Phase 1 SpecKit artifacts
|   `-- 002-full-portal-phases-2-7/
|       |-- spec.md
|       |-- plan.md
|       |-- tasks.md
|       |-- data-model.md
|       |-- quickstart.md
|       |-- research.md
|       |-- checklists/
|       |   `-- requirements.md
|       `-- contracts/
|           `-- api-contract.md
|-- AGENTS.md
|-- DEMO_SCRIPT.md
`-- PROJECT_SUMMARY.md
```

## API Summary

| Area | Endpoint Examples |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/session` |
| Reference Data | `GET /api/categories`, `GET /api/stages`, `GET /api/score-dimensions` |
| Ideas | `GET /api/ideas`, `POST /api/ideas`, `PATCH /api/ideas/:id` |
| Attachments | `GET /api/attachments/:id`, `GET /api/ideas/:id/attachment` |
| Drafts | `GET /api/drafts`, `POST /api/drafts`, `PATCH /api/drafts/:id`, `DELETE /api/drafts/:id`, `POST /api/drafts/:id/submit` |
| Review | `POST /api/ideas/:id/stage-action`, `POST /api/ideas/:id/revert-last-stage` |
| Blind Review | `POST /api/ideas/:id/blind-review` |
| Scoring | `POST /api/ideas/:id/scores`, `GET /api/ideas/:id/scores` |
| Demo | `POST /api/demo/reset` |

## Test Gate

```powershell
npm test
npm run smoke:edge
```

The automated suite contains **59 tests**:

- 54 API integration tests using in-memory SQLite.
- 5 pure domain tests.

The tests cover authentication, role boundaries, idea validation, attachments, drafts, multi-stage review, blind review, scoring, and demo reset behavior.

## SQLite Database Viewing in VS Code

Recommended extension:

```text
SQLite Viewer
Extension ID: qwtel.sqlite-viewer
```

Open this file in VS Code after starting the app once:

```text
data/innovatepam.db
```

You do not need to open `.db-wal` or `.db-shm`; they are SQLite runtime helper files.

## Sprint Workflow Evidence

- Product intent and acceptance criteria: `docs/prd.md`, `docs/stories.md`.
- Technical decisions: `docs/adr/`.
- Engineering and testing rules: `docs/constitution.md` and `.specify/memory/constitution.md`.
- Spec-driven development artifacts: `specs/001-phase1-mvp/` and `specs/002-full-portal-phases-2-7/`.
- Automated verification: `tests/api.test.mjs`, `tests/portal-core.test.mjs`.
- Runtime browser verification: `scripts/edge-smoke.mjs`.

## Creator

Creator: [github.com/bilgeozcan](https://github.com/bilgeozcan)