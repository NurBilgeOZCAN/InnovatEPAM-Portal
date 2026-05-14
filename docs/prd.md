# Product Requirements Document - InnovatEPAM Portal

## 1. Purpose

InnovatEPAM Portal enables employees to submit innovation ideas and enables evaluator admins to review, score, anonymize, and manage those ideas through a structured evaluation workflow.

The project was built for the A201 Beyond Vibe Coding course sprint and now represents the completed 7-phase capstone implementation.

## 2. Product Goals

1. Provide a working local portal for employee innovation submissions.
2. Support submitter and evaluator admin roles.
3. Allow ideas to move from submission to review to final decision.
4. Support richer submissions through smart forms and file attachments.
5. Support draft editing before final submission.
6. Support a multi-stage review workflow with revision loops.
7. Support blind review for unbiased evaluation.
8. Support multi-dimension scoring and composite score ranking.
9. Demonstrate spec-driven development with docs, ADRs, SpecKit artifacts, and tests.

## 3. Target Users

### 3.1 Submitter

An employee who wants to submit an innovation idea, attach supporting materials, save drafts, track review status, and respond to revision requests.

### 3.2 Evaluator Admin

A reviewer/admin who evaluates ideas, manages review stages, requests revisions, enables blind review before review begins, and scores submissions.

### 3.3 Instructor / Reviewer

A course evaluator who needs to verify that the local application runs, the repository is organized, and the deliverables show a spec-driven workflow.

## 4. Completed Scope

### Phase 1 - Core Portal

- User registration.
- User login and logout.
- Submitter/admin role distinction.
- Idea submission with title, description, category, and validation.
- File attachment support.
- Idea listing and viewing.
- Status tracking.
- Admin evaluation workflow.
- Review history.

### Phase 2 - Smart Submission Forms

- Category-specific extra fields.
- Server-side category field definitions.
- Dynamic frontend rendering.
- Required extra-field validation.
- Extra-field display on idea cards.

### Phase 3 - Multi-Media Support

- Multiple attachments per idea.
- Maximum 5 attachments.
- Maximum 8 MB total attachment size.
- Attachment metadata persistence.
- Attachment preview/download endpoint.
- Backward compatibility with legacy single-attachment route.

### Phase 4 - Draft Management

- Save partial ideas as drafts.
- Edit drafts.
- Delete drafts.
- Promote valid drafts to submitted status.
- Exclude drafts from admin review lists.
- Keep drafts visible only to their owner.

### Phase 5 - Multi-Stage Review

- Four-stage review pipeline.
- Initial Screening.
- Technical Review.
- Business Impact.
- Final Selection.
- Approve action.
- Reject action.
- Request-revision action.
- Submitter revision loop.
- Stage-aware history entries.

### Phase 6 - Blind Review

- Optional anonymous submission.
- Admin blind-review toggle before review starts.
- Author identity hidden from non-author viewers during active review.
- Deterministic anonymized author handle.
- Automatic identity reveal after accepted/rejected terminal decision.
- Lock blind-review toggle after first stage action.

### Phase 7 - Scoring System

- Impact scoring.
- Feasibility scoring.
- Effort scoring.
- Innovation scoring.
- 1-5 score range validation.
- Composite score aggregation.
- Inverted Effort scoring in composite calculation.
- Admin-only score endpoint access.
- Submitter score visibility blocked.
- Score summary display and sorting.

## 5. Out of Scope

The following are intentionally outside the course sprint scope:

- Production SSO.
- Hosted deployment requirement.
- Persistent online database.
- Email or Teams notifications.
- Production object storage such as S3/GCS.
- Production-grade password hashing.
- Multi-tenant organization management.
- Real budget approval workflow.
- Advanced analytics dashboard.
- Comment threads beyond review/revision comments.
- Idea version diffing.

## 6. Functional Requirements

### Authentication and Roles

- **FR-001:** The system shall allow users to register with name, email, password, and role.
- **FR-002:** The system shall allow users to login and logout.
- **FR-003:** The system shall maintain an authenticated session using a server-side session table and an HTTP-only cookie.
- **FR-004:** The system shall distinguish submitter users from evaluator admin users.
- **FR-005:** The system shall block unauthenticated users from protected routes and API endpoints.

### Idea Submission

- **FR-006:** A submitter shall be able to create an idea with title, description, and category.
- **FR-007:** The title shall be at least 5 characters.
- **FR-008:** The description shall be at least 20 characters.
- **FR-009:** The category shall be one of the configured categories.
- **FR-010:** The system shall create an initial status history entry when an idea is submitted.

### Smart Forms

- **FR-011:** The system shall expose category definitions and category-specific extra fields through `GET /api/categories`.
- **FR-012:** The frontend shall render extra fields dynamically based on the selected category.
- **FR-013:** Required category-specific extra fields shall be validated.
- **FR-014:** Unknown extra-field keys shall be rejected.
- **FR-015:** Stored extra fields shall be displayed on idea cards.

### Attachments

- **FR-016:** A submitter shall be able to attach multiple files to an idea.
- **FR-017:** The system shall enforce a maximum of 5 files per idea.
- **FR-018:** The system shall enforce a maximum total attachment size of 8 MB.
- **FR-019:** Attachment metadata shall be returned with idea list responses.
- **FR-020:** Attachment blobs shall be fetched through a dedicated attachment endpoint.

### Drafts

- **FR-021:** A submitter shall be able to save an incomplete idea as a draft.
- **FR-022:** A submitter shall be able to view only their own drafts.
- **FR-023:** A submitter shall be able to update draft fields and attachments.
- **FR-024:** A submitter shall be able to delete a draft.
- **FR-025:** A submitter shall be able to submit a valid draft into the normal review pipeline.
- **FR-026:** Admin users shall not see drafts in the standard idea board.

### Review Workflow

- **FR-027:** Admin users shall be able to see all non-draft ideas.
- **FR-028:** Submitters shall see only their own non-draft ideas.
- **FR-029:** Admin users shall be able to move ideas through a four-stage review pipeline.
- **FR-030:** The review pipeline shall include Initial Screening, Technical Review, Business Impact, and Final Selection.
- **FR-031:** Admin users shall be able to approve a stage.
- **FR-032:** Admin users shall be able to reject an idea at a stage.
- **FR-033:** Admin users shall be able to request revision at a stage.
- **FR-034:** Submitters shall be able to revise and resubmit ideas when revision is requested.
- **FR-035:** The resubmitted idea shall return to the stage that requested revision.

### Blind Review

- **FR-036:** A submitter shall be able to request blind review at submission time.
- **FR-037:** An admin shall be able to enable blind review before evaluation begins.
- **FR-038:** The system shall hide author name and email from non-author viewers during active blind review.
- **FR-039:** The system shall reveal author identity after a terminal decision.
- **FR-040:** The system shall reject blind-review toggles after the first stage action.

### Scoring

- **FR-041:** Admin users shall be able to submit scores for an idea.
- **FR-042:** Scores shall use dimensions: Impact, Feasibility, Effort, and Innovation.
- **FR-043:** Score values shall be integers from 1 to 5.
- **FR-044:** The system shall aggregate score dimensions into a composite score.
- **FR-045:** Effort shall be inverted for the composite score.
- **FR-046:** Submitters shall not access scoring endpoints.
- **FR-047:** Score summaries shall be visible to admins on idea cards.

### Demo and Reset

- **FR-048:** The system shall seed demo accounts on first boot.
- **FR-049:** The system shall provide a demo reset endpoint.
- **FR-050:** The repository shall document demo accounts and demo flow.

## 7. Non-Functional Requirements

- **NFR-001:** The application shall run locally with `npm start`.
- **NFR-002:** The test suite shall run with `npm test`.
- **NFR-003:** The project shall not require a hosted server or external database for the course demo.
- **NFR-004:** SQLite schema setup shall be idempotent.
- **NFR-005:** The code shall keep domain rules separate from persistence where practical.
- **NFR-006:** API responses shall avoid returning attachment blob data inside idea list payloads.
- **NFR-007:** Role boundaries shall be enforced on the server, not only in the UI.
- **NFR-008:** Documentation shall stay aligned with the implemented 7-phase feature set.

## 8. Success Criteria

- **SC-001:** A reviewer can run the app locally using documented commands.
- **SC-002:** Demo accounts work without manual database setup.
- **SC-003:** A submitter can submit an idea with category-specific fields and attachments.
- **SC-004:** A submitter can save, edit, and submit a draft.
- **SC-005:** An admin can move an idea through the multi-stage workflow.
- **SC-006:** An admin can request revision and the submitter can resubmit.
- **SC-007:** Blind review hides author identity during active review.
- **SC-008:** Admin users can score ideas and see composite score summaries.
- **SC-009:** Submitters cannot view score data.
- **SC-010:** `npm test` passes.
- **SC-011:** Project summary follows the final deliverables template.
- **SC-012:** SpecKit artifacts document the completed full portal scope.

## 9. Current Completion Statement

All 7 phases are complete. Phase 1 artifacts remain as historical MVP evidence, and the completed Phase 2-7 scope is documented in `specs/002-full-portal-phases-2-7/