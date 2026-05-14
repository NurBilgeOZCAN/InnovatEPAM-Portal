# Quickstart: Full InnovatEPAM Portal

## Goal

Run and validate the completed 7-phase InnovatEPAM Portal locally.

## Prerequisites

- Node.js installed.
- npm available.
- Microsoft Edge installed if running the Edge smoke flow.

## Install

```powershell
npm install
```

## Run Tests

```powershell
npm test
```

Expected result:

```text
59 tests pass
```

## Run App

```powershell
npm start
```

Open:

```text
http://localhost:4173
```

## Reset Demo Database

```powershell
npm run reset:db
npm start
```

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Submitter | `aylin@epam.local` | `Submit123!` |
| Evaluator Admin | `admin@innovatepam.local` | `Admin123!` |

## Full Validation Flow

1. Login as submitter.
2. Create an idea using a category with required extra fields.
3. Attach multiple files within limits.
4. Save another idea as a draft.
5. Edit and submit the draft.
6. Logout.
7. Login as Evaluator Admin.
8. Review submitted ideas.
9. Move an idea through at least one stage.
10. Request revision.
11. Login as submitter and resubmit the revision.
12. Login as admin again.
13. Enable or demonstrate blind review before review starts.
14. Add scores across Impact, Feasibility, Effort, and Innovation.
15. Show composite score and sorting.
16. Accept or reject the idea with a comment.

## Browser Smoke Test

```powershell
npm run smoke:edge
```

If Microsoft Edge or remote debugging is unavailable, document that limitation and perform the manual browser validation flow above.

## SQLite Database Viewing

Recommended VS Code extension:

```text
SQLite Viewer
Extension ID: qwtel.sqlite-viewer
```

Open:

```text
data/innovatepam.db
```

Do not manually edit `.db-wal` or `.db-shm` files.