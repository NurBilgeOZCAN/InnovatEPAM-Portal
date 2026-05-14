# ADR 0003 - Phase 2 and 3 Extensions: Smart Forms and Multi-Media

## Status

Accepted.

## Context

Phase 2 requires dynamic category-specific fields. Phase 3 requires multiple file attachments with preview/download behavior. Both features extend the Phase 1 idea submission model.

## Decision

### Phase 2 - Smart Submission Forms

- Keep category definitions in `src/server/domain.js`.
- Expose category definitions through `GET /api/categories`.
- Let the frontend render fields dynamically based on the selected category.
- Store extra values as JSON in `ideas.extra_fields`.
- Validate required extra fields when the extra field block is provided.
- Reject unknown field keys to prevent inconsistent data.

### Phase 3 - Multi-Media Support

- Add a dedicated `attachments` table.
- Support `attachments: [{ name, type, size, dataUrl }]` in idea creation.
- Enforce maximum 5 files.
- Enforce maximum 8 MB total size.
- Keep attachment blobs out of idea list responses.
- Fetch blobs through `GET /api/attachments/:id`.
- Keep `GET /api/ideas/:id/attachment` as a legacy compatibility route.

## Consequences

Positive:

- Backend remains the source of truth for category fields.
- Frontend and backend category definitions cannot drift.
- Multi-file support is normalized into its own table.
- Legacy attachment behavior remains available.

Tradeoffs:

- Storing blobs in SQLite is acceptable for a course demo but not ideal for large-scale production.
- Base64/dataUrl upload avoids multipart dependencies but is less efficient than streaming uploads.