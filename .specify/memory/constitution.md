<!--
Sync Impact Report
- Version change: 1.0.0 -> 2.0.0
- Modified principles:
  - Local-first Phase 1 storage -> Local-demo SQLite source of truth
  - Dependency-free MVP only -> Minimal dependency local runtime with better-sqlite3
  - Phase 1-only scope -> Completed 7-phase scope
- Added sections:
  - Full Phase Traceability
  - SQLite Runtime Boundaries
  - Documentation Alignment Rules
- Removed sections:
  - Browser localStorage as mandatory primary persistence
- Templates requiring updates:
  - ✅ specs/002-full-portal-phases-2-7/spec.md
  - ✅ specs/002-full-portal-phases-2-7/plan.md
  - ✅ specs/002-full-portal-phases-2-7/tasks.md
  - ✅ docs/prd.md
  - ✅ docs/stories.md
  - ✅ README.md
- Follow-up TODOs: none
-->

# InnovatEPAM Portal Constitution

## Core Principles

### I. Local Demo Reliability

The project MUST run fully on a local machine for the course demo. Core behavior MUST NOT depend on rented infrastructure, cloud-hosted databases, email services, or third-party APIs. The local runtime MAY use a native dependency when documented by ADR and required for completed phases.

Rationale: Course showcase reliability requires a predictable local environment.

### II. SQLite Source of Truth

The completed portal MUST use SQLite as the source of truth for users, sessions, ideas, attachments, drafts, review history, blind review state, and scores. Browser storage MAY be used only for non-authoritative UI state.

Rationale: Phases 2-7 require server-side persistence and shared admin/submitter state.

### III. Full Phase Traceability

The repository MUST document and preserve evidence for all 7 completed phases:

1. Core Portal.
2. Smart Submission Forms.
3. Multi-Media Support.
4. Draft Management.
5. Multi-Stage Review.
6. Blind Review.
7. Scoring System.

Rationale: Final course deliverables require a clear completed-phase checklist and implementation trace.

### IV. Role-Safe Workflow Integrity

Submitter/admin boundaries MUST be enforced server-side. Draft ownership, admin review actions, blind-review controls, and score access MUST be validated by API logic, not only by UI visibility.

Rationale: The portal's core value is accountable and fair idea lifecycle management.

### V. Auditable Decisions

Status changes, stage actions, terminal decisions, and revision requests MUST produce history entries. Accepted/rejected decisions and revision requests MUST include comments.

Rationale: Evaluation decisions must be explainable during demo and review.

### VI. Test Gates Before Demo-Ready

Behavioral changes MUST pass `npm test`. Browser smoke validation SHOULD pass with `npm run smoke:edge` when Microsoft Edge/CDP is available.

Rationale: Automated checks provide the minimum confidence needed for a stable demo.

## Technical Boundaries and Scope

- Runtime MUST remain local-demo friendly.
- SQLite database path SHOULD remain `data/innovatepam.db`.
- Native dependency `better-sqlite3` is accepted by ADR 0002.
- The project MUST NOT require a public hosted database for the course presentation.
- Attachments MAY be stored as SQLite blobs for the course demo.
- Production concerns such as SSO, object storage, bcrypt, migrations, email notifications, and cloud hosting remain out of scope unless explicitly added later.

## Documentation Alignment Rules

- `README.md` MUST list all completed phases and current run/test commands.
- `PROJECT_SUMMARY.md` MUST follow the final deliverables template.
- `docs/prd.md` MUST describe the current 7-phase scope.
- `docs/stories.md` MUST include stories for phases 1-7.
- `docs/adr/` MUST record major technical decisions.
- `specs/001-phase1-mvp/` MAY remain as Phase 1 historical evidence.
- `specs/002-full-portal-phases-2-7/` MUST represent the completed full-portal SpecKit artifacts.

## Delivery Workflow and Quality Gates

1. Read or update the relevant story before changing behavior.
2. Check the matching ADR or create a new ADR for architectural changes.
3. Update tests for new behavior.
4. Run:

```powershell
npm test
```

5. Before demo, also run when available:

```powershell
npm run smoke:edge
```

6. Update README, PROJECT_SUMMARY, PRD, stories, and SpecKit artifacts when scope changes.

## Governance

This constitution supersedes conflicting Phase 1-only process notes for the completed 7-phase project.

Amendments require:

1. Written rationale.
2. Scope and template impact notes.
3. Updated Sync Impact Report.
4. Version update following semantic versioning.

Versioning policy:

- MAJOR: backward-incompatible principle redefinition.
- MINOR: new principle or materially expanded obligation.
- PATCH: clarification or wording correction.

**Version**: 2.0.0 | **Ratified**: 2026-05-14 | **Last Amended**: 2026-05-14