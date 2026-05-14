# Demo Script - InnovatEPAM Portal

## Purpose

This script supports a 3-5 minute lightning demo for the A201 Beyond Vibe Coding showcase. It demonstrates that all 7 phases of InnovatEPAM Portal are complete.

## Pre-Demo Setup

Run the project locally:

```powershell
npm install
npm test
npm start
```

Open:

```text
http://localhost:4173
```

Optional reset before presenting:

```powershell
npm run reset:db
npm start
```

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Submitter | `nur@epam.local` | `Submit123!` |
| Evaluator Admin | `admin@epam.local` | `Admin123!` |

## 3-5 Minute Demo Flow

### 1. Introduction - 30 seconds

Say:

> I built InnovatEPAM Portal, a local-first employee innovation management platform. It allows employees to submit ideas and allows evaluator admins to review, anonymize, revise, score, and decide ideas through a structured workflow. All 7 project phases are completed.

### 2. Submitter Flow - 60 seconds

1. Login as submitter:
   - Email: `nur@epam.local`
   - Password: `Submit123!`
2. Open the submission form.
3. Select a category such as `AI and Automation`.
4. Show that category-specific fields appear.
5. Add title, description, required extra field, and attachments.
6. Mention that the system supports up to 5 files and 8 MB total attachment size.
7. Save one idea as draft.
8. Open drafts, edit the draft, and submit it.

### 3. Admin Review Flow - 90 seconds

1. Logout and login as Evaluator Admin:
   - Email: `admin@epam.local`
   - Password: `Admin123!`
2. Show all submitted ideas on the dashboard.
3. Open an idea card.
4. Show the four review stages:
   - Initial Screening
   - Technical Review
   - Business Impact
   - Final Selection
5. Move the idea to the next stage.
6. Request revision and show that the submitter can edit/resubmit.
7. Demonstrate blind review if enabled before stage actions.
8. Add scores for:
   - Impact
   - Feasibility
   - Effort
   - Innovation
9. Show composite score display and sorting.

### 4. Evidence - 45 seconds

Show these files in VS Code:

```text
README.md
PROJECT_SUMMARY.md
docs/prd.md
docs/stories.md
docs/adr/
specs/002-full-portal-phases-2-7/
tests/api.test.mjs
tests/portal-core.test.mjs
```

Say:

> The project follows a spec-driven workflow. The PRD and stories define the expected behavior, ADRs document technical decisions, SpecKit artifacts describe the full implementation plan, and the automated test suite verifies the major flows.

### 5. Closing - 30 seconds

Say:

> My key learning was that AI-generated code becomes much more reliable when it is guided by clear specifications, ADRs, and tests. Compared to vibe coding, the SpecKit workflow made the project easier to reason about, validate, and present.

## Phase Checklist for Demo

| Phase | Demo Evidence |
|---|---|
| Phase 1 Core Portal | Login, role distinction, submit idea, status tracking |
| Phase 2 Smart Forms | Category-specific fields |
| Phase 3 Multi-Media | Multiple attachments and preview/download |
| Phase 4 Drafts | Save, edit, submit draft |
| Phase 5 Multi-Stage Review | Four-stage review actions |
| Phase 6 Blind Review | Anonymous author display during review |
| Phase 7 Scoring | Admin scores and composite score |
