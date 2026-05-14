# Feature Specification: Full InnovatEPAM Portal - Phases 2-7 Completion

**Feature Branch:** `002-full-portal-phases-2-7`  
**Created:** 2026-05-14  
**Status:** Complete  
**Input:** Course project requires InnovatEPAM Portal to support all 7 phases after the Phase 1 MVP.

## User Scenarios & Testing

### Primary User Story

A submitter logs into the portal, creates an innovation idea using category-specific fields, attaches multiple supporting files, saves and edits a draft, submits it for review, responds to requested revisions, and tracks final status. An evaluator admin logs in, reviews all submitted ideas through a four-stage pipeline, enables blind review before review begins, scores ideas across multiple dimensions, and accepts or rejects ideas with comments.

### Acceptance Scenarios

1. **Given** a logged-in submitter, **when** they select a category, **then** the form displays the correct category-specific fields.
2. **Given** a submitter creating an idea, **when** they attach up to 5 files under 8 MB total, **then** the system stores and displays attachment metadata.
3. **Given** a submitter has incomplete content, **when** they save as draft, **then** the draft is visible only to that submitter.
4. **Given** a valid draft, **when** the submitter submits it, **then** it becomes a submitted idea and enters the review pipeline.
5. **Given** an admin reviews a submitted idea, **when** they approve a stage, **then** the idea advances through the configured stage sequence.
6. **Given** an admin requests revision, **when** the submitter resubmits, **then** the idea returns to the stage that requested revision.
7. **Given** blind review is enabled before review starts, **when** a non-author views the idea during active review, **then** author identity is anonymized.
8. **Given** an idea receives a terminal accepted/rejected decision, **when** the idea is viewed, **then** author identity is revealed.
9. **Given** an admin scores an idea, **when** valid 1-5 scores are submitted, **then** the score summary and composite score are updated.
10. **Given** a submitter tries to access score data, **when** they call scoring endpoints, **then** access is denied.

## Requirements

### Functional Requirements

- **FR-001:** System MUST expose category definitions and category-specific fields through `GET /api/categories`.
- **FR-002:** System MUST validate required category-specific fields for submitted ideas.
- **FR-003:** System MUST reject unknown extra-field keys.
- **FR-004:** System MUST store extra fields as idea data and display them on idea cards.
- **FR-005:** System MUST support multiple attachments per idea.
- **FR-006:** System MUST enforce a maximum of 5 attachments per idea.
- **FR-007:** System MUST enforce a maximum total attachment size of 8 MB.
- **FR-008:** System MUST store attachment metadata separately from idea list payload blobs.
- **FR-009:** System MUST provide an attachment download endpoint.
- **FR-010:** System MUST allow submitters to create drafts with lenient validation.
- **FR-011:** System MUST allow submitters to list only their own drafts.
- **FR-012:** System MUST allow submitters to update and delete their own drafts.
- **FR-013:** System MUST run full validation before draft submission.
- **FR-014:** System MUST exclude drafts from admin review lists.
- **FR-015:** System MUST define a four-stage review pipeline.
- **FR-016:** System MUST allow admin users to approve, reject, or request revision at review stages.
- **FR-017:** System MUST record stage actions in history.
- **FR-018:** System MUST return revision-requested ideas to submitter editing.
- **FR-019:** System MUST return resubmitted revisions to the stage that requested revision.
- **FR-020:** System MUST support blind review opt-in at submission time.
- **FR-021:** System MUST allow admin users to enable blind review before review starts.
- **FR-022:** System MUST lock blind review after the first stage action.
- **FR-023:** System MUST hide author identity from non-author viewers during active blind review.
- **FR-024:** System MUST reveal author identity after terminal decision.
- **FR-025:** System MUST support scoring dimensions Impact, Feasibility, Effort, and Innovation.
- **FR-026:** System MUST validate score values as integers from 1 to 5.
- **FR-027:** System MUST calculate per-dimension averages and composite score.
- **FR-028:** System MUST invert Effort score for composite calculation.
- **FR-029:** System MUST restrict score read/write endpoints to admins.
- **FR-030:** System MUST document completed phases in README and PROJECT_SUMMARY.

### Non-Functional Requirements

- **NFR-001:** Application MUST run locally with `npm start`.
- **NFR-002:** Application MUST use SQLite as local source of truth.
- **NFR-003:** Application MUST not require a hosted database for demo.
- **NFR-004:** Schema initialization MUST be idempotent.
- **NFR-005:** Automated tests MUST run with `npm test`.
- **NFR-006:** Documentation MUST align with completed 7-phase scope.

## Key Entities

- User.
- Session.
- Idea.
- Attachment.
- IdeaHistoryEntry.
- Draft.
- ReviewStage.
- Score.
- CategoryField.

## Edge Cases

- User submits an invalid category-specific required field.
- User includes an unknown extra-field key.
- User uploads more than 5 attachments.
- User uploads attachments above 8 MB total.
- Admin tries to view drafts.
- Submitter tries to edit another user's draft.
- Submitter submits invalid draft.
- Admin requests revision after terminal decision.
- Blind review toggle attempted after review starts.
- Submitter tries to read or write scores.
- Score value outside 1-5 range.
- Unknown scoring dimension submitted.

## Success Criteria

- **SC-001:** All 7 phases are represented in README and PROJECT_SUMMARY.
- **SC-002:** PRD and stories describe phases 1-7.
- **SC-003:** SpecKit artifacts document the completed full portal.
- **SC-004:** `npm test` passes with 59 tests.
- **SC-005:** Demo flow can show submitter, admin, draft, review, blind review, and scoring behavior.
- **SC-006:** Local SQLite database is created on first boot.