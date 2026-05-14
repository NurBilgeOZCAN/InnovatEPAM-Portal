# ADR 0002 - SQLite Backend for Completed Portal

## Status

Accepted. Supersedes ADR 0001 persistence approach for phases 2-7.

## Context

Phases 2-7 require reliable server-side persistence for users, sessions, ideas, attachments, drafts, review history, blind review state, and scoring. Browser-only localStorage is not appropriate for multi-role admin/submitter workflows or attachment data.

The project still needs to remain local-demo friendly and avoid rented infrastructure for the presentation.

## Decision

Use SQLite through `better-sqlite3` as the local persistence layer.

- Database file: `data/innovatepam.db`.
- SQLite WAL mode enabled.
- Foreign keys enabled.
- Idempotent schema initialization on startup.
- Demo seed data created when users table is empty.
- API served through Node's built-in HTTP module.
- Session tokens stored in a `sessions` table and returned as HTTP-only cookies.

## Schema Areas

- `users` for submitter and admin accounts.
- `sessions` for authenticated sessions.
- `ideas` for submitted ideas and drafts.
- `idea_history` for audit trail.
- `attachments` for multi-file support.
- `scores` for Phase 7 scoring.

## Consequences

Positive:

- Data persists across local server restarts.
- Admin and submitter users share the same local state.
- Later phases can be represented cleanly.
- The demo still avoids hosted infrastructure.

Tradeoffs:

- `npm install` is required because `better-sqlite3` is a native dependency.
- This is a local demo persistence strategy, not a production deployment architecture.
- Production would require stronger password hashing, session expiry, migrations, and managed database decisions.