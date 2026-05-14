# API Contract: Full InnovatEPAM Portal

Base URL for local runtime:

```text
http://localhost:4173
```

All protected endpoints require an authenticated session cookie.

## Auth

### POST `/api/auth/register`

Request:

```json
{
  "name": "Aylin Submitter",
  "email": "aylin@example.com",
  "password": "Submit123!",
  "role": "submitter"
}
```

Response: `201 Created`

```json
{
  "user": {
    "id": "user-id",
    "name": "Aylin Submitter",
    "email": "aylin@example.com",
    "role": "submitter"
  }
}
```

### POST `/api/auth/login`

Request:

```json
{
  "email": "admin@innovatepam.local",
  "password": "Admin123!"
}
```

Response: `200 OK`

### POST `/api/auth/logout`

Response: `200 OK`

### GET `/api/session`

Response: `200 OK` with current user or null session response.

## Reference Data

### GET `/api/categories`

Returns category list and category-specific field definitions.

### GET `/api/stages`

Returns review stages:

```json
[
  { "id": "initial-screening", "label": "Initial Screening", "order": 1 },
  { "id": "technical-review", "label": "Technical Review", "order": 2 },
  { "id": "business-impact", "label": "Business Impact", "order": 3 },
  { "id": "final-selection", "label": "Final Selection", "order": 4 }
]
```

### GET `/api/score-dimensions`

Returns Impact, Feasibility, Effort, and Innovation definitions.

## Ideas

### GET `/api/ideas`

Role behavior:

- Submitter receives own non-draft ideas.
- Admin receives all non-draft ideas.
- Drafts are excluded.
- Scores are included only for admin viewers.

### POST `/api/ideas`

Request:

```json
{
  "title": "AI-assisted idea triage",
  "description": "Use AI to route employee ideas to the right evaluator and reduce manual sorting.",
  "category": "AI and Automation",
  "extra_fields": {
    "model_or_tool": "Internal LLM triage assistant",
    "automation_target": "Evaluator routing"
  },
  "blind_review": true,
  "attachments": [
    {
      "name": "triage-outline.txt",
      "type": "text/plain",
      "size": 842,
      "dataUrl": "data:text/plain;base64,..."
    }
  ]
}
```

Response: `201 Created`

Validation:

- Title minimum 5 characters.
- Description minimum 20 characters.
- Category must be valid.
- Required extra fields must be present.
- Max 5 attachments.
- Max 8 MB total attachment size.

### PATCH `/api/ideas/:id`

Used by submitter to resubmit when revision is requested.

Rules:

- Submitter must own the idea.
- Idea must be in revision-requested state.
- Full idea validation applies.

## Attachments

### GET `/api/attachments/:id`

Returns attachment blob.

### GET `/api/ideas/:id/attachment`

Legacy route. Returns first attachment for the idea.

## Drafts

### GET `/api/drafts`

Returns current submitter's drafts.

### POST `/api/drafts`

Creates draft with lenient validation.

### GET `/api/drafts/:id`

Returns one draft if owned by current user.

### PATCH `/api/drafts/:id`

Updates draft fields and optionally reconciles attachments.

### DELETE `/api/drafts/:id`

Deletes draft if owned by current user.

### POST `/api/drafts/:id/submit`

Promotes draft to submitted idea after full validation.

## Multi-Stage Review

### POST `/api/ideas/:id/stage-action`

Admin-only.

Request:

```json
{
  "action": "approve",
  "comment": "Ready for technical review."
}
```

Supported actions:

- `approve`.
- `reject`.
- `request-revision`.

Rules:

- Reject requires comment.
- Request revision requires comment.
- Approving final stage accepts the idea.
- Request revision stores the current stage for resubmission.

### POST `/api/ideas/:id/revert-last-stage`

Admin-only demo/support endpoint for reverting last stage action when available.

## Blind Review

### POST `/api/ideas/:id/blind-review`

Admin-only after creation.

Request:

```json
{
  "enabled": true
}
```

Rules:

- Can be toggled before review begins.
- Returns conflict if review already started.
- Masks author identity during active review.

## Scores

### POST `/api/ideas/:id/scores`

Admin-only.

Request:

```json
{
  "stage": "technical-review",
  "scores": {
    "impact": 5,
    "feasibility": 4,
    "effort": 2,
    "innovation": 5
  },
  "comment": "Strong impact with manageable effort."
}
```

Rules:

- Dimensions must be configured.
- Values must be integers from 1 to 5.
- Effort is inverted in composite score.
- Upsert by idea, evaluator, stage, and dimension.

### GET `/api/ideas/:id/scores`

Admin-only. Returns raw score entries and summary.

## Demo

### POST `/api/demo/reset`

Resets local demo state and reseeds demo accounts/data.

## Error Format

Typical error response:

```json
{
  "error": "Human readable error message."
}
```

Common statuses:

- `400` validation error.
- `401` unauthenticated.
- `403` forbidden by role/ownership.
- `404` not found.
- `409` conflict such as blind-review lock.