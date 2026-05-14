import { randomUUID } from "node:crypto";
import {
  ROLES,
  CATEGORIES,
  CATEGORY_FIELDS,
  STAGES,
  SCORE_DIMENSIONS,
  hashPassword,
  normalizeEmail,
  normalizeStatus,
  publicUser,
  createId,
  validateRegistrationInput,
  validateIdeaInput,
  validateDraftInput,
  cleanLongText,
  STATUS_META
} from "./domain.js";

const MAX_ATTACHMENTS     = 5;
const MAX_ATTACHMENTS_MB  = 8;
const MAX_ATTACHMENTS_BYTES = MAX_ATTACHMENTS_MB * 1024 * 1024;

// Phase 6: deterministic 4-hex-char anonymization handle based on author_id
function anonHandle(authorId) {
  let hash = 2166136261;
  const input = String(authorId || "");
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0").slice(0, 4).toUpperCase();
  return `Submitter #${hex}`;
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) cookies[k.trim()] = v.join("=").trim();
  }
  return cookies;
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

export function makeApiHandler(repo, dropAndReseed) {
  async function handle(req, res, urlPath) {
    const method = req.method || "GET";
    const cookies = parseCookies(req.headers["cookie"]);
    const sessionToken = cookies["session"] || null;

    // Resolve current user from session token
    let currentUser = null;
    if (sessionToken) {
      const session = repo.getSession(sessionToken);
      if (session) {
        const row = repo.getUserById(session.user_id);
        if (row) currentUser = rowToUser(row);
      }
    }

    try {
      // POST /api/auth/register
      if (method === "POST" && urlPath === "/api/auth/register") {
        const body = await readBody(req);
        const validation = validateRegistrationInput(body);
        if (validation.error) return send(res, 400, { error: validation.error });
        const { name, email, password, role } = validation;
        if (repo.getUserByEmail(email)) {
          return send(res, 409, { error: "An account already exists for this email." });
        }
        const id = createId("user");
        const now = new Date().toISOString();
        repo.insertUser({ id, name, email, role, passwordHash: hashPassword(password, id), createdAt: now });
        const user = publicUser(rowToUser(repo.getUserById(id)));
        const token = randomUUID();
        repo.insertSession(token, id);
        setSessionCookie(res, token);
        return send(res, 201, { user, sessionToken: token });
      }

      // POST /api/auth/login
      if (method === "POST" && urlPath === "/api/auth/login") {
        const body = await readBody(req);
        const email = normalizeEmail(body?.email);
        const row = repo.getUserByEmail(email);
        if (!row) return send(res, 401, { error: "Email or password is incorrect." });
        const user = rowToUser(row);
        if (hashPassword(body?.password, user.id) !== user.passwordHash) {
          return send(res, 401, { error: "Email or password is incorrect." });
        }
        const token = randomUUID();
        repo.insertSession(token, user.id);
        setSessionCookie(res, token);
        return send(res, 200, { user: publicUser(user), sessionToken: token });
      }

      // POST /api/auth/logout
      if (method === "POST" && urlPath === "/api/auth/logout") {
        if (sessionToken) repo.deleteSession(sessionToken);
        res.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
          "set-cookie": "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
        });
        return res.end(JSON.stringify({ ok: true }));
      }

      // GET /api/session
      if (method === "GET" && urlPath === "/api/session") {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        return send(res, 200, { user: publicUser(currentUser) });
      }

      // POST /api/demo/reset
      if (method === "POST" && urlPath === "/api/demo/reset") {
        if (sessionToken) repo.deleteSession(sessionToken);
        dropAndReseed();
        res.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
          "set-cookie": "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
        });
        return res.end(JSON.stringify({ ok: true }));
      }

      // GET /api/categories
      if (method === "GET" && urlPath === "/api/categories") {
        return send(res, 200, { categories: CATEGORIES, fields: CATEGORY_FIELDS });
      }

      // GET /api/stages
      if (method === "GET" && urlPath === "/api/stages") {
        return send(res, 200, { stages: STAGES });
      }

      // GET /api/score-dimensions
      if (method === "GET" && urlPath === "/api/score-dimensions") {
        return send(res, 200, { dimensions: SCORE_DIMENSIONS });
      }

      // GET /api/ideas
      if (method === "GET" && urlPath === "/api/ideas") {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        const authorId = currentUser.role === ROLES.ADMIN ? null : currentUser.id;
        const rows = repo.listIdeas(authorId);
        const ideas = rows.map((row) => rowToIdea(row, repo, currentUser));
        return send(res, 200, { ideas });
      }

      // POST /api/ideas
      if (method === "POST" && urlPath === "/api/ideas") {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        const body = await readBody(req);
        const validation = validateIdeaInput(body);
        if (validation.error) return send(res, 400, { error: validation.error });
        const { title, description, category, extra_fields } = validation;
        const id = createId("idea");
        const now = new Date().toISOString();

        // Parse attachments array (Phase 3)
        const parsedAttachmentsResult = parseAttachmentsBody(body);
        if (parsedAttachmentsResult.error) return send(res, 400, { error: parsedAttachmentsResult.error });
        const parsedAttachments = parsedAttachmentsResult.list;

        const blindReview = body?.blind_review ? 1 : 0;
        repo.insertIdea({
          id, title, description, category,
          authorId: currentUser.id, status: "submitted",
          extraFields: extra_fields && Object.keys(extra_fields).length > 0
            ? JSON.stringify(extra_fields) : null,
          blindReview,
          createdAt: now, updatedAt: now
        });
        repo.insertHistoryEntry({ ideaId: id, status: "submitted", comment: "Idea submitted.", actorId: currentUser.id, at: now });

        // Insert attachments
        for (const att of parsedAttachments) {
          repo.insertAttachment({
            id: `att-${randomUUID()}`,
            ideaId: id,
            name: att.name,
            type: att.type,
            size: att.size,
            blob: att.blob,
            uploadedAt: now
          });
        }

        const idea = rowToIdea(repo.getIdeaById(id), repo, currentUser);
        return send(res, 201, { idea });
      }

      // POST /api/ideas/:id/stage-action  — admin multi-stage review
      const stageActionMatch = urlPath.match(/^\/api\/ideas\/([^/]+)\/stage-action$/);
      if (method === "POST" && stageActionMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        if (currentUser.role !== ROLES.ADMIN) return send(res, 403, { error: "Only admins can perform stage actions." });
        const ideaId = decodeURIComponent(stageActionMatch[1]);
        const body = await readBody(req);
        const action = String(body?.action || "").trim();
        const comment = cleanLongText(body?.comment || "", 1000);
        if (!["approve", "reject", "request-revision"].includes(action)) {
          return send(res, 400, { error: "action must be approve, reject, or request-revision." });
        }
        const row = repo.getIdeaById(ideaId);
        if (!row) return send(res, 404, { error: "Idea was not found." });
        if (row.status === "draft") return send(res, 400, { error: "Cannot review a draft." });
        if (["accepted", "rejected"].includes(row.status)) {
          return send(res, 400, { error: "Idea is already in a terminal state." });
        }
        const now = new Date().toISOString();

        // Initialise stage if not yet set (first admin action on submitted/under-review idea)
        let currentStage = row.current_stage;
        if (!currentStage) {
          currentStage = STAGES[0].id;
        }
        const stageIndex = STAGES.findIndex((s) => s.id === currentStage);

        if (action === "reject") {
          if (comment.length < 4) return send(res, 400, { error: "Comment is required when rejecting." });
          repo.setIdeaTerminal(ideaId, "rejected", currentStage, comment, currentUser.id, now);
          return send(res, 200, { idea: rowToIdea(repo.getIdeaById(ideaId), repo, currentUser) });
        }

        if (action === "request-revision") {
          if (comment.length < 4) return send(res, 400, { error: "Comment is required when requesting revision." });
          repo.requestRevision(ideaId, currentStage, comment, currentUser.id, now);
          return send(res, 200, { idea: rowToIdea(repo.getIdeaById(ideaId), repo, currentUser) });
        }

        // action === "approve"
        const isFinalStage = stageIndex === STAGES.length - 1;
        if (isFinalStage && comment.length < 4) {
          return send(res, 400, { error: "Comment is required when approving at the final stage." });
        }
        if (isFinalStage) {
          repo.setIdeaTerminal(ideaId, "accepted", currentStage, comment, currentUser.id, now);
          return send(res, 200, { idea: rowToIdea(repo.getIdeaById(ideaId), repo, currentUser) });
        }
        // Advance to next stage
        const nextStage = STAGES[stageIndex + 1].id;
        repo.setIdeaStage(ideaId, nextStage, "under-review", comment || `Advanced to ${STAGES[stageIndex + 1].label}`, currentUser.id, now);
        return send(res, 200, { idea: rowToIdea(repo.getIdeaById(ideaId), repo, currentUser) });
      }

      // PATCH /api/ideas/:id  — submitter revision edit
      const ideaPatchMatch = urlPath.match(/^\/api\/ideas\/([^/]+)$/);
      if (method === "PATCH" && ideaPatchMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        const ideaId = decodeURIComponent(ideaPatchMatch[1]);
        const row = repo.getIdeaById(ideaId);
        if (!row) return send(res, 404, { error: "Idea was not found." });
        if (currentUser.role === ROLES.ADMIN) return send(res, 403, { error: "Admins cannot edit idea content." });
        if (row.author_id !== currentUser.id) return send(res, 403, { error: "Forbidden." });
        if (row.status !== "submitted" || !row.revision_requested) {
          return send(res, 403, { error: "Idea is not awaiting revision." });
        }
        const body = await readBody(req);
        const validation = validateIdeaInput({
          title: body.title ?? row.title,
          description: body.description ?? row.description,
          category: body.category ?? row.category,
          extra_fields: body.extra_fields ?? (row.extra_fields ? JSON.parse(row.extra_fields) : null)
        });
        if (validation.error) return send(res, 400, { error: validation.error });
        const { title, description, category, extra_fields } = validation;
        const now = new Date().toISOString();
        repo.submitRevision(
          ideaId, title, description, category,
          extra_fields && Object.keys(extra_fields).length > 0 ? JSON.stringify(extra_fields) : null,
          currentUser.id, now
        );
        // Reconcile attachments if the body included the key (same pattern as PATCH /api/drafts/:id)
        if (body.attachments !== undefined) {
          const incoming = Array.isArray(body.attachments) ? body.attachments : [];
          const existing = repo.listAttachmentsByIdea(ideaId);
          const keepIds = new Set(incoming.filter((a) => a.id).map((a) => a.id));
          for (const att of existing) {
            if (!keepIds.has(att.id)) repo.deleteAttachmentById(att.id, ideaId);
          }
          const existingIds = new Set(existing.map((a) => a.id));
          const parsed = parseAttachmentsBody({ attachments: incoming.filter((a) => !a.id) });
          if (parsed.error) return send(res, 400, { error: parsed.error });
          for (const att of parsed.list) {
            if (!existingIds.has(att.id)) {
              repo.insertAttachment({ id: `att-${randomUUID()}`, ideaId, name: att.name, type: att.type, size: att.size, blob: att.blob, uploadedAt: now });
            }
          }
        }
        return send(res, 200, { idea: rowToIdea(repo.getIdeaById(ideaId), repo, currentUser) });
      }

      // PATCH /api/ideas/:id/status
      const patchMatch = urlPath.match(/^\/api\/ideas\/([^/]+)\/status$/);
      if (method === "PATCH" && patchMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        if (currentUser.role !== ROLES.ADMIN) return send(res, 403, { error: "Only evaluator admins can update idea status." });
        const ideaId = decodeURIComponent(patchMatch[1]);
        const body = await readBody(req);
        const nextStatus = normalizeStatus(body?.status);
        const comment = cleanLongText(body?.comment || "", 1000);
        if (!nextStatus || nextStatus === "submitted") return send(res, 400, { error: "Select a review status." });
        if (["accepted", "rejected"].includes(nextStatus) && comment.length < 4) {
          return send(res, 400, { error: "Add an evaluator comment before accepting or rejecting." });
        }
        const row = repo.getIdeaById(ideaId);
        if (!row) return send(res, 404, { error: "Idea was not found." });
        const now = new Date().toISOString();
        repo.updateIdeaStatus(ideaId, nextStatus, now);
        repo.insertHistoryEntry({
          ideaId,
          status: nextStatus,
          comment: comment || STATUS_META[nextStatus].label,
          actorId: currentUser.id,
          at: now
        });
        const idea = rowToIdea(repo.getIdeaById(ideaId), repo, currentUser);
        return send(res, 200, { idea });
      }

      // GET /api/attachments/:id  — stream attachment blob
      const attMatch = urlPath.match(/^\/api\/attachments\/([^/]+)$/);
      if (method === "GET" && attMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        const attId = decodeURIComponent(attMatch[1]);
        const att = repo.getAttachmentById(attId);
        if (!att) return send(res, 404, { error: "Attachment not found." });
        // Auth check: admin can see all, submitter only their own
        const ideaRow = repo.getIdeaById(att.idea_id);
        if (!ideaRow) return send(res, 404, { error: "Idea not found." });
        if (currentUser.role !== ROLES.ADMIN && ideaRow.author_id !== currentUser.id) {
          return send(res, 403, { error: "Forbidden." });
        }
        if (!att.blob) return send(res, 404, { error: "No binary data for this attachment." });
        res.writeHead(200, {
          "content-type": att.type || "application/octet-stream",
          "content-disposition": `attachment; filename="${att.name || "file"}"`,
          "content-length": att.blob.length
        });
        return res.end(att.blob);
      }

      // GET /api/ideas/:id/attachment  — legacy alias: returns first attachment
      const legacyAttMatch = urlPath.match(/^\/api\/ideas\/([^/]+)\/attachment$/);
      if (method === "GET" && legacyAttMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        const ideaId = decodeURIComponent(legacyAttMatch[1]);
        const ideaRow = repo.getIdeaById(ideaId);
        if (!ideaRow) return send(res, 404, { error: "Idea not found." });
        if (currentUser.role !== ROLES.ADMIN && ideaRow.author_id !== currentUser.id) {
          return send(res, 403, { error: "Forbidden." });
        }
        // Try new attachments table first
        const att = repo.getFirstAttachmentByIdea(ideaId);
        if (att && att.blob) {
          res.writeHead(200, {
            "content-type": att.type || "application/octet-stream",
            "content-disposition": `attachment; filename="${att.name || "file"}"`,
            "content-length": att.blob.length
          });
          return res.end(att.blob);
        }
        // Fall back to legacy blob column
        if (ideaRow.attachment_blob) {
          res.writeHead(200, {
            "content-type": ideaRow.attachment_type || "application/octet-stream",
            "content-disposition": `attachment; filename="${ideaRow.attachment_name || "file"}"`,
            "content-length": ideaRow.attachment_blob.length
          });
          return res.end(ideaRow.attachment_blob);
        }
        return send(res, 404, { error: "No attachment." });
      }

      // ── Draft routes ────────────────────────────────────────────────────

      // GET /api/drafts
      if (method === "GET" && urlPath === "/api/drafts") {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        const rows = repo.listDraftsByUser(currentUser.id);
        return send(res, 200, { drafts: rows.map((r) => rowToIdea(r, repo)) });
      }

      // POST /api/drafts
      if (method === "POST" && urlPath === "/api/drafts") {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        const body = await readBody(req);
        const validation = validateDraftInput(body);
        if (validation.error) return send(res, 400, { error: validation.error });
        const { title, description, category, extra_fields } = validation;
        const id = createId("idea");
        const now = new Date().toISOString();
        const parsedAttachments = parseAttachmentsBody(body);
        if (parsedAttachments.error) return send(res, 400, { error: parsedAttachments.error });
        repo.insertIdea({
          id, title, description, category,
          authorId: currentUser.id, status: "draft",
          extraFields: extra_fields && Object.keys(extra_fields).length > 0
            ? JSON.stringify(extra_fields) : null,
          createdAt: now, updatedAt: now
        });
        for (const att of parsedAttachments.list) {
          repo.insertAttachment({ id: `att-${randomUUID()}`, ideaId: id, name: att.name, type: att.type, size: att.size, blob: att.blob, uploadedAt: now });
        }
        return send(res, 201, { draft: rowToIdea(repo.getIdeaById(id), repo, currentUser) });
      }

      // GET /api/drafts/:id
      const draftIdMatch = urlPath.match(/^\/api\/drafts\/([^/]+)$/);
      if (method === "GET" && draftIdMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        const draftId = decodeURIComponent(draftIdMatch[1]);
        const row = repo.getDraftById(draftId);
        if (!row) return send(res, 404, { error: "Draft not found." });
        if (row.author_id !== currentUser.id) return send(res, 403, { error: "Forbidden." });
        return send(res, 200, { draft: rowToIdea(row, repo, currentUser) });
      }

      // PATCH /api/drafts/:id
      const draftPatchMatch = urlPath.match(/^\/api\/drafts\/([^/]+)$/);
      if (method === "PATCH" && draftPatchMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        const draftId = decodeURIComponent(draftPatchMatch[1]);
        const row = repo.getDraftById(draftId);
        if (!row) return send(res, 404, { error: "Draft not found." });
        if (row.author_id !== currentUser.id) return send(res, 403, { error: "Forbidden." });
        const body = await readBody(req);
        const validation = validateDraftInput({ ...row, ...body, title: body.title ?? row.title, category: body.category ?? row.category });
        if (validation.error) return send(res, 400, { error: validation.error });
        const { title, description, category, extra_fields } = validation;
        const now = new Date().toISOString();
        repo.updateDraftFields(
          draftId, title, description, category,
          extra_fields && Object.keys(extra_fields).length > 0 ? JSON.stringify(extra_fields) : null,
          now, currentUser.id
        );
        // Reconcile attachments if the body included the key
        if (body.attachments !== undefined) {
          const incoming = Array.isArray(body.attachments) ? body.attachments : [];
          const existing = repo.listAttachmentsByIdea(draftId);
          const keepIds = new Set(incoming.filter((a) => a.id).map((a) => a.id));
          for (const att of existing) {
            if (!keepIds.has(att.id)) repo.deleteAttachmentById(att.id, draftId);
          }
          const existingIds = new Set(existing.map((a) => a.id));
          const parsed = parseAttachmentsBody({ attachments: incoming.filter((a) => !a.id) });
          if (parsed.error) return send(res, 400, { error: parsed.error });
          for (const att of parsed.list) {
            if (!existingIds.has(att.id)) {
              repo.insertAttachment({ id: `att-${randomUUID()}`, ideaId: draftId, name: att.name, type: att.type, size: att.size, blob: att.blob, uploadedAt: now });
            }
          }
        }
        return send(res, 200, { draft: rowToIdea(repo.getIdeaById(draftId), repo, currentUser) });
      }

      // DELETE /api/drafts/:id
      const draftDeleteMatch = urlPath.match(/^\/api\/drafts\/([^/]+)$/);
      if (method === "DELETE" && draftDeleteMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        const draftId = decodeURIComponent(draftDeleteMatch[1]);
        const row = repo.getDraftById(draftId);
        if (!row) return send(res, 404, { error: "Draft not found." });
        if (row.author_id !== currentUser.id) return send(res, 403, { error: "Forbidden." });
        repo.deleteDraft(draftId, currentUser.id);
        return send(res, 200, { ok: true });
      }

      // POST /api/drafts/:id/submit
      const draftSubmitMatch = urlPath.match(/^\/api\/drafts\/([^/]+)\/submit$/);
      if (method === "POST" && draftSubmitMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        const draftId = decodeURIComponent(draftSubmitMatch[1]);
        const row = repo.getDraftById(draftId);
        if (!row) return send(res, 404, { error: "Draft not found." });
        if (row.author_id !== currentUser.id) return send(res, 403, { error: "Forbidden." });
        // Run full validation
        let extra_fields_parsed = null;
        try { extra_fields_parsed = row.extra_fields ? JSON.parse(row.extra_fields) : null; } catch { extra_fields_parsed = null; }
        const validation = validateIdeaInput({
          title: row.title,
          description: row.description,
          category: row.category,
          extra_fields: extra_fields_parsed
        });
        if (validation.error) return send(res, 400, { error: validation.error });
        const now = new Date().toISOString();
        repo.promoteDraft(draftId, now);
        repo.insertHistoryEntry({ ideaId: draftId, status: "submitted", comment: "Idea submitted.", actorId: currentUser.id, at: now });
        const idea = rowToIdea(repo.getIdeaById(draftId), repo, currentUser);
        return send(res, 200, { idea });
      }

      // POST /api/ideas/:id/revert  — undo last stage action (admin)
      const revertMatch = urlPath.match(/^\/api\/ideas\/([^/]+)\/revert$/);
      if (method === "POST" && revertMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        if (currentUser.role !== ROLES.ADMIN) return send(res, 403, { error: "Only admins can revert." });
        const ideaId = decodeURIComponent(revertMatch[1]);
        const body = await readBody(req);
        const comment = cleanLongText(body?.comment || "", 1000);
        if (comment.length < 4) return send(res, 400, { error: "Comment is required to revert (min 4 chars)." });
        const row = repo.getIdeaById(ideaId);
        if (!row) return send(res, 404, { error: "Idea was not found." });
        if (row.status === "draft" || (row.status === "submitted" && !row.current_stage)) {
          return send(res, 409, { error: "Nothing to revert on this idea." });
        }
        const now = new Date().toISOString();
        repo.revertLastAction(ideaId, row, STAGES, comment, currentUser.id, now);
        return send(res, 200, { idea: rowToIdea(repo.getIdeaById(ideaId), repo, currentUser) });
      }

      // POST /api/ideas/:id/blind-review  — Phase 6
      const blindReviewMatch = urlPath.match(/^\/api\/ideas\/([^/]+)\/blind-review$/);
      if (method === "POST" && blindReviewMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        if (currentUser.role !== ROLES.ADMIN) return send(res, 403, { error: "Only admins can toggle blind review." });
        const ideaId = decodeURIComponent(blindReviewMatch[1]);
        const body = await readBody(req);
        const enabled = Boolean(body?.enabled);
        const row = repo.getIdeaById(ideaId);
        if (!row) return send(res, 404, { error: "Idea was not found." });
        const ok = repo.setBlindReview(ideaId, enabled);
        if (!ok) return send(res, 409, { error: "Blind review cannot be changed after review has started." });
        return send(res, 200, { idea: rowToIdea(repo.getIdeaById(ideaId), repo, currentUser) });
      }

      // POST /api/ideas/:id/scores  — Phase 7
      const scoresPostMatch = urlPath.match(/^\/api\/ideas\/([^/]+)\/scores$/);
      if (method === "POST" && scoresPostMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        if (currentUser.role !== ROLES.ADMIN) return send(res, 403, { error: "Only admins can submit scores." });
        const ideaId = decodeURIComponent(scoresPostMatch[1]);
        const body = await readBody(req);
        const row = repo.getIdeaById(ideaId);
        if (!row) return send(res, 404, { error: "Idea was not found." });
        const stage = body?.stage || row.current_stage || null;
        const scoresObj = body?.scores;
        if (!scoresObj || typeof scoresObj !== "object") return send(res, 400, { error: "scores object is required." });
        const validDimIds = new Set(SCORE_DIMENSIONS.map((d) => d.id));
        const now = new Date().toISOString();
        for (const [dim, val] of Object.entries(scoresObj)) {
          if (!validDimIds.has(dim)) return send(res, 400, { error: `Unknown dimension: ${dim}` });
          const numVal = Number(val);
          if (!Number.isInteger(numVal) || numVal < 1 || numVal > 5) {
            return send(res, 400, { error: `Score value for ${dim} must be an integer between 1 and 5.` });
          }
          const scoreId = `score-${randomUUID()}`;
          repo.upsertScore(scoreId, ideaId, currentUser.id, stage, dim, numVal, body?.comment ?? null, now);
        }
        const aggregate = repo.aggregateScores(ideaId);
        return send(res, 200, { ok: true, aggregate });
      }

      // GET /api/ideas/:id/scores  — Phase 7
      const scoresGetMatch = urlPath.match(/^\/api\/ideas\/([^/]+)\/scores$/);
      if (method === "GET" && scoresGetMatch) {
        if (!currentUser) return send(res, 401, { error: "Not authenticated." });
        if (currentUser.role !== ROLES.ADMIN) return send(res, 403, { error: "Scores are only visible to admins." });
        const ideaId = decodeURIComponent(scoresGetMatch[1]);
        const row = repo.getIdeaById(ideaId);
        if (!row) return send(res, 404, { error: "Idea was not found." });
        const scores = repo.listScoresByIdea(ideaId);
        const aggregate = repo.aggregateScores(ideaId);
        return send(res, 200, { scores, aggregate });
      }

      return send(res, 404, { error: "Not found." });
    } catch (err) {
      console.error("API error:", err);
      return send(res, 500, { error: "Internal server error." });
    }
  }

  return handle;
}

function parseAttachmentsBody(body) {
  const attachmentsInput = Array.isArray(body?.attachments) ? body.attachments : [];
  if (attachmentsInput.length > MAX_ATTACHMENTS) {
    return { error: `Maximum ${MAX_ATTACHMENTS} attachments per idea.` };
  }
  let totalBytes = 0;
  const list = [];
  for (const att of attachmentsInput) {
    if (!att?.name) continue;
    const attName = String(att.name).slice(0, 160);
    const attType = String(att.type || "application/octet-stream").slice(0, 120);
    const attSize = Number(att.size || 0);
    totalBytes += attSize;
    let blob = null;
    if (att.dataUrl) {
      const match = att.dataUrl.match(/^data:[^;]+;base64,(.+)$/);
      if (match) blob = Buffer.from(match[1], "base64");
    }
    list.push({ name: attName, type: attType, size: attSize, blob });
  }
  if (totalBytes > MAX_ATTACHMENTS_BYTES) {
    return { error: `Total attachment size must not exceed ${MAX_ATTACHMENTS_MB} MB.` };
  }
  return { list };
}

function setSessionCookie(res, token) {
  res.setHeader("set-cookie", `session=${token}; Path=/; HttpOnly; SameSite=Lax`);
}

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

function rowToIdea(row, repo, viewingUser = null) {
  if (!row) return null;
  const history = repo.getHistory(row.id).map((h) => ({
    status: h.status,
    stage: h.stage || null,
    comment: h.comment,
    actorId: h.actor_id,
    at: h.at
  }));

  // Parse extra_fields JSON
  let extra_fields = null;
  if (row.extra_fields) {
    try { extra_fields = JSON.parse(row.extra_fields); } catch { extra_fields = null; }
  }

  // Attachments from the new table (no blob in list payload)
  const attachmentRows = repo.listAttachmentsByIdea(row.id);
  const attachments = attachmentRows.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    size: a.size,
    uploadedAt: a.uploaded_at
  }));

  // Legacy compat: if no rows in attachments table but legacy cols present, expose as single item
  const legacyFallback = attachments.length === 0 && row.attachment_name
    ? [{ id: null, name: row.attachment_name, type: row.attachment_type, size: row.attachment_size, uploadedAt: row.created_at }]
    : [];

  const finalAttachments = attachments.length > 0 ? attachments : legacyFallback;

  // Phase 6: blind review anonymization
  // Anonymize when: blind_review=1 AND status is non-terminal AND viewer is not the author
  const isTerminalStatus = ["accepted", "rejected"].includes(row.status);
  const isAuthor = viewingUser && viewingUser.id === row.author_id;
  const shouldAnonymize = row.blind_review === 1 && !isTerminalStatus && !isAuthor;

  let authorName = row.author_name || null;
  let authorEmail = row.author_email || null;
  const handle = anonHandle(row.author_id);

  if (shouldAnonymize) {
    authorName = handle;
    authorEmail = null;
  }

  // Anonymize history actor names for history entries where the actor is the author (blind mode)
  const finalHistory = shouldAnonymize
    ? history.map((h) => ({
        ...h,
        actorId: h.actorId === row.author_id ? handle : h.actorId
      }))
    : history;

  // Phase 7: scoring aggregate (admins see full scoring; submitters see nothing)
  let scoring = undefined;
  let myScores = undefined;
  if (viewingUser && viewingUser.role === ROLES.ADMIN) {
    const agg = repo.aggregateScores(row.id);
    if (agg) {
      scoring = { composite: agg.composite, byDimension: agg.byDimension, evaluatorCount: agg.evaluatorCount };
    }
    // Only this admin's own scores, keyed by dimension
    const all = repo.listScoresByIdea(row.id);
    myScores = {};
    for (const s of all) {
      if (s.evaluator_id === viewingUser.id) {
        myScores[s.dimension] = s.value;
      }
    }
  }

  const result = {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    authorId: row.author_id,
    authorName,
    authorEmail,
    status: row.status,
    current_stage: row.current_stage || null,
    revision_requested: row.revision_requested ? 1 : 0,
    revision_from_stage: row.revision_from_stage || null,
    blind_review: row.blind_review ? 1 : 0,
    extra_fields,
    attachments: finalAttachments,
    // Legacy compat field for older frontend code
    attachment: finalAttachments.length > 0 ? finalAttachments[0] : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    history: finalHistory
  };

  if (scoring !== undefined) result.scoring = scoring;
  if (myScores !== undefined) result.myScores = myScores;

  return result;
}
