# Data Model: Full InnovatEPAM Portal

## Entity: User

Purpose: Represents a portal account.

Fields:

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT | Primary key |
| `name` | TEXT | Display name |
| `email` | TEXT | Unique login email |
| `role` | TEXT | `submitter` or `admin` |
| `password_hash` | TEXT | Demo hash, not production-grade |
| `created_at` | TEXT | ISO timestamp |

Relationships:

- One user can author many ideas.
- One admin can create many review history entries.
- One admin can create many score entries.

## Entity: Session

Purpose: Tracks authenticated sessions.

Fields:

| Field | Type | Notes |
|---|---|---|
| `token` | TEXT | Primary key |
| `user_id` | TEXT | References `users.id` |
| `created_at` | TEXT | ISO timestamp |

## Entity: Idea

Purpose: Represents both submitted ideas and drafts.

Fields:

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT | Primary key |
| `title` | TEXT | Required |
| `description` | TEXT | Required for submitted ideas |
| `category` | TEXT | One configured category |
| `author_id` | TEXT | References `users.id` |
| `status` | TEXT | `draft`, `submitted`, `under-review`, `accepted`, `rejected` |
| `attachment_name` | TEXT | Legacy column |
| `attachment_type` | TEXT | Legacy column |
| `attachment_size` | INTEGER | Legacy column |
| `attachment_blob` | BLOB | Legacy column |
| `extra_fields` | TEXT | JSON object string |
| `current_stage` | TEXT | Current review stage id |
| `revision_requested` | INTEGER | 0 or 1 |
| `revision_from_stage` | TEXT | Stage that requested revision |
| `blind_review` | INTEGER | 0 or 1 |
| `created_at` | TEXT | ISO timestamp |
| `updated_at` | TEXT | ISO timestamp |

Validation:

- Submitted title minimum 5 characters.
- Submitted description minimum 20 characters.
- Category must be configured.
- Required extra fields must be present for submitted ideas.
- Draft title must not be empty.

## Entity: Attachment

Purpose: Stores supporting files for ideas and drafts.

Fields:

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT | Primary key |
| `idea_id` | TEXT | References `ideas.id`, cascade delete |
| `name` | TEXT | File name |
| `type` | TEXT | MIME type |
| `size` | INTEGER | Size in bytes |
| `blob` | BLOB | File content |
| `uploaded_at` | TEXT | ISO timestamp |

Validation:

- Maximum 5 attachments per idea.
- Maximum 8 MB total attachment size.

## Entity: IdeaHistoryEntry

Purpose: Audit trail for idea lifecycle and review actions.

Fields:

| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `idea_id` | TEXT | References `ideas.id` |
| `status` | TEXT | Resulting status |
| `comment` | TEXT | Required for important review decisions |
| `actor_id` | TEXT | References `users.id` |
| `at` | TEXT | ISO timestamp |
| `stage` | TEXT | Optional review stage id |

## Entity: ReviewStage

Purpose: Defines ordered review gates.

Configured in code:

| Order | ID | Label |
|---|---|---|
| 1 | `initial-screening` | Initial Screening |
| 2 | `technical-review` | Technical Review |
| 3 | `business-impact` | Business Impact |
| 4 | `final-selection` | Final Selection |

## Entity: Score

Purpose: Stores evaluator scoring data for ideas.

Fields:

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT | Primary key |
| `idea_id` | TEXT | References `ideas.id`, cascade delete |
| `evaluator_id` | TEXT | References `users.id` |
| `stage` | TEXT | Stage id or null |
| `dimension` | TEXT | Score dimension id |
| `value` | INTEGER | 1-5 |
| `comment` | TEXT | Optional evaluator note |
| `created_at` | TEXT | ISO timestamp |

Unique constraint:

```text
UNIQUE(idea_id, evaluator_id, stage, dimension)
```

Dimensions:

| ID | Label | Range | Composite Rule |
|---|---|---|---|
| `impact` | Impact | 1-5 | Normal |
| `feasibility` | Feasibility | 1-5 | Normal |
| `effort` | Effort | 1-5 | Inverted as `6 - value` |
| `innovation` | Innovation | 1-5 | Normal |

## State Transitions

```text
draft -> submitted
submitted -> under-review
under-review -> under-review at next stage
under-review -> submitted when revision requested
submitted with revision_requested=1 -> under-review at revision_from_stage
under-review -> accepted
under-review -> rejected
```

## Visibility Rules

- Submitter sees own non-draft ideas.
- Submitter sees own drafts.
- Admin sees all non-draft ideas.
- Admin does not see drafts in normal idea list.
- Submitter cannot see scores.
- Admin can see score summaries.
- Blind review hides author identity from non-author viewers during active review.