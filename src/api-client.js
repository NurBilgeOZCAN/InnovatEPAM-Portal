// Thin HTTP client. All fetch calls go through here.
// Cookies (session) are sent automatically by the browser.

async function request(method, path, body) {
  const options = {
    method,
    credentials: "same-origin",
  };
  if (body !== undefined) {
    options.headers = { "content-type": "application/json" };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data });
  }
  return data;
}

export const api = {
  register: (name, email, password, role) =>
    request("POST", "/api/auth/register", { name, email, password, role }),

  login: (email, password) =>
    request("POST", "/api/auth/login", { email, password }),

  logout: () =>
    request("POST", "/api/auth/logout"),

  session: () =>
    request("GET", "/api/session"),

  categories: () =>
    request("GET", "/api/categories"),

  listIdeas: () =>
    request("GET", "/api/ideas"),

  submitIdea: (title, description, category, extra_fields, attachments, blind_review) =>
    request("POST", "/api/ideas", { title, description, category, extra_fields, attachments, blind_review }),

  updateStatus: (ideaId, status, comment) =>
    request("PATCH", `/api/ideas/${encodeURIComponent(ideaId)}/status`, { status, comment }),

  resetDemo: () =>
    request("POST", "/api/demo/reset"),

  // Draft management (Phase 4)
  listDrafts: () =>
    request("GET", "/api/drafts"),

  getDraft: (id) =>
    request("GET", `/api/drafts/${encodeURIComponent(id)}`),

  createDraft: (title, description, category, extra_fields, attachments) =>
    request("POST", "/api/drafts", { title, description, category, extra_fields, attachments }),

  updateDraft: (id, title, description, category, extra_fields, attachments) =>
    request("PATCH", `/api/drafts/${encodeURIComponent(id)}`, { title, description, category, extra_fields, attachments }),

  deleteDraft: (id) =>
    request("DELETE", `/api/drafts/${encodeURIComponent(id)}`),

  submitDraft: (id) =>
    request("POST", `/api/drafts/${encodeURIComponent(id)}/submit`),

  // Phase 5: multi-stage review
  stages: () =>
    request("GET", "/api/stages"),

  stageAction: (ideaId, action, comment) =>
    request("POST", `/api/ideas/${encodeURIComponent(ideaId)}/stage-action`, { action, comment }),

  submitRevision: (ideaId, title, description, category, extra_fields, attachments) =>
    request("PATCH", `/api/ideas/${encodeURIComponent(ideaId)}`, { title, description, category, extra_fields, attachments }),

  // Phase 6: blind review
  setBlindReview: (ideaId, enabled) =>
    request("POST", `/api/ideas/${encodeURIComponent(ideaId)}/blind-review`, { enabled }),

  // Phase 7: scoring
  scoreDimensions: () =>
    request("GET", "/api/score-dimensions"),

  postScores: (ideaId, stage, scores, comment) =>
    request("POST", `/api/ideas/${encodeURIComponent(ideaId)}/scores`, { stage, scores, comment }),

  getScores: (ideaId) =>
    request("GET", `/api/ideas/${encodeURIComponent(ideaId)}/scores`),

  // Revert (Phase 5 polish)
  revertIdea: (ideaId, comment) =>
    request("POST", `/api/ideas/${encodeURIComponent(ideaId)}/revert`, { comment }),
};
