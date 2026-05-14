# Data Model: InnovatEPAM Portal Phase 1 MVP

## Entity: User
- Purpose: Represents an authenticated person who can submit or review ideas.
- Fields:
  - id: string, unique identifier.
  - name: string, required, minimum 2 characters.
  - email: string, required, normalized lowercase, unique.
  - role: enum, submitter | admin.
  - passwordHash: string, internal only, never exposed in public response objects.
  - createdAt: ISO timestamp.
- Relationships:
  - One user can author many ideas.
  - One admin can create many review history entries.

## Entity: Session
- Purpose: Tracks current logged-in user in browser session storage.
- Fields:
  - userId: string, references User.id.
- Validation:
  - Protected routes require a valid authenticated session.

## Entity: Idea
- Purpose: Represents an innovation proposal submitted by a submitter.
- Fields:
  - id: string, unique identifier.
  - title: string, required, minimum 5 characters, max 90.
  - description: string, required, minimum 20 characters.
  - category: enum from allowed category list.
  - authorId: string, references User.id.
  - status: enum, submitted | under-review | accepted | rejected.
  - attachment: Attachment | null.
  - createdAt: ISO timestamp.
  - updatedAt: ISO timestamp.
  - history: array of StatusHistoryEntry.
- Relationships:
  - Each idea belongs to one submitter author.
  - Each idea has zero or one attachment.
  - Each idea has one or more status history entries.

## Entity: Attachment
- Purpose: Stores one supporting file for an idea.
- Fields:
  - name: string.
  - type: string MIME type.
  - size: number of bytes.
  - dataUrl: string for browser-local persistence.
  - uploadedAt: ISO timestamp.
- Validation:
  - Maximum one attachment per idea.
  - File size constrained by UI rule (2 MB).

## Entity: StatusHistoryEntry
- Purpose: Immutable audit trail for lifecycle changes.
- Fields:
  - status: enum, submitted | under-review | accepted | rejected.
  - comment: string, required for accepted and rejected.
  - actorId: string, references User.id.
  - at: ISO timestamp.
- Validation:
  - accepted/rejected transitions require evaluator comment.

## State Transitions
- submitted -> under-review
- submitted -> accepted (comment required)
- submitted -> rejected (comment required)
- under-review -> accepted (comment required)
- under-review -> rejected (comment required)

## Persistence Model
- Application state key: innovatepam.portal.v1 in localStorage.
- Session key: innovatepam.session.userId in sessionStorage.
- Additional UX flags in localStorage (onboarding/guide/theme) do not alter domain state validity.
