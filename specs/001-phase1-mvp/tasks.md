# Tasks: InnovatEPAM Portal Phase 1 MVP

**Input**: Design documents from `/specs/001-phase1-mvp/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included because clarified spec defines mandatory gates (`npm test` and `npm run smoke:edge`).
**Organization**: Tasks are grouped by user story and mapped to requested MVP evidence groups.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm local-first, dependency-free MVP runtime baseline.

- [x] T001 Confirm dependency-free static runtime wiring in package.json and server.js
- [x] T002 Confirm local-first app shell and route sections in index.html
- [x] T003 [P] Confirm core module and UI module split in src/portal-core.js and src/app.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Validate shared persistence, state model, and route guards required by all stories.

- [x] T004 Verify localStorage state bootstrap and persistence key usage in src/portal-core.js and src/app.js
- [x] T005 Verify session lifecycle key behavior in src/app.js
- [x] T006 [P] Verify protected-route redirect behavior contract in src/app.js and scripts/edge-smoke.mjs
- [x] T007 [P] Verify MVP contract coverage for routes, roles, and persistence in specs/001-phase1-mvp/contracts/mvp-runtime-contract.md

**Checkpoint**: Foundation evidence complete - user story evidence groups verified below.

---

## Phase 3: User Story 1 - Auth and Roles (Priority: P1) 🎯 MVP

**Goal**: Prove register/login/logout behavior, seeded demo access, and submitter/Evaluator Admin (admin role) role boundaries.
**Independent Test**: Register user, login/logout, demo login as submitter and admin, verify role-restricted behavior.

### Implementation Evidence for User Story 1

- [x] T008 [US1] Verify registration and login domain rules in src/portal-core.js
- [x] T009 [US1] Verify logout/session teardown UI flow in src/app.js
- [x] T010 [US1] Verify seeded demo accounts and role metadata in src/portal-core.js
- [x] T011 [US1] Verify role-aware routing and visibility toggles in src/app.js
- [x] T012 [P] [US1] Verify auth and role behavior tests in tests/portal-core.test.mjs

**Checkpoint**: Auth and roles evidence complete.

---

## Phase 4: User Story 2 - Idea Submission and One Attachment (Priority: P2)

**Goal**: Prove submitter can submit required idea fields with one attachment and local persistence.
**Independent Test**: Submit idea with title/description/category and single file, then verify persisted listing visibility.

### Implementation Evidence for User Story 2

- [x] T013 [US2] Verify idea creation validation rules (title/description/category) in src/portal-core.js
- [x] T014 [US2] Verify single attachment handling and size guard in src/app.js and src/portal-core.js
- [x] T015 [US2] Verify submit form orchestration and feedback in src/app.js and index.html
- [x] T016 [P] [US2] Verify submission + attachment test coverage in tests/portal-core.test.mjs
- [x] T017 [US2] Verify local persisted state shape for ideas and attachments in src/portal-core.js and specs/001-phase1-mvp/data-model.md

**Checkpoint**: Idea submission and one-attachment evidence complete.

---

## Phase 5: User Story 3 - Board Filtering, Admin Review, and Status History (Priority: P3)

**Goal**: Prove board visibility/filtering, Evaluator Admin-only review decisions with required comments, and full status history trail.
**Independent Test**: Admin reviews submitted idea, applies accept/reject with required comment, and verifies history update.

### Implementation Evidence for User Story 3

- [x] T018 [US3] Verify role-scoped idea listing behavior in src/portal-core.js and src/app.js
- [x] T019 [US3] Verify search and status filtering behavior in src/app.js and index.html
- [x] T020 [US3] Verify Evaluator Admin-only status transitions and comment requirement in src/portal-core.js
- [x] T021 [US3] Verify review form integration and status update flow in src/app.js and index.html
- [x] T022 [US3] Verify status history recording and rendering in src/portal-core.js and src/app.js
- [x] T023 [P] [US3] Verify review and role enforcement tests in tests/portal-core.test.mjs

**Checkpoint**: Board/filtering, admin review, and status history evidence complete.

---

## Phase 6: Validation and Documentation Evidence

**Purpose**: Capture mandatory test/smoke gates and documentation alignment evidence.

- [x] T024 Run `npm test` and confirm passing output for portal-core behaviors
- [x] T025 Run `npm run smoke:edge` and confirm full Friday demo runtime flow
- [x] T026 [P] Update MVP quickstart validation flow in specs/001-phase1-mvp/quickstart.md
- [x] T027 [P] Confirm MVP scope and exclusions in specs/001-phase1-mvp/spec.md and specs/001-phase1-mvp/plan.md
- [x] T028 [P] Confirm product/documentation alignment in README.md, docs/prd.md, and docs/stories.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6
- User Story evidence phases (3 to 5) depend on foundational evidence (Phase 2)
- Validation and documentation evidence (Phase 6) depends on all MVP behavior evidence being complete

### User Story Dependencies

- **US1 (Auth and Roles)**: starts after foundational checks
- **US2 (Submission and Attachment)**: depends on US1 auth/session behavior
- **US3 (Board/Review/History)**: depends on US1 auth/roles and US2 created idea records

### Parallel Opportunities

- T003, T006, T007 can run in parallel during early evidence pass
- T012, T016, T023 can run in parallel with story evidence review once implementation exists
- T026, T027, T028 can run in parallel after behavior and validation checks

---

## Parallel Example: MVP Evidence Pass

```bash
# Parallel doc/system checks:
Task: "T003 Confirm core module and UI module split in src/portal-core.js and src/app.js"
Task: "T007 Verify MVP contract coverage in specs/001-phase1-mvp/contracts/mvp-runtime-contract.md"

# Parallel validation/documentation checks:
Task: "T026 Update MVP quickstart validation flow in specs/001-phase1-mvp/quickstart.md"
Task: "T028 Confirm product/documentation alignment in README.md, docs/prd.md, and docs/stories.md"
```

---

## Implementation Strategy

### MVP Evidence-First Delivery

1. Validate setup and foundational runtime constraints.
2. Verify US1 auth/role evidence.
3. Verify US2 submission/attachment evidence.
4. Verify US3 board/review/history evidence.
5. Confirm mandatory gates (`npm test`, `npm run smoke:edge`) and documentation alignment.

### Incremental Verification

1. Auth + roles evidence establishes access control baseline.
2. Submission + attachment evidence proves contributor workflow.
3. Board + admin review + history evidence proves evaluator workflow.
4. Test and smoke evidence confirms Friday demo readiness.

---

## Notes

- Every task maps to existing implemented MVP behavior and is intentionally marked complete as evidence.
- Smart Submission Form and later phases remain optional/out of scope for this tasks set.
- No app code changes are required by this tasks artifact.
