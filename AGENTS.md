# Project Agent Notes

- Run `npm install` before first `npm start`; `better-sqlite3` is a native dependency.
- Run `npm test` after meaningful behavior changes.
- Run `npm run smoke:edge` before demo if Microsoft Edge is available.
- Keep `README.md`, `PROJECT_SUMMARY.md`, `docs/prd.md`, `docs/stories.md`, ADRs, tests, and implementation aligned.
- The SQLite database is created at `data/innovatepam.db` on first boot.
- Do not commit generated runtime database files unless the instructor explicitly asks for seeded demo data in the repository.
- Treat `.db-wal` and `.db-shm` files as SQLite runtime files.
- Phase 1 historical SpecKit artifacts live in `specs/001-phase1-mvp/`.
- Full Phase 2-7 completion is documented in `specs/002-full-portal-phases-2-7/`.
- Do not reintroduce browser-only `localStorage` as the primary persistence model; SQLite is now the source of truth.
- Keep phase documentation consistent with the completed 7-phase implementation.

