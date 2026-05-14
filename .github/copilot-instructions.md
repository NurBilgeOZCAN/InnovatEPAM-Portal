# GitHub Copilot Instructions - InnovatEPAM Portal

<!-- SPECKIT START -->
For additional context about technologies, project structure, shell commands, product requirements, implementation plan, completed phase scope, data model, and API contracts, read these files before making changes:

- specs/001-phase1-mvp/plan.md
- specs/002-full-portal-phases-2-7/spec.md
- specs/002-full-portal-phases-2-7/plan.md
- specs/002-full-portal-phases-2-7/tasks.md
- specs/002-full-portal-phases-2-7/data-model.md
- specs/002-full-portal-phases-2-7/contracts/api-contract.md
- docs/prd.md
- docs/stories.md
- docs/constitution.md
- AGENTS.md
<!-- SPECKIT END -->

## Project Context

This repository contains the completed 7-phase InnovatEPAM Portal course project.

Do not treat the project as Phase 1-only. The current implementation includes:

1. Core Portal MVP
2. Smart Submission Forms
3. Multi-Media Support
4. Draft Management
5. Multi-Stage Review
6. Blind Review
7. Scoring System

The current source of truth is the local SQLite database created at:

```text
data/innovatepam.db
```

Do not reintroduce outdated assumptions such as localStorage-only persistence, single attachment only, no backend, drafts out of scope, multi-stage review out of scope, blind review out of scope, or scoring out of scope.

## Development Commands

```powershell
npm install
npm test
npm start
```

Optional smoke test:

```powershell
npm run smoke:edge
```

## Documentation Rule

When code behavior changes, keep these files aligned:

```text
README.md
PROJECT_SUMMARY.md
docs/prd.md
docs/stories.md
docs/constitution.md
docs/adr/
specs/002-full-portal-phases-2-7/
```