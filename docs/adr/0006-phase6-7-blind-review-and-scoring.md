# ADR 0006 - Phase 6 and 7: Blind Review and Scoring

## Status

Accepted.

## Context

The final phases require unbiased evaluation and structured scoring. These features must preserve role boundaries and keep submitter-facing views separate from evaluator-only data.

## Decision

### Phase 6 - Blind Review

Add `blind_review` flag to `ideas`.

Blind review behavior:

- Submitter can request blind review during idea submission.
- Admin can enable blind review before review begins.
- Author identity is hidden from non-author viewers while the idea is non-terminal.
- Author identity is revealed when the idea is accepted or rejected.
- Blind review cannot be toggled after any stage action has occurred.
- An anonymized handle is generated deterministically for display.

Endpoint:

```text
POST /api/ideas/:id/blind-review
```

### Phase 7 - Scoring System

Add `scores` table with one row per evaluator, idea, stage, and dimension.

Score dimensions:

| Dimension | Range | Composite Rule |
|---|---|---|
| Impact | 1-5 | Normal |
| Feasibility | 1-5 | Normal |
| Effort | 1-5 | Inverted with `6 - value` |
| Innovation | 1-5 | Normal |

Endpoints:

```text
POST /api/ideas/:id/scores
GET /api/ideas/:id/scores
```

## Access Rules

- Score write is admin-only.
- Score read is admin-only.
- Submitters cannot access score endpoints.
- Submitter idea cards do not show score summaries.
- Admin idea cards show score summaries and composite score.

## Consequences

Positive:

- Blind review supports fair evaluation.
- Score dimensions make evaluator decisions more structured.
- Composite scoring supports ranking and comparison.
- Role boundaries are explicit and testable.

Tradeoffs:

- Scores are evaluator-internal data and require careful visibility handling.
- Composite score is a demo-friendly heuristic and may need governance before production use.