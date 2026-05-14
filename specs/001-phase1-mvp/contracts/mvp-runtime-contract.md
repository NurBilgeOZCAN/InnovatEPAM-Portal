# MVP Runtime Contract

## Purpose
Define the externally observable contract of the local MVP runtime: routes, role capabilities, persistence keys, and validation outcomes.

## Routes Contract
- #login: public authentication entry.
- #dashboard: authenticated idea board.
- #submit: authenticated submission form.
- #guide: public route with role-aware content after login.

Protected route behavior:
- If user is unauthenticated and navigates to a protected route, app redirects to #login.

## Role Capability Contract
- submitter:
  - Can register/login/logout.
  - Can create ideas with required fields and optional single attachment.
  - Can view own ideas with search/status filtering.
  - Cannot update review status.
- admin (evaluator):
  - Can register/login/logout.
  - Can view all ideas.
  - Can change status to under-review, accepted, or rejected.
  - Must provide comment for accepted/rejected.

## Status Lifecycle Contract
- Allowed statuses: submitted, under-review, accepted, rejected.
- Required comment:
  - accepted: required
  - rejected: required

## Persistence Contract
- localStorage key innovatepam.portal.v1 stores users, ideas, and history.
- sessionStorage key innovatepam.session.userId stores active user session.

## Test Gate Contract
- npm test must pass.
- npm run smoke:edge must pass.

These two commands are the readiness gate for Friday demo sign-off.
