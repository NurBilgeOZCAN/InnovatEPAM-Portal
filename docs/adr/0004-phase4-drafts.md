# ADR 0004 - Phase 4 Draft Management

## Status

Accepted.

## Context

Submitters need to save incomplete ideas, edit them later, and submit them only when ready. The existing `ideas` table already contains most fields needed for both drafts and submitted ideas.

## Decision

Store drafts in the existing `ideas` table with `status = 'draft'`.

Draft behavior:

- Drafts use lenient validation.
- Draft title must not be empty.
- Description and required extra fields can be incomplete while the idea remains a draft.
- Drafts are visible only to their owner.
- Admin idea lists exclude drafts.
- Submitting a draft runs full idea validation.
- Valid draft submission changes status to `submitted`.

API surface:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/drafts` | List current user's drafts |
| `POST` | `/api/drafts` | Create draft |
| `GET` | `/api/drafts/:id` | Read draft |
| `PATCH` | `/api/drafts/:id` | Update draft |
| `DELETE` | `/api/drafts/:id` | Delete draft |
| `POST` | `/api/drafts/:id/submit` | Promote draft to submitted idea |

## Consequences

Positive:

- No separate draft table is needed.
- Promotion from draft to submitted idea is simple.
- Attachments can be reused through the existing attachment relationship.
- Drafts remain isolated from admin review flows.

Tradeoffs:

- Queries must explicitly exclude `status = 'draft'` where normal ideas are expected.
- `draft` is intentionally outside the normal review status list.