# InnovatEPAM Portal - Project Summary

## Overview

InnovatEPAM Portal is a local-first employee innovation management platform built for the A201 Beyond Vibe Coding capstone sprint. It supports authenticated idea submission, category-specific smart forms, multi-file attachments, draft editing, multi-stage review, blind review, and multi-dimension scoring.

All 7 course project phases are completed and documented.

## Phases Completed

### Phase 1: Core Portal

- [x] User registration with email/password.
- [x] User login/logout.
- [x] Role-based access for submitter and evaluator admin.
- [x] Idea submission form with title, description, category, and validation.
- [x] File attachment support.
- [x] Idea listing page with role-aware visibility.
- [x] Status tracking with submitted, under-review, accepted, and rejected states.
- [x] Admin evaluation workflow with review comments.

### Phase 2: Smart Submission Forms

- [x] Dynamic form fields by category.
- [x] Category-specific guidance and validation.
- [x] Backend source of truth exposed by `GET /api/categories`.
- [x] Extra field values displayed on idea cards.

### Phase 3: Multi-Media Support

- [x] Multiple file attachments.
- [x] Maximum 5 files per idea.
- [x] Maximum 8 MB total attachment size.
- [x] Attachment metadata saved in SQLite.
- [x] Attachment preview/download endpoint.

### Phase 4: Draft Management

- [x] Save ideas as drafts.
- [x] Edit drafts before submission.
- [x] Delete drafts.
- [x] Promote valid drafts into the normal review pipeline.
- [x] Keep drafts private to their owner and hidden from admin review lists.

### Phase 5: Multi-Stage Review

- [x] Configurable four-stage evaluation pipeline.
- [x] Initial Screening stage.
- [x] Technical Review stage.
- [x] Business Impact stage.
- [x] Final Selection stage.
- [x] Stage-specific approve, reject, and request-revision actions.
- [x] Submitter revision loop.

### Phase 6: Blind Review

- [x] Anonymous evaluation mode.
- [x] Submitter opt-in at submission time.
- [x] Admin can enable blind review before review begins.
- [x] Author identity hidden during active review.
- [x] Identity revealed after accepted/rejected terminal decision.

### Phase 7: Scoring System

- [x] Multi-dimension scoring.
- [x] Impact, Feasibility, Effort, and Innovation score dimensions.
- [x] 1-5 score range validation.
- [x] Composite score aggregation and ranking.
- [x] Submitter score visibility blocked.
- [x] Admin score display on idea cards.

## Technical Decisions

### Technology Stack

- **Frontend:** Dependency-free HTML, CSS, and JavaScript ES modules.
- **Backend:** Node.js built-in HTTP server.
- **Database:** SQLite using `better-sqlite3`.
- **Persistence:** Local SQLite file at `data/innovatepam.db`.
- **Authentication:** Session-cookie authentication using opaque session tokens stored in SQLite.
- **Testing:** Node built-in test runner with coverage enabled.
- **Browser Smoke Test:** Microsoft Edge smoke flow through `scripts/edge-smoke.mjs`.

### Key Architecture Decisions

1. **Local-demo architecture instead of hosted deployment**  
   The application runs locally and avoids cloud/server dependency risk during the presentation.

2. **SQLite instead of browser-only storage**  
   Phase 1 started as a local MVP, but phases 2-7 required server-side persistence, shared admin/submitter visibility, attachments, drafts, scoring, and review history.

3. **Additive schema evolution**  
   Later phases use defensive migrations such as `CREATE TABLE IF NOT EXISTS` and column checks before `ALTER TABLE`.

4. **ADRs for phase decisions**  
   Each major architectural change is recorded under `docs/adr/`.

## Challenges & Solutions

### Challenge 1: Moving from localStorage to real persistence

**Solution:** The project was migrated to a local SQLite backend using `better-sqlite3`. This keeps the project demo-friendly while supporting multi-user workflows, attachments, drafts, review stages, and scoring.

### Challenge 2: Keeping later phases compatible with the Phase 1 MVP

**Solution:** The implementation uses additive schema migrations and keeps legacy routes where needed. Existing tests continue to pass while new phase-specific behavior is added.

### Challenge 3: Managing review complexity

**Solution:** The review workflow was modeled as a configurable four-stage pipeline. Stage actions, revision loops, blind review, and scoring are handled through dedicated API endpoints and documented ADRs.

### Challenge 4: Supporting attachments without adding a multipart dependency

**Solution:** The frontend sends file data using data URLs/base64 payloads. The server decodes and stores blobs in SQLite. This keeps the project simple while meeting the course requirement for file support.

### Challenge 5: Preventing documentation drift

**Solution:** The final documentation was aligned with the implemented code: README, PRD, stories, constitution, ADRs, and SpecKit artifacts now all state that phases 1-7 are complete.

## AI Collaboration

### Tools Used

- GitHub Copilot.
- GitHub SpecKit.
- AI-assisted documentation review.
- AI-assisted implementation review.
- AI-assisted test planning.

### What Worked Well

SpecKit artifacts, ADRs, and tests helped keep AI-generated implementation aligned with explicit requirements. The most effective prompts referenced the current story, the relevant ADR, and the expected test behavior.

### What Could Be Improved

Later phases should ideally have their own SpecKit artifacts from the beginning rather than being documented after implementation. For future work, I would generate or update `spec.md`, `plan.md`, and `tasks.md` before starting each phase.

## Time Breakdown

| Phase | Actual |
|---|---|
| Setup & SpecKit | Completed |
| Phase 1: Core Portal | Completed |
| Phase 2: Smart Submission Forms | Completed |
| Phase 3: Multi-Media Support | Completed |
| Phase 4: Draft Management | Completed |
| Phase 5: Multi-Stage Review | Completed |
| Phase 6: Blind Review | Completed |
| Phase 7: Scoring System | Completed |
| Documentation | Completed |
| Final validation | Completed |

## Test Coverage

- **Tests passing:** 59 automated tests.
- **API tests:** 54 integration tests using in-memory SQLite.
- **Domain tests:** 5 pure domain tests.
- **Runtime smoke:** `npm run smoke:edge` verifies the browser flow when Microsoft Edge is available.

The test suite covers:

- Authentication and session behavior.
- Role-based access control.
- Idea creation and validation.
- Category-specific fields.
- Attachment constraints and retrieval.
- Draft create/edit/delete/submit behavior.
- Multi-stage review actions.
- Revision loops.
- Blind review visibility.
- Admin-only scoring.
- Demo reset behavior.

## Reflection

### Key Learning

The most important learning was that AI-assisted development becomes much more reliable when requirements, decisions, and tests are written before or alongside implementation. Clear specs reduce rework and make the AI output easier to verify.

### What I Would Do Differently

I would create a separate SpecKit branch or feature folder for each phase as soon as the phase starts. This would make the progression from Phase 1 to Phase 7 easier to audit.

### SDD vs Vibe Coding

Vibe coding can produce a quick prototype, but spec-driven development produces a project that is easier to explain, test, and maintain. SpecKit made the work more structured by connecting requirements, plans, tasks, and validation steps.

### AI Collaboration Insight

The biggest surprise was that small, specific prompts referencing the current artifact were more useful than broad prompts asking the AI to “build the feature.” The AI performed better when the expected behavior was already written as acceptance criteria.

---

**Submitted by:** Nur Bilge ÖZCAN  
**Date:** 2026-05-14  
**Course:** A201 - Beyond Vibe Coding  
**A201 Cohort:** A201 Beyond Vibe Coding - Module 08 Project Sprint
