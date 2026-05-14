# ADR 0001 - Local-First No-Dependency Phase 1 MVP

## Status

Accepted for Phase 1. Superseded for persistence by ADR 0002 after the project advanced to phases 2-7.

## Context

The initial sprint goal was to produce a working Phase 1 MVP quickly and reliably for a local demo. Phase 1 required authentication, submitter/admin roles, idea submission, single attachment support, idea listing, status tracking, and basic admin evaluation.

At the beginning of the project, minimizing installation and infrastructure risk was more important than building a production persistence layer.

## Decision

The Phase 1 baseline was built as a local-first MVP:

- Browser UI with HTML, CSS, and JavaScript ES modules.
- Node local server for static runtime.
- Pure domain rules isolated from UI behavior.
- Local demo workflow with seeded accounts.
- Automated tests using Node's built-in test runner.

## Phase 1 Completion Evidence

Phase 1 delivered:

- Registration, login, and logout.
- Submitter and evaluator admin roles.
- Idea submission.
- File attachment support.
- Role-aware idea board.
- Status history.
- Admin evaluation actions.

## Consequences

Positive:

- The MVP became demoable quickly.
- The core domain rules were easy to test.
- The UI and behavior were simple enough for the sprint timeline.

Tradeoffs:

- Browser-only persistence was not enough for later phases.
- Multi-user review, draft management, scoring, and attachments required server-side storage.

## Follow-Up

ADR 0002 introduced SQLite as the local source of truth when the project expanded beyond Phase 1.
