# ADR 0005 - Phase 5 Multi-Stage Review

## Status

Accepted.

## Context

A flat submitted/under-review/accepted/rejected workflow is not enough for the full InnovatEPAM evaluation process. The course project expects a multi-stage review pipeline with structured decisions and revision support.

## Decision

Introduce a four-stage review pipeline:

| Order | ID | Label |
|---|---|---|
| 1 | `initial-screening` | Initial Screening |
| 2 | `technical-review` | Technical Review |
| 3 | `business-impact` | Business Impact |
| 4 | `final-selection` | Final Selection |

Add review fields to the `ideas` table:

- `current_stage`.
- `revision_requested`.
- `revision_from_stage`.

Add `stage` to `idea_history`.

Stage actions are handled by:

```text
POST /api/ideas/:id/stage-action
```

Supported actions:

- `approve`.
- `reject`.
- `request-revision`.

## Workflow Rules

- First stage action moves a submitted idea into review.
- Approving a non-final stage advances to the next stage.
- Approving the final stage accepts the idea.
- Rejecting at any stage rejects the idea.
- Requesting revision returns the idea to submitter-editable state.
- Resubmission returns the idea to the stage that requested revision.
- Stage actions are admin-only.

## Consequences

Positive:

- The review workflow matches the full project brief.
- Stage history is auditable.
- Revision loops are supported without creating duplicate ideas.

Tradeoffs:

- Idea status and current stage must be interpreted together.
- The UI must clearly show both lifecycle status and review stage.
````

## `docs/adr/0006-phase6-7-blind-review-and-scoring.md`