# Course Project: InnovatEPAM Portal

## What You'll Build

By the end of this course, you will have built **InnovatEPAM Portal** - a comprehensive employee innovation management platform that enables:

- **Employees** to submit creative ideas with supporting attachments
- **Evaluators/Admins** to review, evaluate, and manage submitted ideas
- **The Organization** to capture and track innovation from submission to decision

This is a **real-world application** that demonstrates AI-native development practices you've learned throughout A201.

---

## About the Mockups

The `phase-01-core/mockups/` folder contains visual references to help you understand the general direction of the application.

**Important:** These mockups are **inspirational, not prescriptive**.

- **Don't pixel-match**: You are not expected to reproduce the exact colors, spacing, or layout
- **Inconsistencies are intentional**: Mockups may not be consistent with each other or with the requirements
- **Requirements are authoritative**: When mockups and requirements differ, **follow the requirements**
- **Make it functional**: Focus on building working features, not polished visuals
- **Use your judgment**: UX decisions not covered by requirements are yours to make

**What mockups are good for:**
- Understanding the general user experience flow
- Getting a sense of the information hierarchy
- Inspiration for layout patterns

**What mockups are NOT:**
- A pixel-perfect specification
- The definitive category list (use requirements)
- A complete feature list (some mockup elements are out of scope)

If you want to spend time on visual polish, that's great—but it's an "Excellence Indicator," not a requirement. A functional UI with shadcn/ui defaults is perfectly acceptable.

---

## Learning Objectives

By completing this course project, you will demonstrate:

1. **Spec-Driven Development (SDD)** using GitHub SpecKit to plan before coding
2. **PRD Creation** with clear user stories and acceptance criteria
3. **Architecture Decision Records (ADRs)** for technology choices
4. **Context Engineering** through effective AI collaboration
5. **AI-Guided Implementation** using GitHub Copilot (or other supported tools)
6. **Testing Guidelines** creation (manual testing approach)
7. **Documentation** as a core development practice

---

## Technology Stack: Choose Wisely

> **The focus of this course is Specification-Driven Development (SDD) with GitHub SpecKit, NOT learning a new programming language or framework.**

### Important Considerations

**Choose a tech stack you are already comfortable with because:**

1. **Troubleshooting**: When you encounter bugs, you need to debug them yourself
2. **Support Limitations**: When you run into stack-specific problems, you'll need to solve them yourself
3. **Time Management**: The Phase 1 estimate (~6 hours) assumes familiarity with your tools
4. **Focus on Learning Goals**: Learn SDD, not a new framework

### Recommended Options

| Stack                 | Best For                             |
| --------------------- | ------------------------------------ |
| **Node.js (Next.js)** | React/JavaScript developers          |
| **Python (FastAPI)**  | Python backend developers            |
| **Your Choice**       | Use whatever you're comfortable with |

Course materials reference **Node.js** as the default. Python is another solid option. Choose what works best for you.

### Node.js Stack (Recommended)

| Layer             | Technology     | Rationale                           |
| ----------------- | -------------- | ----------------------------------- |
| **Framework**     | Next.js 14+    | Full-stack React with API routes    |
| **UI Library**    | React 18+      | Component-based architecture        |
| **Styling**       | Tailwind CSS   | Utility-first, rapid prototyping    |
| **UI Components** | shadcn/ui      | Accessible, customizable components |
| **Storage**       | SQLite / DB of Choice | Data persistence & file support     |
| **Utilities**     | date-fns, uuid | Date formatting, ID generation      |

**Setup:** See `phase-01-core/00_project_initialization.md` for step-by-step setup.

### Python Stack (Alternative)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | FastAPI | Modern Python web framework |
| **Language** | Python 3.11+ | Type hints supported |
| **Frontend** | React + Vite | Lightweight frontend |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Components** | shadcn/ui | Pre-built components |
| **Storage** | SQLite / JSON file | Data persistence |
| **ORM** | Pydantic | Data validation |

---

## AI-Assisted Development Tools

### Primary Tool: GitHub Copilot

This course uses **GitHub Copilot** as the primary AI-assisted development tool.

### GitHub SpecKit Supported Agents

This course uses **GitHub Copilot**, but the skills you learn transfer directly to any of the 17 supported agents for your future projects:

| Agent | Support |
|-------|---------|
| **GitHub Copilot** | ✅ *(used in this course)* |
| Amazon Q Developer CLI | ⚠️ *(limited slash command support)* |
| Amp | ✅ |
| Auggie CLI | ✅ |
| Claude Code | ✅ |
| CodeBuddy CLI | ✅ |
| Codex CLI | ✅ |
| Cursor | ✅ |
| Gemini CLI | ✅ |
| IBM Bob | ✅ |
| Jules | ✅ |
| Kilo Code | ✅ |
| opencode | ✅ |
| Qwen Code | ✅ |
| Roo Code | ✅ |
| SHAI (OVHcloud) | ✅ |
| Windsurf | ✅ |

**Initialization (for future projects):**
```bash
specify init <project-name> --ai copilot   # GitHub Copilot
specify init <project-name> --ai claude    # Claude Code
specify init <project-name> --ai cursor    # Cursor
# ... and more
```

---

## Phase Structure

The InnovatEPAM Portal project is organized into **7 phases** designed for **iterative value delivery**.

### Why Phased Development?

This structure allows you to:
- **Deliver working software incrementally** - Each phase produces a functional feature
- **Gain hands-on experience** with GitHub Copilot and SpecKit through repeated practice
- **Complete a real project** regardless of how many phases you finish

**Important:** Even if you don't complete all 7 phases during Module 08, you will have built a working application with valuable features. The phased approach ensures you're never left with an incomplete, non-functional project.

### Phase 1: Core Portal (~6 hours)

The foundation that subsequent phases build upon.

**Features:**
- User registration, login, logout
- Role distinction (submitter vs. admin)
- Idea submission with file attachment
- Idea listing and viewing
- Status tracking (submitted, under review, accepted, rejected)
- Admin evaluation workflow

**See `phase-01-core/requirements.md` for detailed user stories and acceptance criteria.**

---

### Phase 2: Smart Submission Forms (~30 min)
Dynamic forms that adapt based on idea category.

### Phase 3: Multi-Media Support (~45 min)
Multiple file attachments with preview.

### Phase 4: Draft Management (~30 min)
Save and edit drafts before submission.

### Phase 5: Multi-Stage Review (~1 hr)
4-stage evaluation pipeline.

### Phase 6: Blind Review (~20 min)
Anonymous evaluation mode.

### Phase 7: Scoring System (~20 min)
1-5 rating dimensions for evaluations.

**Each phase folder contains a `requirements.md` with full specifications.**

---

## Success Criteria

### Deliverables
- [ ] Application runs locally without errors
- [ ] Git repository has meaningful commit history
- [ ] SpecKit artifacts (spec.md, plan.md, tasks.md) match actual implementation
- [ ] PROJECT_SUMMARY.md documents your work and phases completed

### Quality Indicators
- [ ] Used SDD workflow (not vibe coding) - specs drive implementation via SpecKit
- [ ] Code follows consistent patterns
- [ ] UI is functional
- [ ] Error handling for common cases
- [ ] File structure is organized

### Excellence Indicators
- [ ] Multiple phases completed
- [ ] Automated tests included
- [ ] UI polished with good UX
- [ ] ADRs document key decisions
- [ ] Responsive design (works on mobile/tablet)
- [ ] Accessibility considerations (keyboard navigation, screen reader friendly)

---

## Getting Started

### Before Module 08

1. **Review this document** thoroughly
2. **Choose your tech stack** (see Technology Stack section above)
3. **Read** `phase-01-core/requirements.md` for Phase 1 scope
4. **Review** `speckit-cheatsheet.md` for SpecKit workflow

### During Module 08 (10-Hour Sprint)

1. **Kickoff (20 min)**: Share git repository link with instructor
2. **SpecKit Setup (30 min)**: Initialize project, create constitution and spec
3. **Implementation (8 hours)**: Build with standup checkpoints every 2 hours
4. **Documentation (30 min)**: Complete PROJECT_SUMMARY.md
5. **Showcase (40 min)**: Lightning demo + course retrospective

**Standups:** Kickoff at the start of the day, then every 2 hours throughout the sprint.

---

## Folder Structure

```
course-project/
├── participant/                    # You are here
│   ├── 00_PROJECT_OVERVIEW.md     # This file
│   ├── 01_project_brief.md        # Project description and goals
│   ├── speckit-cheatsheet.md      # SpecKit command reference
│   ├── final-deliverables.md      # Submission guidelines
│   ├── phase-01-core/            # Phase 1 requirements
│   ├── phase-02-smart-forms/     # Phase 2 requirements
│   ├── phase-03-multimedia/      # Phase 3 requirements
│   ├── phase-04-drafts/          # Phase 4 requirements
│   ├── phase-05-multistage/      # Phase 5 requirements
│   ├── phase-06-blind-review/    # Phase 6 requirements
│   └── phase-07-scoring/         # Phase 7 requirements
└── instructor/                    # Instructor-only materials
```

---

## Key Documents

| Document                     | Purpose                          | When to Use           |
| ---------------------------- | -------------------------------- | --------------------- |
| `00_PROJECT_OVERVIEW.md`     | This file - big picture          | Start here            |
| `01_project_brief.md`        | Project description and goals    | During SpecKit setup  |
| `speckit-cheatsheet.md`      | All 8 SpecKit commands explained | During implementation |
| `final-deliverables.md`      | Submission guidelines            | Before showcase       |
| `phase-XX-*/requirements.md` | Phase-specific requirements      | During implementation |

---

## Need Help?

**During the Sprint:**
1. **Blocker?** Post in Teams Help Channel immediately
2. **Stuck but making progress?** Note it for next standup
3. **Need a second opinion?** Ask a peer or instructor

**Important:** Instructors can help with:
- SpecKit commands and workflow
- Specification structure
- AI prompting strategies
- General architecture decisions

Instructors may **not** be able to help with:
- Stack-specific debugging (especially non-Node.js stacks)
- Framework-specific issues
- Language syntax questions

**Remember:** Asking for help is a professional skill. Don't suffer in silence!

---

**Document Version:** 2.0
**Last Updated:** 2025-11-28
**Related DR:** DR-011
