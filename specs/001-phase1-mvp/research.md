# Research: InnovatEPAM Portal Phase 1 MVP

## Decision 1: Keep runtime local-first with browser persistence only
- Decision: Keep all application data in browser localStorage under innovatepam.portal.v1 and keep sessions in sessionStorage.
- Rationale: Friday demo reliability is highest when no external services are required.
- Alternatives considered:
  - Browser IndexedDB: more complex than needed for MVP.
  - Remote API/database: out of scope and increases environment risk.

## Decision 2: Keep dependency-free web stack for MVP
- Decision: Continue with plain HTML/CSS/JavaScript ES modules and a Node static file server.
- Rationale: Existing MVP is already working, test-covered, and aligned with constitution constraints.
- Alternatives considered:
  - Frontend framework adoption: unnecessary migration cost and risk for current scope.
  - Build tooling introduction: adds complexity without clear MVP benefit.

## Decision 3: Preserve domain logic in core module and keep UI as orchestration
- Decision: Keep validation and business rules in src/portal-core.js and keep route/form rendering behavior in src/app.js.
- Rationale: This supports fast validation with unit tests and reduces UI-side logic duplication.
- Alternatives considered:
  - Move all logic into UI handlers: weaker testability and higher regression risk.
  - Move all logic server-side: conflicts with local-first MVP constraints.

## Decision 4: Keep two required quality gates for demo readiness
- Decision: Continue using npm test and npm run smoke:edge as release gates.
- Rationale: Unit tests verify core rule correctness and smoke tests verify complete runtime flow in Edge.
- Alternatives considered:
  - Unit tests only: misses end-to-end route and UI integration regressions.
  - Manual demo only: too error-prone for repeatable sign-off.

## Decision 5: Keep Smart Submission Form as optional future scope
- Decision: Exclude Smart Submission Form from implementation commitment in this plan.
- Rationale: Mandatory scope is already sufficient for Friday demo and fully represented in existing MVP behavior.
- Alternatives considered:
  - Include now: creates scope risk and jeopardizes stable demo delivery.
