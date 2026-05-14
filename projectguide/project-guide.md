# Module 08: Lab Guide - Project Development Sprint

**Duration:** 510 minutes
- Kickoff: 20 minutes
- Project Work: 8.5 hours (with standups every 2 hours)
- Documentation: 30 minutes
- Showcase: 40 minutes

**Goal**: Complete InnovatEPAM Portal MVP demonstrating full AI-native development workflow

---

## Overview

This is your capstone module. You will:
1. Apply everything from Modules 01-08
2. Build the complete InnovatEPAM Portal MVP (Phase 1)
3. Document your transformation journey
4. Showcase your work

**This is YOUR time** - work independently, use AI assistance, ask for help when stuck.

---

## Pre-Sprint Readiness

**IMPORTANT:** Module 08 is a **brand new project** (InnovatEPAM Portal). You will **CREATE** all artifacts during this sprint. Previous modules taught you HOW - now you apply those skills to build this project from scratch.

### Skills You Bring (from Modules 01-07)
- [ ] **Module 02 Skills**: Can write PRD, Epics, Stories with acceptance criteria
- [ ] **Module 03 Skills**: Can create memory banks and agent instructions
- [ ] **Module 04 Skills**: Can document architecture decisions as ADRs
- [ ] **Module 05 Skills**: Can use MCP tools (if applicable to your project)
- [ ] **Module 06 Skills**: Can use SpecKit workflow for spec-driven development
- [ ] **Module 07 Skills**: Can configure Testing Principles in constitution and generate tests

### Tools Ready
- [ ] AI coding assistant configured (GitHub Copilot, Claude Code, etc.)
- [ ] SpecKit CLI installed (if using SpecKit)
- [ ] MCP tools configured (optional - use if helpful)
- [ ] Development environment set up for your tech stack

### New Project Setup
- [ ] **NEW** Git repository created for InnovatEPAM Portal
- [ ] Repository link shared with instructors
- [ ] Initial README.md created
- [ ] Tech stack decided (Node.js/Python/etc.)

### Reference Materials Available
- [ ] Course project requirements: `../../course-project/participant/00_PROJECT_OVERVIEW.md`
- [ ] Phase 1 requirements: `../../course-project/participant/phase-01-core/requirements.md`
- [ ] SpecKit cheatsheet: `../../course-project/participant/speckit-cheatsheet.md`
- [ ] Your previous module work (as templates/examples to reference)

**You will CREATE specs, ADRs, constitution, and tests FOR InnovatEPAM Portal during the sprint.**

---

## Phase 1: Kickoff (20 min)

The instructor will:
- Brief recap of your skills from Modules 01-08
- Explain today's mission: Complete InnovatEPAM Portal MVP
- Collect repository links
- Answer questions about the sprint
- Explain standup schedule and help channels

**Then: START CODING!**

---

## Phase 2: Project Work (8.5 hours)

### Your Mission: Build the MVP (Phase 1)

Complete these features:

#### User Management
- [ ] User authentication (register, login, logout)
- [ ] Basic role distinction (submitter vs. evaluator/admin)

#### Idea Submission System
- [ ] Basic idea submission form (title, description, category)
- [ ] Single file attachment per idea
- [ ] Idea listing and viewing

#### Evaluation Workflow
- [ ] Basic status tracking (submitted, under review, accepted, rejected)
- [ ] Simple evaluation workflow (admin accepts/rejects with comments)

---

### Standup Schedule

You'll have brief standups every 2 hours. Come back to the main call for these:

| Standup | Time | What You Should Have |
|---------|------|---------------------|
| **Standup 1** | +2 hrs | Auth working, basic form started |
| **Standup 2** | +4 hrs | Form complete, file attachment working |
| **Standup 3** | +6 hrs | Listing done, status tracking started |
| **Standup 4** | +8 hrs | MVP nearly complete, wrapping up |

**Standup format (15 min):**
- Quick round-robin: "Name + current progress + blocker (if any)"
- Get help assigned if you're stuck
- Back to work!

---

### Working Style

**Solo work**: Everyone works independently on their own InnovatEPAM Portal.

**Stay connected:**
- Main call is always open (for company or questions)
- Teams Help Channel for async questions
- Return for standups

**Commit frequently:**
- Push to your repo at least every hour
- Instructors monitor commit activity to identify who might need help

---

### Implementation Workflow

For each feature, follow this workflow:

```
┌─────────────────────────────────────────┐
│  1. REVIEW requirements                 │
│  (Read Phase 1 requirements)            │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  2. CREATE/UPDATE specs                 │
│  Write story, update PRD if needed,     │
│  document ADRs for tech decisions       │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  3. GENERATE tests (RED phase)          │
│  Follow Testing Principles you          │
│  configured in constitution             │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  4. IMPLEMENT code with AI              │
│  Reference YOUR specs in prompts        │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  5. RUN tests - verify they PASS        │
│  (GREEN phase)                          │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  6. COMMIT with meaningful message      │
│  Push to repo                           │
└────────────────┬────────────────────────┘
                 ↓
         Repeat for next feature
```

---

### AI-Native Prompting

When working with AI, use this prompt structure:

```
I'm building the InnovatEPAM Portal - an employee innovation management platform.

Context:
- [Paste the user story you're implementing]
- [Reference any ADRs you've documented for tech decisions]
- [Reference your Testing Principles from constitution if generating tests]

Task:
[What you need AI to help with]

Requirements:
- Follow [framework/language] best practices
- Write tests following TDD approach
- Keep code simple and maintainable
```

**As you build specs/ADRs/constitution, you can reference them in prompts:**
- After creating stories: Include story details in context
- After documenting ADRs: Reference technical constraints
- After configuring Testing Principles: Reference testing standards

---

### Progress Checkpoints

Use these to gauge your progress:

| Time | On Track | Falling Behind |
|------|----------|----------------|
| After 2 hrs | Auth + form started | Still setting up project |
| After 4 hrs | File attachment working | Auth not complete |
| After 6 hrs | Listing + status done | Form not working |
| After 8 hrs | MVP nearly complete | Missing 2+ MVP features |

**If you're falling behind:**
1. Ask for help immediately (Teams or main call)
2. Focus on getting core features working
3. Skip nice-to-haves
4. A working MVP > incomplete advanced features

---

### Phases 2-7 (Iterative Development)

If you complete MVP, continue iterating through Phases 2-7:

| Phase | Time | Description |
|-------|------|-------------|
| Phase 2 | ~30 min | Smart Submission Forms (dynamic fields) |
| Phase 3 | ~45 min | Multi-Media Support (multiple file types) |
| Phase 4 | ~30 min | Draft Management (save drafts) |
| Phase 5 | ~1 hr | Multi-Stage Review (configurable stages) |
| Phase 6 | ~20 min | Blind Review (anonymous evaluation) |
| Phase 7 | ~20 min | Scoring System (1-5 ratings) |

---

## Phase 3: Documentation (30 min)

**Stop coding!** Time to document.

### Create PROJECT_SUMMARY.md

```markdown
# Project Summary - InnovatEPAM Portal

## Overview
[1-2 sentences describing what you built]

## Features Completed

### MVP Features
- [ ] User Authentication - [Status]
- [ ] Idea Submission - [Status]
- [ ] File Attachment - [Status]
- [ ] Idea Listing - [Status]
- [ ] Evaluation Workflow - [Status]

### Phases 2-7 Features (if completed)
- [ ] [Phase number - Feature name] - [Status]

## Technical Stack
Based on ADRs:
- **Framework**: [Your choice]
- **Database**: [Your choice]
- **Authentication**: [Your approach]

## Test Coverage
- **Overall**: [X]%
- **Tests passing**: [N] tests

## Transformation Reflection

### Before (Module 01)
[How did you work before this course?]

### After (Module 08)
[How has your approach changed?]

### Key Learning
[Your most important takeaway]

---
**Author**: [Your Name]
**Date**: [Today's Date]
**Course**: A201 - Beyond Vibe Coding
```

### Prepare Your Demo

Plan a 3-5 minute demonstration:

1. **Intro (30 sec)**: What you built
2. **Live Demo (2 min)**: Show working features
3. **Key Learning (30 sec)**: One takeaway

**Test your demo flow works!**

---

## Phase 4: Showcase & Retrospective (40 min)

### Lightning Demos (25 min)

5 participants present (3-5 min each):
- Show 1 working feature
- Show 1 spec or test
- Share 1 key learning

### As Presenter
- Keep it brief (3-5 min)
- Focus on working features
- Be honest about challenges
- Share genuine learnings

### As Audience
- Listen actively
- Celebrate peers' accomplishments
- Note interesting approaches

### Course Retrospective (15 min)
- What worked well?
- What surprised you?
- What will you do Monday at work?

---

## Lab Completion Checklist

### Required Deliverables
- [ ] InnovatEPAM Portal MVP complete (or significant progress)
- [ ] User authentication working
- [ ] Idea submission working
- [ ] Tests passing
- [ ] PROJECT_SUMMARY.md complete
- [ ] Demo delivered during showcase

### Quality Indicators
- [ ] Tests follow Testing Principles from constitution
- [ ] Code aligns with ADRs
- [ ] AI used throughout workflow
- [ ] Regular commits to repository
- [ ] Can articulate transformation from Module 01

### Bonus Achievements
- [ ] Full MVP complete
- [ ] Phases 2-7 progress (iterative development)
- [ ] 80%+ test coverage
- [ ] Clean git history with meaningful commits

---

## Troubleshooting

### "I'm stuck on a bug"
1. Spend max 15 minutes debugging
2. Post in Teams Help Channel with details
3. Ask at standup if not urgent
4. Skip and move to next feature if blocking

### "AI isn't generating good code"
1. Check your prompt includes spec references
2. Make sure specs have enough detail
3. Try breaking request into smaller pieces

### "Tests won't pass"
1. Read error messages carefully
2. Fix one test at a time
3. Ask for help if stuck > 10 minutes

### "I won't finish MVP in time"
1. **Don't panic** - partial completion is okay
2. Focus on completing what you have
3. Working auth + form > broken everything
4. Document what you DID accomplish

---

## Quick Reference: The AI-Native Workflow

```
SPEC → CONTEXT → GENERATE → VALIDATE → COMMIT

1. SPEC: What feature am I implementing?
2. CONTEXT: What ADRs/guidelines apply?
3. GENERATE: Use AI with spec references
4. VALIDATE: Run tests, check it works
5. COMMIT: Push to repo frequently
```

---

## After the Course

### Apply to Real Work
- Create specs BEFORE coding
- Document decisions as ADRs
- Use MCP tools for productivity
- Generate tests with guidelines
- Reference specs in AI prompts

### Continue Learning
- Practice workflow on side projects
- Share learnings with team
- Propose AI-native practices at work
- Stay updated on AI tool evolution

---

**Congratulations on completing A201: Beyond Vibe Coding!**

You now have the skills to work as an AI-native engineer.

---

**Document Version**: 2.0
**Last Updated**: 2025-11-27
**Module**: 09 - Project Development Sprint
