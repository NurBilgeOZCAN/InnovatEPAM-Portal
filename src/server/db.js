import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { hashPassword, ROLES } from "./domain.js";

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

export function openDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      role        TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      description     TEXT NOT NULL,
      category        TEXT NOT NULL,
      author_id       TEXT NOT NULL REFERENCES users(id),
      status          TEXT NOT NULL DEFAULT 'submitted',
      attachment_name TEXT,
      attachment_type TEXT,
      attachment_size INTEGER,
      attachment_blob BLOB,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS idea_history (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      idea_id   TEXT NOT NULL REFERENCES ideas(id),
      status    TEXT NOT NULL,
      comment   TEXT NOT NULL,
      actor_id  TEXT NOT NULL REFERENCES users(id),
      at        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token       TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id),
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id          TEXT PRIMARY KEY,
      idea_id     TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      name        TEXT,
      type        TEXT,
      size        INTEGER,
      blob        BLOB,
      uploaded_at TEXT
    );
  `);

  // Defensive migration: add extra_fields column to ideas if missing
  const ideaCols = db.pragma("table_info(ideas)").map((c) => c.name);
  if (!ideaCols.includes("extra_fields")) {
    db.exec("ALTER TABLE ideas ADD COLUMN extra_fields TEXT");
  }

  // Phase 5 migrations: multi-stage review columns
  if (!ideaCols.includes("current_stage")) {
    db.exec("ALTER TABLE ideas ADD COLUMN current_stage TEXT");
  }
  if (!ideaCols.includes("revision_requested")) {
    db.exec("ALTER TABLE ideas ADD COLUMN revision_requested INTEGER NOT NULL DEFAULT 0");
  }
  if (!ideaCols.includes("revision_from_stage")) {
    db.exec("ALTER TABLE ideas ADD COLUMN revision_from_stage TEXT");
  }

  const historyCols = db.pragma("table_info(idea_history)").map((c) => c.name);
  if (!historyCols.includes("stage")) {
    db.exec("ALTER TABLE idea_history ADD COLUMN stage TEXT");
  }

  // Phase 6: blind_review flag
  if (!ideaCols.includes("blind_review")) {
    db.exec("ALTER TABLE ideas ADD COLUMN blind_review INTEGER NOT NULL DEFAULT 0");
  }

  // Phase 7: scores table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id            TEXT PRIMARY KEY,
      idea_id       TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      evaluator_id  TEXT NOT NULL REFERENCES users(id),
      stage         TEXT,
      dimension     TEXT NOT NULL,
      value         INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
      comment       TEXT,
      created_at    TEXT,
      UNIQUE(idea_id, evaluator_id, stage, dimension)
    );
  `);

  // Defensive migration: migrate legacy single-attachment data → attachments table
  migrateAttachments(db);
}

function migrateAttachments(db) {
  const legacyRows = db.prepare(
    "SELECT id, attachment_name, attachment_type, attachment_size, attachment_blob, created_at FROM ideas WHERE attachment_name IS NOT NULL"
  ).all();

  const insertAtt = db.prepare(
    "INSERT INTO attachments (id, idea_id, name, type, size, blob, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const checkExists = db.prepare("SELECT id FROM attachments WHERE idea_id = ?");

  for (const row of legacyRows) {
    const already = checkExists.get(row.id);
    if (!already) {
      // Migrate even if blob is null — preserves the metadata reference
      const attId = `att-${randomUUID()}`;
      insertAtt.run(
        attId,
        row.id,
        row.attachment_name,
        row.attachment_type,
        row.attachment_size,
        row.attachment_blob ?? null,
        row.created_at || new Date().toISOString()
      );
    }
  }
}

export function seedIfEmpty(db) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (count > 0) return;

  const now = new Date().toISOString();
  const adminId = "user-admin";
  const submitterId = "user-aylin";
  const ideaId = "idea-ai-triage";
  const attId = `att-${randomUUID()}`;

  const insertUser = db.prepare(
    "INSERT INTO users (id, name, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertIdea = db.prepare(
    `INSERT INTO ideas (id, title, description, category, author_id, status, attachment_name, attachment_type, attachment_size, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertAtt = db.prepare(
    "INSERT INTO attachments (id, idea_id, name, type, size, blob, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertHistory = db.prepare(
    "INSERT INTO idea_history (idea_id, status, comment, actor_id, at) VALUES (?, ?, ?, ?, ?)"
  );

  const seed = db.transaction(() => {
    insertUser.run(adminId, "Maya Admin", "admin@innovatepam.local", ROLES.ADMIN, hashPassword("Admin123!", adminId), now);
    insertUser.run(submitterId, "Aylin Submitter", "aylin@epam.local", ROLES.SUBMITTER, hashPassword("Submit123!", submitterId), now);
    insertIdea.run(
      ideaId,
      "AI-assisted idea triage",
      "Use a lightweight AI checklist to route employee ideas to the right evaluator and reduce manual sorting during review windows.",
      "AI and Automation",
      submitterId,
      "under-review",
      "triage-outline.txt", "text/plain", 842,
      now, now
    );
    // Seed attachment into the new attachments table (no blob — just metadata)
    insertAtt.run(attId, ideaId, "triage-outline.txt", "text/plain", 842, null, now);
    insertHistory.run(ideaId, "submitted", "Idea submitted with initial business case.", submitterId, now);
    insertHistory.run(ideaId, "under-review", "Moved into evaluator review for sprint demo.", adminId, now);
  });

  seed();
}

export function dropAndReseed(db) {
  db.exec("DELETE FROM sessions; DELETE FROM idea_history; DELETE FROM attachments; DELETE FROM ideas; DELETE FROM users;");
  seedIfEmpty(db);
}

const dataDir = path.join(root, "data");
mkdirSync(dataDir, { recursive: true });
const defaultDbPath = path.join(dataDir, "innovatepam.db");

export const db = openDb(defaultDbPath);
seedIfEmpty(db);
