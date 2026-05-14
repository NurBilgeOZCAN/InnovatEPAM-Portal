# Quickstart: InnovatEPAM Portal Phase 1 MVP

## Goal
Run and validate the existing MVP implementation for Friday demo readiness without changing app behavior.

## Prerequisites
- Node.js installed.
- Microsoft Edge installed for smoke flow.
- Repository checked out on branch 001-run-feature-hook.

## Run Locally
1. rtk npm start
2. Open http://localhost:4173

## Validation Flow
1. Run unit checks:
   - rtk npm test
2. Run browser runtime smoke flow:
   - rtk npm run smoke:edge
3. Confirm both commands pass before demo sign-off.
4. For SC-002 tracking, execute 10 local timed demo runs for registration/sign-in,
   then record median duration and overall pass-rate.

## Friday Demo Flow
1. Start on login route.
2. Submitter demo login (aylin@epam.local).
3. Submit idea with title, description, category, and one attachment.
4. Confirm idea appears on dashboard and in filters.
5. Logout.
6. Evaluator Admin (admin role) demo login (admin@innovatepam.local).
7. Find submitted idea, set accepted or rejected, provide required comment.
8. Verify status and history entry updated.

## Architecture and File Responsibilities
- index.html: app shell structure and route sections.
- src/styles.css: visual design and state styling.
- src/app.js: client orchestration, routes, forms, DOM rendering, UI events.
- src/portal-core.js: domain rules, validation, role enforcement, state mutations.
- server.js: static server for local runtime.
- tests/portal-core.test.mjs: unit coverage for core behavior and role rules.
- scripts/edge-smoke.mjs: end-to-end runtime checks in Edge.

## Scope Notes
- Smart Submission Form remains optional future scope.
- No backend/database, multi-stage review, scoring, blind review, drafts, or multimedia in Phase 1.
