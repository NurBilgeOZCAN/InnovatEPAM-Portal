# Feature Specification: InnovatEPAM Portal Phase 1 MVP

**Feature Branch**: `001-run-feature-hook`  
**Created**: 2026-05-12  
**Status**: Draft  
**Input**: User description: "Create the Phase 1 MVP spec for InnovatEPAM Portal. Mandatory Friday demo scope: register/login/logout, seeded demo accounts, submitter vs Evaluator Admin roles, idea submission with title/description/category, one file attachment, idea listing, search/status filter, status lifecycle, Evaluator Admin-only accept/reject with required comment, status history, and localStorage persistence. Out of scope: Smart Submission Form, multi-media, drafts, multi-stage review, blind review, scoring, backend/database. Tests already pass: npm test and npm run smoke:edge."

## Clarifications

### Session 2026-05-12

- Q: Are `npm test` and `npm run smoke:edge` mandatory Phase 1 demo gates? → A: Yes, both are mandatory readiness gates.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access and Role Entry (Priority: P1)

A visitor creates an account or signs in (including seeded demo accounts), reaches the correct workspace for their role, and can sign out safely.

**Why this priority**: No demo workflow can proceed without reliable authentication, role routing, and logout.

**Independent Test**: Can be fully tested by registering a new submitter, signing out, signing in with a seeded submitter account, then signing in with a seeded Evaluator Admin (admin role) account and verifying role-appropriate workspace access.

**Acceptance Scenarios**:

1. **Given** a new visitor on the sign-in page, **When** they register with valid credentials, **Then** the system creates their account and allows sign-in.
2. **Given** a seeded submitter account, **When** the user signs in, **Then** they are routed to submitter-accessible views only.
3. **Given** a seeded Evaluator Admin account, **When** the user signs in, **Then** they are routed to Evaluator Admin-capable views.
4. **Given** any authenticated user, **When** they sign out, **Then** authenticated views become inaccessible until they sign in again.

---

### User Story 2 - Submitter Idea Capture and Tracking (Priority: P2)

A submitter creates an idea with required fields, can attach one file, and tracks ideas through listing and filtering.

**Why this priority**: Core product value is collecting ideas and allowing submitters to monitor progress.

**Independent Test**: Can be fully tested by signing in as submitter, creating an idea with required fields and one attachment, then confirming the idea appears in the listing and can be located by text search and status filter.

**Acceptance Scenarios**:

1. **Given** an authenticated submitter, **When** they submit an idea with title, description, and category, **Then** the idea is stored and visible in their list.
2. **Given** an authenticated submitter, **When** they attach one file and submit, **Then** the idea stores that single attachment and remains valid.
3. **Given** multiple ideas in different statuses, **When** the submitter uses search text and status filter, **Then** only matching ideas are shown.
4. **Given** an unauthenticated user, **When** they navigate to submission views, **Then** they are redirected to sign-in.

---

### User Story 3 - Evaluator Admin Review Decisions (Priority: P3)

An Evaluator Admin reviews submitted ideas, changes status through the lifecycle, and records required comments for acceptance or rejection with preserved history.

**Why this priority**: Friday demo requires end-to-end decision workflow and transparent review records.

**Independent Test**: Can be fully tested by signing in as Evaluator Admin, finding a submitted idea, applying accept/reject with required comment, and confirming status history captures the decision trail.

**Acceptance Scenarios**:

1. **Given** an authenticated Evaluator Admin, **When** they open the idea board, **Then** they can review available ideas and their current statuses.
2. **Given** an authenticated Evaluator Admin, **When** they set an idea to accepted or rejected without a comment, **Then** the system blocks the action and requests a comment.
3. **Given** an authenticated Evaluator Admin, **When** they apply accepted or rejected with a comment, **Then** the new status and comment are saved in history.
4. **Given** an authenticated submitter, **When** they attempt Evaluator Admin decision actions, **Then** the system denies the action.

---

### Edge Cases

- What happens when a user attempts to register with an email already in use?
- How does the system handle a submitter attempting to upload more than one attachment?
- What happens when a user manually navigates to restricted routes while not authenticated?
- How does filtering behave when search text and status filter produce no matches?
- What happens if persisted session or idea data is missing or corrupted in local storage?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow visitors to register new accounts and sign in.
- **FR-002**: System MUST provide sign-out and terminate authenticated access after logout.
- **FR-003**: System MUST provide seeded demo accounts for submitter and Evaluator Admin roles.
- **FR-004**: System MUST enforce role-based access boundaries between submitter and Evaluator Admin capabilities.
- **FR-005**: System MUST allow authenticated submitters to create ideas with required title, description, and category.
- **FR-006**: System MUST allow at most one attachment per idea submission.
- **FR-007**: System MUST list ideas relevant to the signed-in user role.
- **FR-008**: System MUST provide idea search by text and filtering by status.
- **FR-009**: System MUST support the defined status lifecycle for ideas and reflect current status in listings.
- **FR-010**: System MUST allow only Evaluator Admin users to accept or reject ideas.
- **FR-011**: System MUST require an Evaluator Admin comment when accepting or rejecting an idea.
- **FR-012**: System MUST record and display status history entries including decision comments.
- **FR-013**: System MUST persist accounts, sessions, ideas, and status history in browser-local persisted storage.
- **FR-014**: System MUST redirect unauthenticated users away from protected views to sign-in.
- **FR-015**: System MUST exclude Smart Submission Form from Phase 1 MVP behavior.
- **FR-016**: System MUST exclude multimedia submission, drafts, multi-stage review, blind review, scoring, and backend/database persistence from Phase 1 MVP behavior.
- **FR-017**: System MUST require both `npm test` and `npm run smoke:edge` to pass before Friday demo sign-off.

### Key Entities *(include if feature involves data)*

- **User**: Registered person with identity, role (submitter or Evaluator Admin), and authentication credentials for session access.
- **Demo Account**: Pre-seeded user identity used for Friday demo role-based sign-in.
- **Session**: Current authenticated state linking the active user to protected views.
- **Idea**: Innovation proposal containing title, description, category, current status, submitter ownership, and optional single attachment metadata.
- **Attachment**: One supporting file reference associated with an idea submission.
- **Review Decision**: Evaluator Admin action that changes idea status to accepted or rejected and includes a required comment.
- **Status History Entry**: Immutable record of a status change with actor, timestamp, prior/new status, and optional/required comment context.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Friday demo runs complete the full flow (submitter sign-in, idea submission, Evaluator Admin decision, history verification) without manual data resets.
- **SC-002**: 95% of valid users complete registration or sign-in in under 60 seconds during guided demo trials, measured across 10 local timed demo runs with median duration and pass-rate tracking.
- **SC-003**: 100% of accept/reject actions are blocked when comment is missing and succeed when comment is present.
- **SC-004**: 100% of accepted/rejected ideas show at least one corresponding status history entry with decision context.
- **SC-005**: In 100% of demo reruns, previously created ideas remain available after browser reload due to local persisted storage.
- **SC-006**: 100% of release-candidate demo builds pass `npm test` and `npm run smoke:edge` before final sign-off.

## Assumptions

- Friday demo is performed on a single local environment and does not require remote services.
- Evaluator Admin responsibilities are fulfilled by the same privileged role for Phase 1.
- Attachment constraints beyond single-file limit (such as file-type policy) are not expanded in Phase 1 unless explicitly requested.
- Smart Submission Form and all later-phase capabilities remain optional and out of scope for Phase 1.

## Constitution Alignment *(mandatory)*

- **Local-First Check**: This feature is specified to run fully locally with browser-local persistence and no external service dependency.
- **Stack Check**: This feature remains within the dependency-free web module and local Node static serving approach.
- **MVP Scope Check**: Covered mandatory scope includes register/login/logout, seeded demo accounts, role boundaries, idea submission fields, one attachment, listing, search/status filter, lifecycle transitions, Evaluator Admin-only accept/reject with required comment, history, and local persistence.
- **Out-of-Scope Check**: Smart Submission Form, multi-media, drafts, multi-stage review, blind review, scoring, and backend/database capabilities are explicitly excluded from Phase 1.
