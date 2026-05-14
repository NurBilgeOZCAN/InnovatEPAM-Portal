# Tasks: Full InnovatEPAM Portal - Phases 2-7

**Input:** `specs/002-full-portal-phases-2-7/spec.md`  
**Plan:** `specs/002-full-portal-phases-2-7/plan.md`  
**Status:** Complete

## Phase 0 - Documentation Alignment

- [x] T001 Update `README.md` to state all 7 phases are complete.
- [x] T002 Update `PROJECT_SUMMARY.md` using final deliverables template.
- [x] T003 Update `docs/prd.md` to describe completed 7-phase product scope.
- [x] T004 Update `docs/stories.md` with stories for phases 1-7.
- [x] T005 Update `docs/constitution.md` with current SQLite/test/demo rules.
- [x] T006 Keep `specs/001-phase1-mvp/` as historical Phase 1 evidence.
- [x] T007 Add `specs/002-full-portal-phases-2-7/` for completed full portal scope.

## Phase 1 - SQLite Foundation

- [x] T008 Add `better-sqlite3` dependency.
- [x] T009 Create SQLite open/init logic in `src/server/db.js`.
- [x] T010 Create `users`, `sessions`, `ideas`, and `idea_history` tables.
- [x] T011 Add seed data for demo admin and submitter accounts.
- [x] T012 Add reset/reseed support.
- [x] T013 Move domain rules into `src/server/domain.js`.
- [x] T014 Add repository layer in `src/server/repository.js`.
- [x] T015 Add API handler in `src/server/api.js`.

## Phase 2 - Smart Submission Forms

- [x] T016 Define category list in domain layer.
- [x] T017 Define category-specific fields in `CATEGORY_FIELDS`.
- [x] T018 Add `GET /api/categories`.
- [x] T019 Add validation for required extra fields.
- [x] T020 Reject unknown extra-field keys.
- [x] T021 Persist extra fields in `ideas.extra_fields`.
- [x] T022 Render dynamic fields in `src/app.js`.
- [x] T023 Display submitted extra fields on idea cards.
- [x] T024 Add tests for category and extra-field behavior.

## Phase 3 - Multi-Media Support

- [x] T025 Create `attachments` table.
- [x] T026 Add legacy single-attachment migration into attachments table.
- [x] T027 Accept attachment arrays in `POST /api/ideas`.
- [x] T028 Enforce maximum 5 files per idea.
- [x] T029 Enforce maximum 8 MB total attachment size.
- [x] T030 Return attachment metadata in idea responses.
- [x] T031 Add `GET /api/attachments/:id` blob endpoint.
- [x] T032 Preserve `GET /api/ideas/:id/attachment` legacy alias.
- [x] T033 Add frontend multi-file selection/removal behavior.
- [x] T034 Add tests for attachment constraints and retrieval.

## Phase 4 - Draft Management

- [x] T035 Add `DRAFT_STATUS` domain concept.
- [x] T036 Implement `validateDraftInput()`.
- [x] T037 Add `GET /api/drafts`.
- [x] T038 Add `POST /api/drafts`.
- [x] T039 Add `GET /api/drafts/:id`.
- [x] T040 Add `PATCH /api/drafts/:id`.
- [x] T041 Add `DELETE /api/drafts/:id`.
- [x] T042 Add `POST /api/drafts/:id/submit`.
- [x] T043 Exclude drafts from admin and normal idea lists.
- [x] T044 Enforce draft ownership.
- [x] T045 Add frontend draft save/edit/submit UI.
- [x] T046 Add tests for draft lifecycle.

## Phase 5 - Multi-Stage Review

- [x] T047 Define `STAGES` domain constant.
- [x] T048 Add `current_stage` to ideas.
- [x] T049 Add `revision_requested` to ideas.
- [x] T050 Add `revision_from_stage` to ideas.
- [x] T051 Add `stage` to idea history.
- [x] T052 Add `GET /api/stages`.
- [x] T053 Add `POST /api/ideas/:id/stage-action`.
- [x] T054 Implement approve-stage behavior.
- [x] T055 Implement reject behavior.
- [x] T056 Implement request-revision behavior.
- [x] T057 Implement submitter revision resubmission behavior.
- [x] T058 Add stage stepper UI.
- [x] T059 Add tests for multi-stage review and revision loop.

## Phase 6 - Blind Review

- [x] T060 Add `blind_review` field to ideas.
- [x] T061 Allow submitter blind-review opt-in at submission time.
- [x] T062 Add admin blind-review toggle endpoint.
- [x] T063 Hide author identity from non-author viewers during active review.
- [x] T064 Keep author's own identity visible to author.
- [x] T065 Reveal identity after accepted/rejected terminal decision.
- [x] T066 Lock blind-review toggle after stage action.
- [x] T067 Add blind-review UI badge/indicator.
- [x] T068 Add tests for blind-review masking and lock behavior.

## Phase 7 - Scoring System

- [x] T069 Define `SCORE_DIMENSIONS` domain constant.
- [x] T070 Create `scores` table.
- [x] T071 Add `GET /api/score-dimensions`.
- [x] T072 Add `POST /api/ideas/:id/scores`.
- [x] T073 Add `GET /api/ideas/:id/scores`.
- [x] T074 Validate score dimensions.
- [x] T075 Validate 1-5 score values.
- [x] T076 Upsert score rows by idea/evaluator/stage/dimension.
- [x] T077 Calculate per-dimension averages.
- [x] T078 Calculate composite score with inverted Effort.
- [x] T079 Hide scores from submitters.
- [x] T080 Add score display and sorting for admins.
- [x] T081 Add tests for scoring access and aggregation.

## Phase 8 - Final Validation

- [x] T082 Run `npm test`.
- [x] T083 Verify 59 automated tests are represented in documentation.
- [x] T084 Run or document `npm run smoke:edge`.
- [x] T085 Add `DEMO_SCRIPT.md`.
- [x] T086 Confirm `.db`, `.db-wal`, and `.db-shm` handling is documented.
- [x] T087 Confirm final deliverables match OneDrive course template.

## Final Status

All tasks for phases 1-7 are complete. Documentation now represents the project as a completed 7-phase InnovatEPAM Portal implementation.