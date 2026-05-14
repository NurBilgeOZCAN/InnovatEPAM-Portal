# InnovatEPAM Portal - Final Deliverables

This document describes what you submit at the end of the Module 08 Project Sprint.

---

## Project Philosophy

The InnovatEPAM Portal project is structured into **7 phases** designed for **iterative value delivery**. Each phase produces a working feature, and you gain hands-on experience with GitHub Copilot and SpecKit through repeated practice.

**Key points:**
- Each phase adds valuable features to your application
- It's completely fine if you don't complete all 7 phases during the 10-hour sprint
- The phased structure ensures you have a working application with real features regardless of how far you get
- You can continue building phases after the course

---

## What You Submit

### 1. Git Repository

Your repository must include:

| Requirement | Details |
|-------------|---------|
| **Platform** | GitHub or EPAM GitLab |
| **Access** | Instructor can view (public or access granted) |
| **Commits** | Meaningful commit history throughout the sprint |
| **README.md** | Project description, setup instructions |

**Commit Quality Indicators:**
- Multiple commits throughout the sprint (aim for commits every hour)
- Descriptive commit messages
- Logical grouping of changes

**Example Good Commits:**
```
feat: add user registration form with validation
feat: implement idea submission with file upload
feat(phase-2): add dynamic form fields by category
fix: resolve status badge color issue
docs: add PROJECT_SUMMARY.md
```

---

### 2. PROJECT_SUMMARY.md

Create a `PROJECT_SUMMARY.md` file in your repository root:

```markdown
# InnovatEPAM Portal - Project Summary

## Overview
[2-3 sentences describing what you built]

## Phases Completed

### Phase 1: Core Portal
- [ ] User registration with email/password
- [ ] User login/logout
- [ ] Role-based access (submitter/admin)
- [ ] Idea submission form
- [ ] Single file attachment
- [ ] Idea listing page
- [ ] Status tracking
- [ ] Admin evaluation workflow

### Phase 2: Smart Submission Forms
- [ ] Dynamic form fields by category
- [ ] Category-specific guidance

### Phase 3: Multi-Media Support
- [ ] Multiple file attachments
- [ ] File preview capabilities

### Phase 4: Draft Management
- [ ] Save ideas as drafts
- [ ] Edit drafts before submission

### Phase 5: Multi-Stage Review
- [ ] Configurable evaluation stages
- [ ] Stage-specific actions

### Phase 6: Blind Review
- [ ] Anonymous evaluation mode
- [ ] Identity reveal after decision

### Phase 7: Scoring System
- [ ] Multi-dimension scoring
- [ ] Score aggregation and ranking

## Technical Decisions

### Technology Stack
- Framework: [e.g., Next.js 14]
- UI: [e.g., React + Tailwind + shadcn]
- Storage: [e.g., SQLite / Database of Choice]
- Key Libraries: [list any additional libraries]

### Key Architecture Decisions
[Brief description of 1-2 important decisions you made]

## Challenges & Solutions

### Challenge 1: [Description]
**Solution:** [How you resolved it]

### Challenge 2: [Description]
**Solution:** [How you resolved it]

## AI Collaboration

### Tools Used
- [e.g., GitHub Copilot, Claude Code, Cursor]

### What Worked Well
[1-2 sentences]

### What Could Be Improved
[1-2 sentences]

## Time Breakdown

| Phase | Actual |
|-------|--------|
| Setup & SpecKit | [time] |
| Phase 1: Core Portal | [time] |
| Phase 2: Smart Submission Forms | [time] |
| Phase 3: Multi-Media Support | [time] |
| Phase 4: Draft Management | [time] |
| Phase 5: Multi-Stage Review | [time] |
| Phase 6: Blind Review | [time] |
| Phase 7: Scoring System | [time] |
| Documentation | [time] |

## Reflection

### Key Learning
[What was the most important thing you learned?]

### What I'd Do Differently
[If you were to start over, what would you change?]

### SDD vs Vibe Coding
[How did using SpecKit change your development approach compared to coding without specifications?]

### AI Collaboration Insight
[What surprised you most about working with AI during this project?]

---

*Submitted by: [Your Name]*
*Date: [Date]*
*A201 Cohort: [Cohort Name/Date]*
```

---

### 3. Lightning Demo (3 minutes)

Prepare a brief demonstration for the Showcase session:

| Segment | Duration | Content |
|---------|----------|---------|
| Introduction | 30 sec | Your name, what you built |
| Demo Flow | 2 min | Walk through your features |
| Key Learning | 30 sec | One insight from the experience |

**Demo Tips:**
- Have demo data pre-loaded (don't register live)
- Practice the flow once before showcase
- Show the features you're most proud of

---

## Sprint Schedule

### During Sprint (Module 08 - 10 hours)

1. **Hour 0**: Share git repository link with instructor
2. **Every 2 hours**: Push commits, update at standup
3. **Hour 8-8.5**: Wrap up current phase, start documentation
4. **Hour 8.5-9**: Complete PROJECT_SUMMARY.md
5. **Hour 9-10**: Showcase demos and retrospective

### At Showcase (Hour 9-10)

1. Lightning demos (3 min each)
2. Q&A / feedback
3. Course retrospective
4. Certificate confirmation

### After Course

Your repository serves as:
- Portfolio piece for future reference
- Template for real projects
- Evidence of A201 completion
- **Continuation point** - you can keep building phases!

---

## Optional Extensions

Completed all 7 phases? Here are additional features to challenge yourself:

| Extension | Description | Complexity |
|-----------|-------------|------------|
| **Edit/Delete Ideas** | Allow submitters to edit or delete their ideas (consider: what if evaluation already started?) | Medium |
| **Search & Filter** | Add search bar and filters (by category, status, date range) to idea listing | Easy |
| **Pagination** | Paginate the idea listing for better performance with many ideas | Easy |
| **Email Notifications** | Send email when idea status changes or feedback is received | Medium |
| **Export to CSV** | Allow admins to export idea data for reporting | Easy |
| **Dashboard Analytics** | Add charts showing submission trends, approval rates, category distribution | Medium |
| **Comment Threads** | Allow back-and-forth discussion between submitter and evaluators | Hard |
| **Idea Versioning** | Track changes to ideas over time, show diff between versions | Hard |

These are **not required** for course completion. They're opportunities to continue practicing AI-native development on a familiar codebase.

---

## Frequently Asked Questions

**Q: Can I use a different tech stack?**
A: Yes. Node.js and Python are both commonly used stacks that LLMs produce quality code for. You can also choose another stack you're comfortable with.

**Q: Do I need automated tests?**
A: No, manual testing is sufficient. Document your testing approach in PROJECT_SUMMARY.md.

**Q: What if my demo breaks during showcase?**
A: It happens! Explain what should work and what went wrong. The PROJECT_SUMMARY.md and commit history show your work.

**Q: What if I don't complete all 7 phases?**
A: That's expected and completely fine! The phased structure is designed for iterative value delivery. Each phase you complete adds value. You can continue building after the course.

**Q: Should I rush through phases to complete more?**
A: No. Quality matters more than quantity. Well-implemented features with good code organization are more valuable than rushing through multiple phases with poor quality.

---

**Document Version:** 3.0
**Last Updated:** 2025-11-28
**Related DR:** DR-011
