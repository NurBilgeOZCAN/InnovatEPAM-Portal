// Pure domain logic — no DB dependency. Ported from src/portal-core.js.
// These functions operate on plain objects and are safe to import in tests.

export const ROLES = Object.freeze({
  SUBMITTER: "submitter",
  ADMIN: "admin"
});

export const CATEGORIES = Object.freeze([
  "AI and Automation",
  "Customer Experience",
  "Developer Productivity",
  "Process Improvement",
  "Sustainability",
  "Workplace Experience"
]);

// Category-specific extra fields. Single source of truth — exported to frontend via GET /api/categories.
export const CATEGORY_FIELDS = Object.freeze({
  "AI and Automation": [
    { key: "model_or_tool",      label: "Model or tool",      help: "e.g. GPT-4o, internal RAG pipeline", type: "text",   required: true  },
    { key: "automation_target",  label: "Automation target",  help: "What process or task will be automated?", type: "text", required: false }
  ],
  "Customer Experience": [
    { key: "customer_segment",    label: "Customer segment",    help: "Which customer group is affected?", type: "text", required: true  },
    { key: "expected_csat_lift",  label: "Expected CSAT lift",  help: "e.g. +5pts, +10%",                type: "text", required: false }
  ],
  "Developer Productivity": [
    { key: "affected_team_size",         label: "Affected team size",          help: "Number of developers impacted (1–500)", type: "number", required: true  },
    { key: "time_saved_per_week_hours",  label: "Time saved per week (hours)", help: "Estimated hours saved per developer per week", type: "number", required: false }
  ],
  "Process Improvement": [
    { key: "current_process",  label: "Current process",  help: "Describe the existing workflow being improved", type: "textarea", required: true  },
    { key: "proposed_change",  label: "Proposed change",  help: "What specifically will change?",               type: "textarea", required: false }
  ],
  "Sustainability": [
    { key: "sustainability_metric", label: "Sustainability metric", help: "Which environmental metric is targeted?",
      type: "select", options: ["CO2", "Energy", "Waste", "Water", "Other"], required: true },
    { key: "quantified_impact",     label: "Quantified impact",     help: "e.g. 20% CO2 reduction, 500 kWh/month", type: "text", required: false }
  ],
  "Workplace Experience": [
    { key: "target_audience", label: "Target audience", help: "Who benefits from this change?", type: "text", required: true },
    { key: "rollout_scope",   label: "Rollout scope",   help: "Where will this be rolled out?",
      type: "select", options: ["Single office", "Country", "Global"], required: false }
  ]
});

export const STATUSES = Object.freeze([
  "submitted",
  "under-review",
  "accepted",
  "rejected"
]);

// Phase 5: configurable multi-stage pipeline
export const STAGES = Object.freeze([
  { id: "initial-screening", label: "Initial Screening",  order: 1 },
  { id: "technical-review",  label: "Technical Review",   order: 2 },
  { id: "business-impact",   label: "Business Impact",    order: 3 },
  { id: "final-selection",   label: "Final Selection",    order: 4 },
]);

// Phase 7: scoring dimensions (1–5 each; effort is inverted — lower effort = better)
export const SCORE_DIMENSIONS = Object.freeze([
  { id: "impact",      label: "Impact",      min: 1, max: 5, invertedForComposite: false },
  { id: "feasibility", label: "Feasibility", min: 1, max: 5, invertedForComposite: false },
  { id: "effort",      label: "Effort",      min: 1, max: 5, invertedForComposite: true  },
  { id: "innovation",  label: "Innovation",  min: 1, max: 5, invertedForComposite: false },
]);

// Draft status — stored in the same ideas table but excluded from normal flows
export const DRAFT_STATUS = "draft";

export const STATUS_META = Object.freeze({
  submitted: { label: "Submitted", tone: "new" },
  "under-review": { label: "Under review", tone: "review" },
  accepted: { label: "Accepted", tone: "accepted" },
  rejected: { label: "Rejected", tone: "rejected" }
});

export const DEMO_CREDENTIALS = Object.freeze([
  {
    role: ROLES.ADMIN,
    label: "Admin demo",
    email: "admin@innovatepam.local",
    password: "Admin123!"
  },
  {
    role: ROLES.SUBMITTER,
    label: "Submitter demo",
    email: "aylin@epam.local",
    password: "Submit123!"
  }
]);

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function normalizeStatus(status) {
  const cleaned = String(status || "").trim().toLowerCase().replace(/\s+/g, "-");
  return STATUSES.includes(cleaned) ? cleaned : "";
}

export function hashPassword(password, salt = "innovatepam") {
  let hash = 2166136261;
  const input = `${salt}:${String(password || "")}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createId(prefix = "id") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/i.test(value) || !/[0-9]/.test(value)) {
    return "Password must include letters and numbers.";
  }
  return "";
}

export function cleanText(value, limit = 400) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

export function cleanLongText(value, limit = 2500) {
  return String(value || "").trim().replace(/\n{3,}/g, "\n\n").slice(0, limit);
}

function normalizeRole(role) {
  return role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.SUBMITTER;
}

// Lenient validation for drafts: only title (1+ chars) and category (if provided) are checked.
export function validateDraftInput(input) {
  const title = cleanText(input?.title, 90);
  if (title.length < 1) return { error: "Draft title must not be empty." };

  const rawCategory = cleanText(input?.category, 80);
  const category = rawCategory === "" ? CATEGORIES[0] : rawCategory;
  if (!CATEGORIES.includes(category)) return { error: "Select a valid idea category." };

  // Sanitize extra_fields without enforcing required fields
  const rawExtra = input?.extra_fields;
  const extraProvided = rawExtra !== undefined && rawExtra !== null;
  const extraObj = extraProvided && typeof rawExtra === "object" ? rawExtra : {};
  const allowedFields = CATEGORY_FIELDS[category] || [];
  const allowedKeys = new Set(allowedFields.map((f) => f.key));
  if (extraProvided) {
    for (const key of Object.keys(extraObj)) {
      if (!allowedKeys.has(key)) {
        return { error: `Unknown extra field for category "${category}": ${key}` };
      }
    }
  }
  const extra_fields = {};
  for (const field of allowedFields) {
    const val = extraObj[field.key];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      extra_fields[field.key] = field.type === "number" ? Number(val) : cleanText(String(val), 500);
    }
  }
  const description = cleanLongText(input?.description, 2500);
  return { title, description, category, extra_fields };
}

export function validateIdeaInput(input) {
  const title = cleanText(input?.title, 90);
  const description = cleanLongText(input?.description, 2500);
  const category = cleanText(input?.category, 80);
  if (title.length < 5) return { error: "Idea title must be at least 5 characters." };
  if (description.length < 20) return { error: "Idea description must be at least 20 characters." };
  if (!CATEGORIES.includes(category)) return { error: "Select a valid idea category." };

  // Validate category-specific extra fields
  const allowedFields = CATEGORY_FIELDS[category] || [];
  const allowedKeys = new Set(allowedFields.map((f) => f.key));
  const rawExtra = input?.extra_fields;

  // Only enforce extra-field rules if the client actually provided the extra_fields key
  const extraProvided = rawExtra !== undefined && rawExtra !== null;
  const extra = extraProvided && typeof rawExtra === "object" ? rawExtra : {};

  // Reject unknown keys (only when extra_fields was explicitly sent)
  if (extraProvided) {
    for (const key of Object.keys(extra)) {
      if (!allowedKeys.has(key)) {
        return { error: `Unknown extra field for category "${category}": ${key}` };
      }
    }

    // Check required fields (only when extra_fields block was provided)
    for (const field of allowedFields) {
      if (field.required) {
        const val = extra[field.key];
        if (val === undefined || val === null || String(val).trim() === "") {
          return { error: `"${field.label}" is required for category "${category}".` };
        }
      }
    }
  }

  // Build sanitized extra map
  const extra_fields = {};
  for (const field of allowedFields) {
    const val = extra[field.key];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      if (field.type === "number") {
        extra_fields[field.key] = Number(val);
      } else {
        extra_fields[field.key] = cleanText(String(val), 500);
      }
    }
  }

  return { title, description, category, extra_fields };
}

export function validateRegistrationInput(input) {
  const name = cleanText(input?.name, 80);
  const email = normalizeEmail(input?.email);
  const password = String(input?.password || "");
  const role = normalizeRole(input?.role);
  if (name.length < 2) return { error: "Enter a full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };
  return { name, email, password, role };
}

// Keep these for backward compat with portal-core.test.mjs tests
export function getUserById(state, userId) {
  return state.users.find((user) => user.id === userId) || null;
}

export function getUserByEmail(state, email) {
  const normalizedEmail = normalizeEmail(email);
  return state.users.find((user) => user.email === normalizedEmail) || null;
}

export function createSeedState(now = new Date().toISOString()) {
  const createdAt = new Date(now).toISOString();
  const adminId = "user-admin";
  const submitterId = "user-aylin";
  const sampleIdeaId = "idea-ai-triage";

  return {
    version: 1,
    users: [
      {
        id: adminId,
        name: "Maya Admin",
        email: "admin@innovatepam.local",
        role: ROLES.ADMIN,
        passwordHash: hashPassword("Admin123!", adminId),
        createdAt
      },
      {
        id: submitterId,
        name: "Aylin Submitter",
        email: "aylin@epam.local",
        role: ROLES.SUBMITTER,
        passwordHash: hashPassword("Submit123!", submitterId),
        createdAt
      }
    ],
    ideas: [
      {
        id: sampleIdeaId,
        title: "AI-assisted idea triage",
        description:
          "Use a lightweight AI checklist to route employee ideas to the right evaluator and reduce manual sorting during review windows.",
        category: "AI and Automation",
        authorId: submitterId,
        status: "under-review",
        attachment: {
          name: "triage-outline.txt",
          type: "text/plain",
          size: 842,
          dataUrl: "",
          uploadedAt: createdAt
        },
        createdAt,
        updatedAt: createdAt,
        history: [
          { status: "submitted", comment: "Idea submitted with initial business case.", actorId: submitterId, at: createdAt },
          { status: "under-review", comment: "Moved into evaluator review for sprint demo.", actorId: adminId, at: createdAt }
        ]
      }
    ]
  };
}

export function registerUser(state, input, now = new Date().toISOString(), id = createId("user")) {
  const validation = validateRegistrationInput(input);
  if (validation.error) return { ok: false, error: validation.error };
  const { name, email, password, role } = validation;
  const createdAt = new Date(now).toISOString();
  if (getUserByEmail(state, email)) return { ok: false, error: "An account already exists for this email." };
  const user = { id, name, email, role, passwordHash: hashPassword(password, id), createdAt };
  return {
    ok: true,
    state: { ...state, users: [...state.users, user] },
    user: publicUser(user)
  };
}

export function loginUser(state, input) {
  const user = getUserByEmail(state, input?.email);
  if (!user) return { ok: false, error: "Email or password is incorrect." };
  const candidateHash = hashPassword(input?.password, user.id);
  if (candidateHash !== user.passwordHash) return { ok: false, error: "Email or password is incorrect." };
  return { ok: true, user: publicUser(user) };
}

export function createIdea(state, input, authorId, now = new Date().toISOString(), id = createId("idea")) {
  const author = getUserById(state, authorId);
  if (!author) return { ok: false, error: "Login is required before submitting an idea." };
  const validation = validateIdeaInput(input);
  if (validation.error) return { ok: false, error: validation.error };
  const { title, description, category } = validation;
  const createdAt = new Date(now).toISOString();
  const attachment = input?.attachment?.name
    ? {
        name: cleanText(input.attachment.name, 160),
        type: cleanText(input.attachment.type || "application/octet-stream", 120),
        size: Number(input.attachment.size || 0),
        dataUrl: String(input.attachment.dataUrl || ""),
        uploadedAt: createdAt
      }
    : null;
  const idea = {
    id, title, description, category,
    authorId: author.id, status: "submitted", attachment, createdAt, updatedAt: createdAt,
    history: [{ status: "submitted", comment: "Idea submitted.", actorId: author.id, at: createdAt }]
  };
  return { ok: true, state: { ...state, ideas: [idea, ...state.ideas] }, idea };
}

export function updateIdeaStatus(state, ideaId, evaluatorId, status, comment, now = new Date().toISOString()) {
  const evaluator = getUserById(state, evaluatorId);
  const nextStatus = normalizeStatus(status);
  const reviewComment = cleanLongText(comment, 1000);
  const reviewedAt = new Date(now).toISOString();
  if (!evaluator || evaluator.role !== ROLES.ADMIN) return { ok: false, error: "Only evaluator admins can update idea status." };
  if (!nextStatus || nextStatus === "submitted") return { ok: false, error: "Select a review status." };
  if (["accepted", "rejected"].includes(nextStatus) && reviewComment.length < 4) {
    return { ok: false, error: "Add an evaluator comment before accepting or rejecting." };
  }
  let found = false;
  const ideas = state.ideas.map((idea) => {
    if (idea.id !== ideaId) return idea;
    found = true;
    return {
      ...idea, status: nextStatus, updatedAt: reviewedAt,
      history: [
        ...(idea.history || []),
        { status: nextStatus, comment: reviewComment || STATUS_META[nextStatus].label, actorId: evaluator.id, at: reviewedAt }
      ]
    };
  });
  if (!found) return { ok: false, error: "Idea was not found." };
  return { ok: true, state: { ...state, ideas } };
}

export function getVisibleIdeas(state, user) {
  if (!user) return [];
  const visibleIdeas = user.role === ROLES.ADMIN
    ? state.ideas
    : state.ideas.filter((idea) => idea.authorId === user.id);
  return [...visibleIdeas].sort((l, r) => r.updatedAt.localeCompare(l.updatedAt));
}

export function getPortalMetrics(state, user) {
  const visibleIdeas = getVisibleIdeas(state, user);
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const idea of visibleIdeas) {
    byStatus[idea.status] = (byStatus[idea.status] || 0) + 1;
  }
  return {
    total: visibleIdeas.length,
    byStatus,
    withAttachments: visibleIdeas.filter((idea) => Boolean(idea.attachment)).length,
    newestUpdate: visibleIdeas[0]?.updatedAt || ""
  };
}
