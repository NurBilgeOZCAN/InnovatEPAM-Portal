// All SQL queries. Uses prepared statements throughout.
import { SCORE_DIMENSIONS } from "./domain.js";

export function makeRepository(db) {
  const stmts = {
    getUserByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
    getUserById:    db.prepare("SELECT * FROM users WHERE id = ?"),
    insertUser:     db.prepare(
      "INSERT INTO users (id, name, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ),

    // Ideas — joined with author name for display (excludes drafts)
    listIdeas: db.prepare(`
      SELECT i.*, u.name AS author_name, u.email AS author_email
      FROM ideas i
      JOIN users u ON u.id = i.author_id
      WHERE i.status != 'draft'
      ORDER BY i.updated_at DESC
    `),
    listIdeasByAuthor: db.prepare(`
      SELECT i.*, u.name AS author_name, u.email AS author_email
      FROM ideas i
      JOIN users u ON u.id = i.author_id
      WHERE i.author_id = ? AND i.status != 'draft'
      ORDER BY i.updated_at DESC
    `),
    getIdeaById: db.prepare(`
      SELECT i.*, u.name AS author_name, u.email AS author_email
      FROM ideas i
      JOIN users u ON u.id = i.author_id
      WHERE i.id = ?
    `),
    insertIdea: db.prepare(
      `INSERT INTO ideas (id, title, description, category, author_id, status, attachment_name, attachment_type, attachment_size, attachment_blob, extra_fields, blind_review, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    updateIdeaStatus: db.prepare(
      "UPDATE ideas SET status = ?, updated_at = ? WHERE id = ?"
    ),
    updateIdeaStage: db.prepare(
      "UPDATE ideas SET status = ?, current_stage = ?, updated_at = ? WHERE id = ?"
    ),
    terminalIdeaStage: db.prepare(
      "UPDATE ideas SET status = ?, current_stage = NULL, updated_at = ? WHERE id = ?"
    ),
    updateIdeaRevisionRequest: db.prepare(
      "UPDATE ideas SET status = 'submitted', current_stage = NULL, revision_requested = 1, revision_from_stage = ?, updated_at = ? WHERE id = ?"
    ),
    updateIdeaRevisionSubmit: db.prepare(
      "UPDATE ideas SET title = ?, description = ?, category = ?, extra_fields = ?, revision_requested = 0, status = 'under-review', current_stage = revision_from_stage, revision_from_stage = NULL, updated_at = ? WHERE id = ?"
    ),

    getHistory:    db.prepare("SELECT * FROM idea_history WHERE idea_id = ? ORDER BY at ASC"),
    insertHistory: db.prepare(
      "INSERT INTO idea_history (idea_id, status, comment, actor_id, at, stage) VALUES (?, ?, ?, ?, ?, ?)"
    ),
    deleteLastHistory: db.prepare(
      "DELETE FROM idea_history WHERE rowid = (SELECT rowid FROM idea_history WHERE idea_id = ? ORDER BY at DESC LIMIT 1)"
    ),
    revertIdeaStage: db.prepare(
      "UPDATE ideas SET status = ?, current_stage = ?, updated_at = ? WHERE id = ?"
    ),

    // Attachments
    listAttachmentsByIdea: db.prepare(
      "SELECT id, idea_id, name, type, size, uploaded_at FROM attachments WHERE idea_id = ? ORDER BY uploaded_at ASC"
    ),
    getAttachmentById: db.prepare(
      "SELECT * FROM attachments WHERE id = ?"
    ),
    getFirstAttachmentByIdea: db.prepare(
      "SELECT * FROM attachments WHERE idea_id = ? ORDER BY uploaded_at ASC LIMIT 1"
    ),
    insertAttachment: db.prepare(
      "INSERT INTO attachments (id, idea_id, name, type, size, blob, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ),

    // Drafts
    listDraftsByUser: db.prepare(`
      SELECT i.*, u.name AS author_name, u.email AS author_email
      FROM ideas i
      JOIN users u ON u.id = i.author_id
      WHERE i.status = 'draft' AND i.author_id = ?
      ORDER BY i.updated_at DESC
    `),
    getDraftById: db.prepare(`
      SELECT i.*, u.name AS author_name, u.email AS author_email
      FROM ideas i
      JOIN users u ON u.id = i.author_id
      WHERE i.id = ? AND i.status = 'draft'
    `),
    updateDraftFields: db.prepare(
      "UPDATE ideas SET title = ?, description = ?, category = ?, extra_fields = ?, updated_at = ? WHERE id = ? AND status = 'draft' AND author_id = ?"
    ),
    promoteDraft: db.prepare(
      "UPDATE ideas SET status = 'submitted', updated_at = ? WHERE id = ? AND status = 'draft'"
    ),
    deleteDraft: db.prepare(
      "DELETE FROM ideas WHERE id = ? AND status = 'draft' AND author_id = ?"
    ),
    deleteAttachmentsByIdea: db.prepare(
      "DELETE FROM attachments WHERE idea_id = ?"
    ),
    deleteAttachmentById: db.prepare(
      "DELETE FROM attachments WHERE id = ? AND idea_id = ?"
    ),

    getSession:    db.prepare("SELECT * FROM sessions WHERE token = ?"),
    insertSession: db.prepare(
      "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)"
    ),
    deleteSession: db.prepare("DELETE FROM sessions WHERE token = ?"),

    // Phase 6: blind review
    setBlindReview: db.prepare("UPDATE ideas SET blind_review = ? WHERE id = ?"),
    countNonSubmitHistory: db.prepare(`
      SELECT COUNT(*) AS n FROM idea_history
      WHERE idea_id = ? AND NOT (status = 'submitted' AND comment = 'Idea submitted.')
    `),

    // Phase 7: scores
    upsertScore: db.prepare(`
      INSERT INTO scores (id, idea_id, evaluator_id, stage, dimension, value, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(idea_id, evaluator_id, stage, dimension)
      DO UPDATE SET value = excluded.value, comment = excluded.comment, created_at = excluded.created_at
    `),
    listScoresByIdea: db.prepare(`
      SELECT s.*, u.name AS evaluator_name
      FROM scores s
      JOIN users u ON u.id = s.evaluator_id
      WHERE s.idea_id = ?
      ORDER BY s.created_at ASC
    `),
  };

  return {
    getUserByEmail: (email) => stmts.getUserByEmail.get(email),
    getUserById:    (id) => stmts.getUserById.get(id),

    insertUser: (user) =>
      stmts.insertUser.run(user.id, user.name, user.email, user.role, user.passwordHash, user.createdAt),

    listIdeas: (authorId = null) =>
      authorId ? stmts.listIdeasByAuthor.all(authorId) : stmts.listIdeas.all(),

    getIdeaById: (id) => stmts.getIdeaById.get(id),

    insertIdea: (idea) =>
      stmts.insertIdea.run(
        idea.id, idea.title, idea.description, idea.category,
        idea.authorId, idea.status,
        null, null, null, null,   // legacy attachment columns — no longer written
        idea.extraFields ?? null,
        idea.blindReview ?? 0,
        idea.createdAt, idea.updatedAt
      ),

    updateIdeaStatus: (ideaId, status, updatedAt) =>
      stmts.updateIdeaStatus.run(status, updatedAt, ideaId),

    getHistory: (ideaId) => stmts.getHistory.all(ideaId),

    insertHistoryEntry: (entry) =>
      stmts.insertHistory.run(entry.ideaId, entry.status, entry.comment, entry.actorId, entry.at, entry.stage ?? null),

    // Phase 5: set stage + status + history row (non-terminal)
    setIdeaStage: db.transaction((id, stage, status, comment, actorId, now) => {
      stmts.updateIdeaStage.run(status, stage, now, id);
      stmts.insertHistory.run(id, status, comment, actorId, now, stage);
    }),

    // Phase 5: terminal transition (accepted/rejected) — clears current_stage
    setIdeaTerminal: db.transaction((id, terminalStatus, stage, comment, actorId, now) => {
      stmts.terminalIdeaStage.run(terminalStatus, now, id);
      stmts.insertHistory.run(id, terminalStatus, comment, actorId, now, stage);
    }),

    // Phase 5: admin requests revision — send back to submitter
    requestRevision: db.transaction((id, fromStage, comment, actorId, now) => {
      stmts.updateIdeaRevisionRequest.run(fromStage, now, id);
      stmts.insertHistory.run(id, "submitted", comment, actorId, now, fromStage);
    }),

    // Phase 5: submitter saves revision and re-enters pipeline
    submitRevision: db.transaction((id, title, description, category, extraFields, actorId, now) => {
      stmts.updateIdeaRevisionSubmit.run(title, description, category, extraFields, now, id);
      stmts.insertHistory.run(id, "under-review", "Revised by submitter.", actorId, now, null);
    }),

    // Attachment methods
    listAttachmentsByIdea: (ideaId) => stmts.listAttachmentsByIdea.all(ideaId),
    getAttachmentById:     (id) => stmts.getAttachmentById.get(id),
    getFirstAttachmentByIdea: (ideaId) => stmts.getFirstAttachmentByIdea.get(ideaId),
    insertAttachment: (att) =>
      stmts.insertAttachment.run(att.id, att.ideaId, att.name, att.type, att.size, att.blob ?? null, att.uploadedAt),

    // Draft methods
    listDraftsByUser: (userId) => stmts.listDraftsByUser.all(userId),
    getDraftById: (id) => stmts.getDraftById.get(id),
    updateDraftFields: (id, title, description, category, extraFields, updatedAt, authorId) =>
      stmts.updateDraftFields.run(title, description, category, extraFields, updatedAt, id, authorId),
    promoteDraft: (id, updatedAt) => stmts.promoteDraft.run(updatedAt, id),
    deleteDraft: (id, authorId) => stmts.deleteDraft.run(id, authorId),
    deleteAttachmentsByIdea: (ideaId) => stmts.deleteAttachmentsByIdea.run(ideaId),
    deleteAttachmentById: (attId, ideaId) => stmts.deleteAttachmentById.run(attId, ideaId),

    getSession: (token) => stmts.getSession.get(token),
    insertSession: (token, userId) =>
      stmts.insertSession.run(token, userId, new Date().toISOString()),
    deleteSession: (token) => stmts.deleteSession.run(token),

    // Revert last stage action (admin)
    // row = current idea row, STAGES = ordered array of stage objects
    revertLastAction: db.transaction((ideaId, row, STAGES, comment, actorId, now) => {
      const history = stmts.getHistory.all(ideaId);
      const isTerminal = ["accepted", "rejected"].includes(row.status);
      if (isTerminal) {
        // Reopen: restore to under-review at stage before terminal
        // The last history entry holds the stage where terminal action occurred
        const lastEntry = history[history.length - 1];
        const terminalStage = lastEntry?.stage || null;
        // Find stage before the terminal one, or first stage if none
        let restoreStage = null;
        if (terminalStage) {
          const idx = STAGES.findIndex((s) => s.id === terminalStage);
          restoreStage = idx > 0 ? STAGES[idx - 1].id : STAGES[0].id;
        } else {
          restoreStage = STAGES[0].id;
        }
        stmts.deleteLastHistory.run(ideaId);
        stmts.revertIdeaStage.run("under-review", restoreStage, now, ideaId);
        stmts.insertHistory.run(ideaId, "under-review", comment, actorId, now, restoreStage);
      } else {
        // Non-terminal: step back one stage
        const currentStage = row.current_stage;
        const idx = STAGES.findIndex((s) => s.id === currentStage);
        const prevStage = idx > 0 ? STAGES[idx - 1].id : null;
        stmts.deleteLastHistory.run(ideaId);
        if (prevStage) {
          stmts.revertIdeaStage.run("under-review", prevStage, now, ideaId);
          stmts.insertHistory.run(ideaId, "under-review", comment, actorId, now, prevStage);
        } else {
          // Revert to submitted (before first stage action)
          stmts.revertIdeaStage.run("submitted", null, now, ideaId);
          stmts.insertHistory.run(ideaId, "submitted", comment, actorId, now, null);
        }
      }
    }),

    // Phase 6: blind review
    setBlindReview: (ideaId, enabled) => {
      // Only allow if no non-submit history exists (i.e., review hasn't started)
      const { n } = stmts.countNonSubmitHistory.get(ideaId);
      if (n > 0) return false;
      stmts.setBlindReview.run(enabled ? 1 : 0, ideaId);
      return true;
    },

    // Phase 7: scores
    upsertScore: (id, ideaId, evaluatorId, stage, dimension, value, comment, now) =>
      stmts.upsertScore.run(id, ideaId, evaluatorId, stage, dimension, value, comment ?? null, now),

    listScoresByIdea: (ideaId) => stmts.listScoresByIdea.all(ideaId),

    aggregateScores: (ideaId) => {
      const rows = stmts.listScoresByIdea.all(ideaId);
      if (rows.length === 0) return null;
      // Per-dimension means across all evaluators
      const dimTotals = {};
      const dimCounts = {};
      for (const row of rows) {
        if (!dimTotals[row.dimension]) { dimTotals[row.dimension] = 0; dimCounts[row.dimension] = 0; }
        dimTotals[row.dimension] += row.value;
        dimCounts[row.dimension]++;
      }
      const byDimension = {};
      for (const dim of Object.keys(dimTotals)) {
        byDimension[dim] = Math.round((dimTotals[dim] / dimCounts[dim]) * 10) / 10;
      }
      // Composite: for each evaluator, compute weighted score, then average
      // Group by evaluator
      const byEvaluator = {};
      for (const row of rows) {
        if (!byEvaluator[row.evaluator_id]) byEvaluator[row.evaluator_id] = {};
        byEvaluator[row.evaluator_id][row.dimension] = row.value;
      }
      const composites = [];
      for (const dims of Object.values(byEvaluator)) {
        let score = 0;
        let counted = 0;
        for (const dimDef of SCORE_DIMENSIONS) {
          if (dims[dimDef.id] !== undefined) {
            const contrib = dimDef.invertedForComposite ? (6 - dims[dimDef.id]) : dims[dimDef.id];
            score += contrib;
            counted++;
          }
        }
        if (counted > 0) composites.push(score / counted);
      }
      const composite = composites.length > 0
        ? Math.round((composites.reduce((a, b) => a + b, 0) / composites.length) * 10) / 10
        : null;
      const evaluatorCount = Object.keys(byEvaluator).length;
      return { composite, byDimension, evaluatorCount };
    },
  };
}
