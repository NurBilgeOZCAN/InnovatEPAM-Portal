# Implementation Plan: InnovatEPAM Portal Phase 1 MVP

**Branch**: `001-run-feature-hook` | **Date**: 2026-05-12 | **Spec**: `/specs/001-phase1-mvp/spec.md`
**Input**: Feature specification from `/specs/001-phase1-mvp/spec.md`

## Summary

Create a planning baseline for the already working Phase 1 MVP without changing
application code. The plan captures architecture, file responsibilities,
validation flow, and Friday demo readiness using the existing local-first,
dependency-free implementation and current test gates.

Clarification refresh (2026-05-12): `npm test` and `npm run smoke:edge` are
treated as mandatory Phase 1 demo sign-off gates, and Smart Submission Form
remains optional future scope.

## Technical Context

**Language/Version**: JavaScript ES modules on Node.js runtime  
**Primary Dependencies**: No runtime framework dependencies (browser APIs + Node built-ins)  
**Storage**: Browser localStorage for app state, sessionStorage for active session  
**Testing**: Node built-in test runner (`node --test`) + Edge CDP smoke script  
**Target Platform**: Local browser runtime with Node static server on Windows/macOS/Linux  
**Project Type**: Single-project web application (static frontend + local Node static server)  
**Performance Goals**: Friday demo flow completes in 3 to 5 minutes without runtime errors  
**Constraints**: No app code changes in this planning cycle; keep local-first and dependency-free architecture  
**Scale/Scope**: Phase 1 MVP only, including auth, role split, submission, review lifecycle, and history

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Local-first constraint satisfied (no external service dependency for core MVP flow)
- [x] Dependency-free stack preserved (HTML/CSS/JS ES modules + Node static server)
- [x] Scope constrained to Phase 1 MVP requirements only
- [x] Optional items explicitly marked out of MVP commitment
- [x] Quality gates identified: `npm test` and `npm run smoke:edge`

## Project Structure

### Documentation (this feature)

```text
specs/001-phase1-mvp/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mvp-runtime-contract.md
└── tasks.md
```

### Source Code (repository root)
```text
.
├── index.html
├── server.js
├── src/
│   ├── app.js
│   ├── portal-core.js
│   └── styles.css
├── scripts/
│   └── edge-smoke.mjs
├── tests/
│   └── portal-core.test.mjs
├── assets/
│   └── workflow-map.svg
└── docs/
    ├── prd.md
    ├── stories.md
    └── adr/
```

**Structure Decision**: Keep a single-project layout with clear separation:

- `server.js`: local static serving only.
- `src/portal-core.js`: business rules, validation, role enforcement, and state mutation helpers.
- `src/app.js`: route handling, DOM orchestration, local/session storage integration.
- `src/styles.css`: presentation layer only.
- `tests/portal-core.test.mjs`: domain behavior regression checks.
- `scripts/edge-smoke.mjs`: runtime journey verification in Edge.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Architecture Overview

The MVP is a browser-first module served by a local Node static server.

1. Browser loads `index.html` and ES modules from `src/`.
2. `src/app.js` bootstraps route state, session checks, and UI event handlers.
3. `src/portal-core.js` enforces domain rules for registration, login, idea
  creation, visibility, and evaluator review transitions.
4. State is saved to localStorage and sessionStorage.
5. Unit and smoke tests validate behavior before Friday demo readiness.

## Validation Flow

1. Domain validation in `src/portal-core.js`:
  - registration and login rules,
  - required idea fields and category checks,
  - role enforcement for status updates,
  - comment requirement for accepted/rejected states.
2. UI validation in `src/app.js`:
  - route guards for unauthenticated navigation,
  - single attachment handling,
  - form messaging and route-level feedback.
3. Automated quality gates:
  - `npm test` for rule-level correctness,
  - `npm run smoke:edge` for end-to-end runtime behavior.

## Friday Demo Readiness

Demo is ready when all conditions are true:

- app starts locally with `npm start`,
- submitter flow (login -> submit idea -> view board) succeeds,
- Evaluator Admin (admin role) flow (login -> accept/reject with required comment) succeeds,
- status history reflects lifecycle updates,
- both quality gates pass (`npm test`, `npm run smoke:edge`).

## Post-Design Constitution Check

- [x] Local-first architecture preserved.
- [x] Dependency-free MVP stack preserved.
- [x] Scope remains Phase 1 mandatory features only.
- [x] Smart Submission Form remains optional future scope.
- [x] Demo readiness tied to required test gates.
