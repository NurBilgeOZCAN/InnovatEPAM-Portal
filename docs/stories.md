# User Stories - InnovatEPAM Portal

## Epic 1 - Authentication and Role Access

### Story 1.1 - Register Account

As a new user, I want to register with my name, email, password, and role so that I can access the innovation portal.

Acceptance criteria:

- The user can enter name, email, password, and role.
- Email must be valid.
- Password must be at least 8 characters and include letters and numbers.
- Duplicate emails are rejected.
- Registered users can login after account creation.

### Story 1.2 - Login and Logout

As a registered user, I want to login and logout so that my portal activity is protected.

Acceptance criteria:

- Valid credentials create an authenticated session.
- Invalid credentials are rejected.
- Logout clears the active session.
- Protected routes redirect unauthenticated users to login.

### Story 1.3 - Role-Based Access

As a portal user, I want the system to respect my role so that I only see actions I am allowed to perform.

Acceptance criteria:

- Submitters can create and view their own ideas.
- Admins can view all non-draft ideas.
- Submitters cannot access admin review actions.
- Submitters cannot access score endpoints.

## Epic 2 - Core Idea Submission

### Story 2.1 - Submit Idea

As a submitter, I want to submit an idea with title, description, and category so that it can enter the evaluation workflow.

Acceptance criteria:

- Title is required and must be at least 5 characters.
- Description is required and must be at least 20 characters.
- Category must be selected from the configured category list.
- Submitted ideas start with `submitted` status.
- A status history entry is created when the idea is submitted.

### Story 2.2 - Attach Supporting File

As a submitter, I want to attach supporting material so that evaluators can understand my idea better.

Acceptance criteria:

- The submitter can add file attachments during submission.
- Attachment metadata is stored.
- Attachments can be listed with the idea.
- Attachments can be downloaded through the attachment endpoint.

## Epic 3 - Idea Listing and Tracking

### Story 3.1 - Submitter Idea Board

As a submitter, I want to see my submitted ideas so that I can track their status.

Acceptance criteria:

- Submitters see only their own non-draft ideas.
- Each idea card shows title, category, status, and update time.
- Each idea card shows status history.
- Drafts are not mixed into the submitted idea board.

### Story 3.2 - Admin Idea Board

As an evaluator admin, I want to see all submitted ideas so that I can manage review work.

Acceptance criteria:

- Admins see all non-draft ideas.
- Admins do not see submitter-only draft records.
- Admins can inspect idea details and history.
- Admins can access review controls.

## Epic 4 - Basic Evaluation Workflow

### Story 4.1 - Update Review Status

As an evaluator admin, I want to update an idea's review status so that submitters know the decision state.

Acceptance criteria:

- Admins can move an idea to `under-review`.
- Admins can accept an idea.
- Admins can reject an idea.
- Accepted/rejected decisions require a comment.
- Every status change creates a history entry.

## Epic 5 - Smart Submission Forms

### Story 5.1 - Category-Specific Fields

As a submitter, I want the submission form to change based on the selected category so that I can provide relevant information for my idea.

Acceptance criteria:

- Category definitions come from the backend.
- The frontend does not hard-code category-specific fields.
- Required category-specific fields are validated.
- Unknown extra-field keys are rejected.
- Extra field values are displayed on idea cards.

### Story 5.2 - Category Guidance

As a submitter, I want guidance text for category-specific fields so that I know what information to provide.

Acceptance criteria:

- Field labels and help text are returned by `GET /api/categories`.
- The UI displays helpful labels or hints for extra fields.
- Select fields show only configured options.

## Epic 6 - Multi-Media Support

### Story 6.1 - Attach Multiple Files

As a submitter, I want to attach multiple files so that I can provide richer supporting material.

Acceptance criteria:

- A maximum of 5 files can be attached.
- Total size is limited to 8 MB.
- Attachment metadata is stored in the `attachments` table.
- Attachments can be downloaded or previewed where supported.

### Story 6.2 - Preserve Legacy Attachment Access

As a reviewer, I want existing attachment links to continue working so that old demo data is not broken.

Acceptance criteria:

- Legacy single-attachment route remains available.
- Legacy route returns the first attachment for an idea.
- New ideas use the `attachments` table.

## Epic 7 - Draft Management

### Story 7.1 - Save Draft

As a submitter, I want to save incomplete ideas as drafts so that I can finish them later.

Acceptance criteria:

- Drafts allow partial information.
- Draft title must not be empty.
- Drafts can be saved without full submitted-idea validation.
- Drafts are visible only to their owner.
- Admins do not see drafts.

### Story 7.2 - Edit Draft

As a submitter, I want to edit my drafts so that I can improve an idea before submission.

Acceptance criteria:

- Submitters can update draft title, description, category, extra fields, and attachments.
- Attachment updates reconcile removed and newly added files.
- Users cannot edit another user's draft.

### Story 7.3 - Submit Draft

As a submitter, I want to submit a valid draft so that it enters the review pipeline.

Acceptance criteria:

- Full idea validation runs before draft submission.
- A valid draft becomes `submitted`.
- The submitted idea appears on the normal idea board.
- The draft no longer appears in the draft list.

### Story 7.4 - Delete Draft

As a submitter, I want to delete a draft so that I can remove ideas I no longer want to submit.

Acceptance criteria:

- Submitters can delete their own drafts.
- Deleting a draft removes related attachments.
- Users cannot delete another user's draft.

## Epic 8 - Multi-Stage Review

### Story 8.1 - Review Ideas Through Stages

As an evaluator admin, I want to move ideas through multiple review stages so that evaluation is structured.

Acceptance criteria:

- The review pipeline has four stages.
- The stages are Initial Screening, Technical Review, Business Impact, and Final Selection.
- Admins can approve a stage.
- Admins can reject an idea at a stage.
- Admins can request revision at a stage.
- Stage actions create history entries.

### Story 8.2 - Request Revision

As an evaluator admin, I want to request revisions so that submitters can improve promising ideas.

Acceptance criteria:

- Revision requests return the idea to the submitter.
- Revision requests include a comment.
- The idea stores the stage that requested revision.
- Resubmitted revisions return to the correct stage.

### Story 8.3 - Resubmit Revision

As a submitter, I want to edit and resubmit a revision-requested idea so that it can continue review.

Acceptance criteria:

- The submitter can update the idea content when revision is requested.
- The submitter cannot edit accepted or rejected ideas.
- Resubmission clears the revision flag.
- Resubmission returns the idea to the stage that requested revision.

## Epic 9 - Blind Review

### Story 9.1 - Anonymous Evaluation

As a submitter, I want to submit an idea anonymously so that the review can be unbiased.

Acceptance criteria:

- Blind review can be enabled at submission time.
- Admin can enable it before review starts.
- Author identity is hidden from non-author viewers during active review.
- The author can still see their own identity.
- Identity is revealed after accepted/rejected decision.

### Story 9.2 - Lock Blind Review After Review Starts

As an evaluator admin, I want blind review settings to lock after review begins so that review integrity is preserved.

Acceptance criteria:

- Blind review can be toggled before any stage action.
- Blind review cannot be toggled after a stage action.
- The API returns a conflict response if toggling is attempted too late.

## Epic 10 - Scoring System

### Story 10.1 - Score Ideas

As an evaluator admin, I want to score ideas across multiple dimensions so that ideas can be compared fairly.

Acceptance criteria:

- Scores use 1-5 values.
- Dimensions are Impact, Feasibility, Effort, and Innovation.
- Scores can be upserted by evaluator, idea, stage, and dimension.
- Invalid dimensions are rejected.
- Out-of-range values are rejected.

### Story 10.2 - Composite Score

As an evaluator admin, I want to see a composite score so that I can rank ideas consistently.

Acceptance criteria:

- The system calculates per-dimension averages.
- The system calculates a composite score.
- Effort is inverted in the composite score.
- Ideas can be sorted by composite score.

### Story 10.3 - Score Privacy

As a submitter, I should not see evaluator scoring details so that the review process remains internal.

Acceptance criteria:

- Submitters cannot call score write endpoints.
- Submitters cannot call score read endpoints.
- Submitters do not see score summaries on idea cards.