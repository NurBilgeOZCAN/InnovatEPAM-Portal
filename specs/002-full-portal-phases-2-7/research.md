# Research Notes: Full InnovatEPAM Portal

## Decision Area: Persistence

### Options Considered

1. Browser `localStorage`.
2. JSON file persistence.
3. SQLite.
4. Hosted database.

### Decision

Use SQLite through `better-sqlite3`.

### Rationale

SQLite provides durable local persistence without requiring hosted infrastructure. It supports relational data for users, sessions, ideas, attachments, history, drafts, and scores. It is appropriate for a local course demo and more realistic than browser-only storage.

## Decision Area: Attachments

### Options Considered

1. Store files in browser storage.
2. Store base64 blobs in JSON.
3. Store blobs in SQLite.
4. Use object storage.

### Decision

Store attachment blobs in SQLite for the demo.

### Rationale

The course project runs locally and should not require S3/GCS. SQLite blobs are acceptable for small demo files with clear limits: maximum 5 files and maximum 8 MB total.

## Decision Area: Dynamic Forms

### Options Considered

1. Hard-code fields in frontend.
2. Store field definitions in database.
3. Define fields in backend domain constant and expose through API.

### Decision

Define category fields in the backend domain layer and expose them with `GET /api/categories`.

### Rationale

This avoids frontend/backend drift and keeps the implementation simple. A database-driven form builder is unnecessary for the course sprint.

## Decision Area: Drafts

### Options Considered

1. Separate `drafts` table.
2. Same `ideas` table with `status = 'draft'`.

### Decision

Use the same `ideas` table with `status = 'draft'`.

### Rationale

Drafts share most fields with submitted ideas. Promotion becomes a status update. Drafts can reuse attachments and ownership logic.

## Decision Area: Multi-Stage Review

### Options Considered

1. Hard-code one flat status flow.
2. Store stages in database.
3. Define ordered stages in domain constant.

### Decision

Define ordered stages in `STAGES` constant.

### Rationale

The course project specifies a fixed four-stage pipeline. A domain constant is clear, testable, and sufficient.

## Decision Area: Blind Review

### Options Considered

1. Duplicate anonymized idea records.
2. Hide identity dynamically in response mapping.
3. Permanently remove author identity.

### Decision

Keep real author identity in the database and mask identity dynamically in API responses for non-author viewers during active blind review.

### Rationale

This preserves ownership and auditability while meeting the anonymous evaluation requirement.

## Decision Area: Scoring

### Options Considered

1. Store one total score on ideas.
2. Store one score row per evaluator.
3. Store one row per evaluator, idea, stage, and dimension.

### Decision

Store one row per evaluator, idea, stage, and dimension.

### Rationale

This structure supports upsert behavior, stage-aware scoring, per-dimension averages, and composite score calculation.