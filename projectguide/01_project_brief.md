# InnovatEPAM Portal - Employee Innovation Management Platform

## Project Overview

InnovatEPAM Portal is a comprehensive digital platform designed to streamline the innovation process within EPAM, enabling employees to submit creative ideas, facilitating expert evaluation, and managing the implementation of top-tier innovations with dedicated budget allocation.

## High-Level Features

### 1. Intelligent Idea Submission System

- **Smart Submission Forms:** Dynamic forms that adapt based on idea category (technical, process improvement, client solutions, etc.)
- **Multi-Media Support:** Ability to attach documents, prototypes, mockups, videos, and presentations
- **Draft Management:** Save, edit, and iterate on ideas before final submission

### 2. Advanced Admin Evaluation Workflow

- **Multi-Stage Review Process:** Configurable evaluation stages (initial screening, technical review, business impact assessment, final selection)
- **Blind Review Options:** Anonymous evaluation capabilities to ensure unbiased assessment

---

## Kick-off the Course Project

### Goal

Create PRDs and Tasks for the InnovatEPAM Portal project using GitHub SpecKit.

### Outcome

1. Have GitHub SpecKit configured for your project
2. Configured `constitution.md` file
3. Created `spec.md` file
4. Created `plan.md`, `data-model.md`, `quickstart.md`, `research.md` files
5. Created `tasks.md` file
6. Try `/speckit.clarify` and `/speckit.analyze` commands

### Example SpecKit Commands

```bash
# 1. Initialize SpecKit
uvx --from git+https://github.com/github/spec-kit.git specify init <PROJECT_NAME>
```

```
# 2. Configure constitution
/speckit.constitution declare principles of clean code, simple and responsive UI/UX and minimal dependencies. The project must use next.js, react and tailwind.
```

```
# 3. Specify project
/speckit.specify InnovatEPAM Portal is a comprehensive digital platform designed to streamline the innovation process within EPAM, enabling employees to submit creative ideas, facilitating expert evaluation, and managing the implementation of top-tier innovations with dedicated budget allocation.

High-Level Features:
- Intelligent Idea Submission System
  - Smart Submission Forms: Dynamic forms that adapt based on idea category (technical, process improvement, client solutions, etc.)
  - Multi-Media Support: Ability to attach documents, prototypes, mockups, videos, and presentations
  - Draft Management: Save, edit, and iterate on ideas before final submission
```

```
# 4. Clarify requirements
/speckit.clarify
```

```
# 5. Plan implementation
/speckit.plan plan this using tailwind @theme for theme colours, SQLite for data persistence and shadcn for UI components. Use date-fns for date formatting. No unit tests, integration tests or e2e tests needed.
```

```
# 6. Generate tasks
/speckit.tasks
```

```
# 7. Analyze specification
/speckit.analyze
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-28
