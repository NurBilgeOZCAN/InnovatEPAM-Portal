export const STORAGE_KEY = "innovatepam.portal.v1";

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

export const STATUSES = Object.freeze([
  "submitted",
  "under-review",
  "accepted",
  "rejected"
]);

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
  if (!user) {
    return null;
  }
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

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
          {
            status: "submitted",
            comment: "Idea submitted with initial business case.",
            actorId: submitterId,
            at: createdAt
          },
          {
            status: "under-review",
            comment: "Moved into evaluator review for sprint demo.",
            actorId: adminId,
            at: createdAt
          }
        ]
      }
    ]
  };
}

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[a-z]/i.test(value) || !/[0-9]/.test(value)) {
    return "Password must include letters and numbers.";
  }
  return "";
}

function cleanText(value, limit = 400) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function cleanLongText(value, limit = 2500) {
  return String(value || "").trim().replace(/\n{3,}/g, "\n\n").slice(0, limit);
}

function normalizeRole(role) {
  return role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.SUBMITTER;
}

function failure(error) {
  return { ok: false, error };
}

function success(payload) {
  return { ok: true, ...payload };
}

export function registerUser(state, input, now = new Date().toISOString(), id = createId("user")) {
  const name = cleanText(input?.name, 80);
  const email = normalizeEmail(input?.email);
  const password = String(input?.password || "");
  const role = normalizeRole(input?.role);
  const createdAt = new Date(now).toISOString();

  if (name.length < 2) {
    return failure("Enter a full name.");
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return failure("Enter a valid email address.");
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return failure(passwordError);
  }
  if (getUserByEmail(state, email)) {
    return failure("An account already exists for this email.");
  }

  const user = {
    id,
    name,
    email,
    role,
    passwordHash: hashPassword(password, id),
    createdAt
  };

  return success({
    state: {
      ...state,
      users: [...state.users, user]
    },
    user: publicUser(user)
  });
}

export function loginUser(state, input) {
  const user = getUserByEmail(state, input?.email);
  if (!user) {
    return failure("Email or password is incorrect.");
  }
  const candidateHash = hashPassword(input?.password, user.id);
  if (candidateHash !== user.passwordHash) {
    return failure("Email or password is incorrect.");
  }
  return success({ user: publicUser(user) });
}

function normalizeAttachment(attachment, now) {
  if (!attachment || !attachment.name) {
    return null;
  }
  return {
    name: cleanText(attachment.name, 160),
    type: cleanText(attachment.type || "application/octet-stream", 120),
    size: Number(attachment.size || 0),
    dataUrl: String(attachment.dataUrl || ""),
    uploadedAt: new Date(now).toISOString()
  };
}

export function createIdea(state, input, authorId, now = new Date().toISOString(), id = createId("idea")) {
  const author = getUserById(state, authorId);
  const createdAt = new Date(now).toISOString();
  const title = cleanText(input?.title, 90);
  const description = cleanLongText(input?.description, 2500);
  const category = cleanText(input?.category, 80);
  const attachment = normalizeAttachment(input?.attachment, createdAt);

  if (!author) {
    return failure("Login is required before submitting an idea.");
  }
  if (title.length < 5) {
    return failure("Idea title must be at least 5 characters.");
  }
  if (description.length < 20) {
    return failure("Idea description must be at least 20 characters.");
  }
  if (!CATEGORIES.includes(category)) {
    return failure("Select a valid idea category.");
  }

  const idea = {
    id,
    title,
    description,
    category,
    authorId: author.id,
    status: "submitted",
    attachment,
    createdAt,
    updatedAt: createdAt,
    history: [
      {
        status: "submitted",
        comment: "Idea submitted.",
        actorId: author.id,
        at: createdAt
      }
    ]
  };

  return success({
    state: {
      ...state,
      ideas: [idea, ...state.ideas]
    },
    idea
  });
}

export function updateIdeaStatus(
  state,
  ideaId,
  evaluatorId,
  status,
  comment,
  now = new Date().toISOString()
) {
  const evaluator = getUserById(state, evaluatorId);
  const nextStatus = normalizeStatus(status);
  const reviewComment = cleanLongText(comment, 1000);
  const reviewedAt = new Date(now).toISOString();

  if (!evaluator || evaluator.role !== ROLES.ADMIN) {
    return failure("Only evaluator admins can update idea status.");
  }
  if (!nextStatus || nextStatus === "submitted") {
    return failure("Select a review status.");
  }
  if (["accepted", "rejected"].includes(nextStatus) && reviewComment.length < 4) {
    return failure("Add an evaluator comment before accepting or rejecting.");
  }

  let found = false;
  const ideas = state.ideas.map((idea) => {
    if (idea.id !== ideaId) {
      return idea;
    }
    found = true;
    return {
      ...idea,
      status: nextStatus,
      updatedAt: reviewedAt,
      history: [
        ...(idea.history || []),
        {
          status: nextStatus,
          comment: reviewComment || STATUS_META[nextStatus].label,
          actorId: evaluator.id,
          at: reviewedAt
        }
      ]
    };
  });

  if (!found) {
    return failure("Idea was not found.");
  }

  return success({ state: { ...state, ideas } });
}

export function getVisibleIdeas(state, user) {
  if (!user) {
    return [];
  }
  const visibleIdeas =
    user.role === ROLES.ADMIN
      ? state.ideas
      : state.ideas.filter((idea) => idea.authorId === user.id);

  return [...visibleIdeas].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getPortalMetrics(state, user) {
  const visibleIdeas = getVisibleIdeas(state, user);
  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));
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
