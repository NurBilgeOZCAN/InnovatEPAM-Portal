import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { openDb, seedIfEmpty, dropAndReseed } from "../src/server/db.js";
import { makeRepository } from "../src/server/repository.js";
import { makeApiHandler } from "../src/server/api.js";

// Open in-memory DB for each test group
function makeTestEnv() {
  const db = openDb(":memory:");
  seedIfEmpty(db);
  const repo = makeRepository(db);
  const handler = makeApiHandler(repo, () => dropAndReseed(db));
  return { db, repo, handler };
}

// Minimal HTTP-over-memory request helper
function fakeRequest(method, path, body, cookieHeader = "") {
  const bodyStr = body ? JSON.stringify(body) : "";
  const req = Object.assign(new Readable({ read() {} }), {
    method,
    url: path,
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {})
    }
  });
  if (bodyStr) req.push(bodyStr);
  req.push(null);
  return req;
}

function fakeResponse() {
  const res = {
    statusCode: null,
    headers: {},
    body: "",
    writeHead(code, hdrs) { this.statusCode = code; Object.assign(this.headers, hdrs || {}); },
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(data) { this.body = data || ""; },
    json() { return JSON.parse(this.body || "{}"); }
  };
  return res;
}

test("register + login round-trip", async () => {
  const { handler } = makeTestEnv();
  const req = fakeRequest("POST", "/api/auth/register", {
    name: "Test User", email: "test@example.com", password: "Test1234", role: "submitter"
  });
  const res = fakeResponse();
  await handler(req, res, "/api/auth/register");
  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.user.email, "test@example.com");
  assert.equal("passwordHash" in body.user, false);
  assert.ok(body.sessionToken);

  // Login
  const req2 = fakeRequest("POST", "/api/auth/login", { email: "test@example.com", password: "Test1234" });
  const res2 = fakeResponse();
  await handler(req2, res2, "/api/auth/login");
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.json().user.email, "test@example.com");
});

test("duplicate email rejected", async () => {
  const { handler } = makeTestEnv();
  const body = { name: "Dup User", email: "dup@example.com", password: "Test1234", role: "submitter" };
  const req1 = fakeRequest("POST", "/api/auth/register", body);
  await handler(req1, fakeResponse(), "/api/auth/register");

  const req2 = fakeRequest("POST", "/api/auth/register", body);
  const res2 = fakeResponse();
  await handler(req2, res2, "/api/auth/register");
  assert.equal(res2.statusCode, 409);
  assert.match(res2.json().error, /already exists/i);
});

test("submitter can create an idea", async () => {
  const { handler } = makeTestEnv();

  // Login as submitter
  const loginReq = fakeRequest("POST", "/api/auth/login", { email: "aylin@epam.local", password: "Submit123!" });
  const loginRes = fakeResponse();
  await handler(loginReq, loginRes, "/api/auth/login");
  const token = loginRes.json().sessionToken;

  // Submit idea
  const ideaReq = fakeRequest("POST", "/api/ideas", {
    title: "My test idea here",
    description: "This is a description that is long enough to pass validation.",
    category: "Developer Productivity"
  }, `session=${token}`);
  const ideaRes = fakeResponse();
  await handler(ideaReq, ideaRes, "/api/ideas");
  assert.equal(ideaRes.statusCode, 201);
  assert.equal(ideaRes.json().idea.status, "submitted");
});

test("admin can change status with comment; submitter cannot", async () => {
  const { handler } = makeTestEnv();

  // Login as submitter, try to change status
  const subLogin = fakeRequest("POST", "/api/auth/login", { email: "aylin@epam.local", password: "Submit123!" });
  const subLoginRes = fakeResponse();
  await handler(subLogin, subLoginRes, "/api/auth/login");
  const subToken = subLoginRes.json().sessionToken;

  const patchReq = fakeRequest("PATCH", "/api/ideas/idea-ai-triage/status",
    { status: "accepted", comment: "Looks good." }, `session=${subToken}`);
  const patchRes = fakeResponse();
  await handler(patchReq, patchRes, "/api/ideas/idea-ai-triage/status");
  assert.equal(patchRes.statusCode, 403);

  // Login as admin, change status
  const adminLogin = fakeRequest("POST", "/api/auth/login", { email: "admin@innovatepam.local", password: "Admin123!" });
  const adminLoginRes = fakeResponse();
  await handler(adminLogin, adminLoginRes, "/api/auth/login");
  const adminToken = adminLoginRes.json().sessionToken;

  const acceptReq = fakeRequest("PATCH", "/api/ideas/idea-ai-triage/status",
    { status: "accepted", comment: "Clear business value." }, `session=${adminToken}`);
  const acceptRes = fakeResponse();
  await handler(acceptReq, acceptRes, "/api/ideas/idea-ai-triage/status");
  assert.equal(acceptRes.statusCode, 200);
  assert.equal(acceptRes.json().idea.status, "accepted");
});

test("role-aware listing: submitter sees only own ideas", async () => {
  const { handler } = makeTestEnv();

  // Login as submitter
  const subLogin = fakeRequest("POST", "/api/auth/login", { email: "aylin@epam.local", password: "Submit123!" });
  const subLoginRes = fakeResponse();
  await handler(subLogin, subLoginRes, "/api/auth/login");
  const subToken = subLoginRes.json().sessionToken;

  const listReq = fakeRequest("GET", "/api/ideas", undefined, `session=${subToken}`);
  const listRes = fakeResponse();
  await handler(listReq, listRes, "/api/ideas");
  assert.equal(listRes.statusCode, 200);
  const ideas = listRes.json().ideas;
  assert.ok(ideas.every((i) => i.authorId === "user-aylin"), "Submitter should only see own ideas");

  // Admin sees all
  const adminLogin = fakeRequest("POST", "/api/auth/login", { email: "admin@innovatepam.local", password: "Admin123!" });
  const adminLoginRes = fakeResponse();
  await handler(adminLogin, adminLoginRes, "/api/auth/login");
  const adminToken = adminLoginRes.json().sessionToken;

  const adminListReq = fakeRequest("GET", "/api/ideas", undefined, `session=${adminToken}`);
  const adminListRes = fakeResponse();
  await handler(adminListReq, adminListRes, "/api/ideas");
  assert.ok(adminListRes.json().ideas.length >= 1);
});

// ── Phase 2: Smart Submission Forms ──────────────────────────────────

test("Phase2: idea list includes authorName", async () => {
  const { handler } = makeTestEnv();
  const adminLogin = fakeRequest("POST", "/api/auth/login", { email: "admin@innovatepam.local", password: "Admin123!" });
  const adminLoginRes = fakeResponse();
  await handler(adminLogin, adminLoginRes, "/api/auth/login");
  const adminToken = adminLoginRes.json().sessionToken;

  const listReq = fakeRequest("GET", "/api/ideas", undefined, `session=${adminToken}`);
  const listRes = fakeResponse();
  await handler(listReq, listRes, "/api/ideas");
  assert.equal(listRes.statusCode, 200);
  const ideas = listRes.json().ideas;
  assert.ok(ideas.length > 0);
  assert.ok(ideas.every((i) => typeof i.authorName === "string" && i.authorName.length > 0),
    "Every idea should have authorName");
});

test("Phase2: valid category-specific extra fields accepted and persisted", async () => {
  const { handler } = makeTestEnv();
  const loginRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/auth/login", { email: "aylin@epam.local", password: "Submit123!" }), loginRes, "/api/auth/login");
  const token = loginRes.json().sessionToken;

  const ideaRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "GPT-powered email sorter",
    description: "Automatically classify and sort incoming support emails using GPT-4o to reduce triage time.",
    category: "AI and Automation",
    extra_fields: { model_or_tool: "GPT-4o", automation_target: "Email triage" }
  }, `session=${token}`), ideaRes, "/api/ideas");

  assert.equal(ideaRes.statusCode, 201);
  const idea = ideaRes.json().idea;
  assert.ok(idea.extra_fields, "extra_fields should be present");
  assert.equal(idea.extra_fields.model_or_tool, "GPT-4o");
  assert.equal(idea.extra_fields.automation_target, "Email triage");
});

test("Phase2: unknown extra field key rejected", async () => {
  const { handler } = makeTestEnv();
  const loginRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/auth/login", { email: "aylin@epam.local", password: "Submit123!" }), loginRes, "/api/auth/login");
  const token = loginRes.json().sessionToken;

  const ideaRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Bad extra field test",
    description: "This idea has an unknown extra field key that should be rejected by the server.",
    category: "AI and Automation",
    extra_fields: { model_or_tool: "GPT-4o", unknown_key: "bad value" }
  }, `session=${token}`), ideaRes, "/api/ideas");

  assert.equal(ideaRes.statusCode, 400);
  assert.match(ideaRes.json().error, /unknown extra field/i);
});

test("Phase2: required extra field enforced when extra_fields block provided", async () => {
  const { handler } = makeTestEnv();
  const loginRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/auth/login", { email: "aylin@epam.local", password: "Submit123!" }), loginRes, "/api/auth/login");
  const token = loginRes.json().sessionToken;

  // Provide extra_fields but omit the required field (model_or_tool)
  const ideaRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Missing required extra field",
    description: "This idea omits the required model_or_tool field for AI and Automation category.",
    category: "AI and Automation",
    extra_fields: { automation_target: "Some target" }
  }, `session=${token}`), ideaRes, "/api/ideas");

  assert.equal(ideaRes.statusCode, 400);
  assert.match(ideaRes.json().error, /required/i);
});

test("Phase2: GET /api/categories returns category list and field definitions", async () => {
  const { handler } = makeTestEnv();
  const res = fakeResponse();
  await handler(fakeRequest("GET", "/api/categories"), res, "/api/categories");
  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.ok(Array.isArray(data.categories));
  assert.ok(data.categories.includes("AI and Automation"));
  assert.ok(data.fields["AI and Automation"]);
  assert.ok(Array.isArray(data.fields["AI and Automation"]));
  assert.ok(data.fields["AI and Automation"].some((f) => f.key === "model_or_tool"));
});

// ── Phase 3: Multi-Media Support ─────────────────────────────────────

// Helper: build a tiny base64 PNG dataUrl (1x1 pixel)
const TINY_PNG_DATAURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
// ~68 bytes decoded

test("Phase3: idea with 2 attachments — list returns both, blob served at /api/attachments/:id", async () => {
  const { handler } = makeTestEnv();
  const loginRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/auth/login", { email: "aylin@epam.local", password: "Submit123!" }), loginRes, "/api/auth/login");
  const token = loginRes.json().sessionToken;

  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Idea with two attachments",
    description: "Testing multi-attachment support with a PNG and a text file for the Phase 3 feature set.",
    category: "Developer Productivity",
    attachments: [
      { name: "image.png",  type: "image/png",  size: 68, dataUrl: TINY_PNG_DATAURL },
      { name: "notes.txt",  type: "text/plain", size: 13, dataUrl: "data:text/plain;base64,SGVsbG8gV29ybGQh" }
    ]
  }, `session=${token}`), createRes, "/api/ideas");

  assert.equal(createRes.statusCode, 201);
  const idea = createRes.json().idea;
  assert.equal(idea.attachments.length, 2, "Should have 2 attachments");
  assert.equal(idea.attachments[0].name, "image.png");
  assert.equal(idea.attachments[1].name, "notes.txt");

  // Verify list endpoint also returns 2 attachments
  const listRes = fakeResponse();
  await handler(fakeRequest("GET", "/api/ideas", undefined, `session=${token}`), listRes, "/api/ideas");
  const listedIdea = listRes.json().ideas.find((i) => i.id === idea.id);
  assert.ok(listedIdea, "Idea should appear in list");
  assert.equal(listedIdea.attachments.length, 2);

  // Fetch blob for first attachment
  const attId = idea.attachments[0].id;
  assert.ok(attId, "Attachment should have an id");
  const blobRes = fakeResponse();
  await handler(fakeRequest("GET", `/api/attachments/${attId}`, undefined, `session=${token}`), blobRes, `/api/attachments/${attId}`);
  assert.equal(blobRes.statusCode, 200, "Blob fetch should succeed");
  assert.ok(blobRes.headers["content-type"]?.includes("image/png"), "Content-type should be image/png");
});

test("Phase3: posting 6 attachments rejected", async () => {
  const { handler } = makeTestEnv();
  const loginRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/auth/login", { email: "aylin@epam.local", password: "Submit123!" }), loginRes, "/api/auth/login");
  const token = loginRes.json().sessionToken;

  const attachments = Array.from({ length: 6 }, (_, i) => ({
    name: `file${i}.txt`, type: "text/plain", size: 10,
    dataUrl: "data:text/plain;base64,SGVsbG8="
  }));

  const ideaRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Too many attachments test",
    description: "This idea exceeds the maximum number of allowed attachments per submission.",
    category: "Process Improvement",
    attachments
  }, `session=${token}`), ideaRes, "/api/ideas");

  assert.equal(ideaRes.statusCode, 400);
  assert.match(ideaRes.json().error, /maximum.*5/i);
});

// ── Phase 4: Draft Management ─────────────────────────────────────────

// Helper: login and return token
async function loginAs(handler, email, password) {
  const res = fakeResponse();
  await handler(fakeRequest("POST", "/api/auth/login", { email, password }), res, "/api/auth/login");
  return res.json().sessionToken;
}

test("Phase4: submitter can create draft with partial data (no description)", async () => {
  const { handler } = makeTestEnv();
  const token = await loginAs(handler, "aylin@epam.local", "Submit123!");

  const res = fakeResponse();
  await handler(fakeRequest("POST", "/api/drafts", { title: "Draft idea", category: "Sustainability" }, `session=${token}`), res, "/api/drafts");
  assert.equal(res.statusCode, 201);
  const draft = res.json().draft;
  assert.equal(draft.status, "draft");
  assert.equal(draft.title, "Draft idea");
  assert.equal(draft.category, "Sustainability");
});

test("Phase4: GET /api/drafts returns user drafts", async () => {
  const { handler } = makeTestEnv();
  const token = await loginAs(handler, "aylin@epam.local", "Submit123!");

  await handler(fakeRequest("POST", "/api/drafts", { title: "Draft A", category: "Sustainability" }, `session=${token}`), fakeResponse(), "/api/drafts");
  await handler(fakeRequest("POST", "/api/drafts", { title: "Draft B", category: "Process Improvement" }, `session=${token}`), fakeResponse(), "/api/drafts");

  const listRes = fakeResponse();
  await handler(fakeRequest("GET", "/api/drafts", undefined, `session=${token}`), listRes, "/api/drafts");
  assert.equal(listRes.statusCode, 200);
  const drafts = listRes.json().drafts;
  assert.equal(drafts.length, 2);
  assert.ok(drafts.every((d) => d.status === "draft"));
});

test("Phase4: admin GET /api/ideas does not see drafts", async () => {
  const { handler } = makeTestEnv();
  const subToken = await loginAs(handler, "aylin@epam.local", "Submit123!");
  const adminToken = await loginAs(handler, "admin@innovatepam.local", "Admin123!");

  await handler(fakeRequest("POST", "/api/drafts", { title: "Hidden draft", category: "Sustainability" }, `session=${subToken}`), fakeResponse(), "/api/drafts");

  const adminListRes = fakeResponse();
  await handler(fakeRequest("GET", "/api/ideas", undefined, `session=${adminToken}`), adminListRes, "/api/ideas");
  const ideas = adminListRes.json().ideas;
  assert.ok(!ideas.some((i) => i.status === "draft"), "Admin should not see drafts in /api/ideas");
});

test("Phase4: updating a draft replaces fields and attachments", async () => {
  const { handler, db } = makeTestEnv();
  const token = await loginAs(handler, "aylin@epam.local", "Submit123!");

  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/drafts", {
    title: "Original title",
    category: "Sustainability",
    attachments: [{ name: "old.txt", type: "text/plain", size: 5, dataUrl: "data:text/plain;base64,aGVsbG8=" }]
  }, `session=${token}`), createRes, "/api/drafts");
  const draftId = createRes.json().draft.id;

  // Update: change title, send new attachments list (empty = remove old)
  const patchRes = fakeResponse();
  await handler(fakeRequest("PATCH", `/api/drafts/${draftId}`, {
    title: "Updated title",
    category: "Workplace Experience",
    attachments: []
  }, `session=${token}`), patchRes, `/api/drafts/${draftId}`);
  assert.equal(patchRes.statusCode, 200);
  const updated = patchRes.json().draft;
  assert.equal(updated.title, "Updated title");
  assert.equal(updated.category, "Workplace Experience");
  assert.equal(updated.attachments.length, 0, "Attachments should be cleared");

  // Verify DB directly
  const attCount = db.prepare("SELECT COUNT(*) AS n FROM attachments WHERE idea_id = ?").get(draftId).n;
  assert.equal(attCount, 0, "DB attachments should be deleted");
});

test("Phase4: deleting a draft cascades attachments", async () => {
  const { handler, db } = makeTestEnv();
  const token = await loginAs(handler, "aylin@epam.local", "Submit123!");

  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/drafts", {
    title: "To be deleted",
    category: "Sustainability",
    attachments: [{ name: "bye.txt", type: "text/plain", size: 3, dataUrl: "data:text/plain;base64,Ynll" }]
  }, `session=${token}`), createRes, "/api/drafts");
  const draftId = createRes.json().draft.id;

  const attBefore = db.prepare("SELECT COUNT(*) AS n FROM attachments WHERE idea_id = ?").get(draftId).n;
  assert.equal(attBefore, 1);

  const delRes = fakeResponse();
  await handler(fakeRequest("DELETE", `/api/drafts/${draftId}`, undefined, `session=${token}`), delRes, `/api/drafts/${draftId}`);
  assert.equal(delRes.statusCode, 200);

  // Draft should be gone
  const draftRow = db.prepare("SELECT * FROM ideas WHERE id = ?").get(draftId);
  assert.ok(!draftRow, "Draft should be deleted");

  // Attachments should cascade (foreign key ON DELETE CASCADE)
  const attAfter = db.prepare("SELECT COUNT(*) AS n FROM attachments WHERE idea_id = ?").get(draftId).n;
  assert.equal(attAfter, 0, "Attachments should be deleted");
});

test("Phase4: promoting a valid draft creates submitted idea with history", async () => {
  const { handler } = makeTestEnv();
  const token = await loginAs(handler, "aylin@epam.local", "Submit123!");

  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/drafts", {
    title: "Valid draft to promote",
    description: "This description is long enough to pass validation for submission purposes.",
    category: "Sustainability",
    extra_fields: { sustainability_metric: "CO2" }
  }, `session=${token}`), createRes, "/api/drafts");
  const draftId = createRes.json().draft.id;

  const submitRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/drafts/${draftId}/submit`, undefined, `session=${token}`), submitRes, `/api/drafts/${draftId}/submit`);
  assert.equal(submitRes.statusCode, 200);
  const idea = submitRes.json().idea;
  assert.equal(idea.status, "submitted");
  assert.ok(idea.history?.length > 0, "Should have history entries");
  assert.ok(idea.history.some((h) => h.status === "submitted"), "History should include submitted entry");
});

test("Phase4: promoting invalid draft returns 400 and leaves draft intact", async () => {
  const { handler } = makeTestEnv();
  const token = await loginAs(handler, "aylin@epam.local", "Submit123!");

  // Title only 4 chars — will fail full validation
  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/drafts", { title: "Hi!!", category: "Sustainability" }, `session=${token}`), createRes, "/api/drafts");
  assert.equal(createRes.statusCode, 201, "Draft with short title should be created");
  const draftId = createRes.json().draft.id;

  const submitRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/drafts/${draftId}/submit`, undefined, `session=${token}`), submitRes, `/api/drafts/${draftId}/submit`);
  assert.equal(submitRes.statusCode, 400);
  assert.match(submitRes.json().error, /title/i);

  // Draft still exists
  const getRes = fakeResponse();
  await handler(fakeRequest("GET", `/api/drafts/${draftId}`, undefined, `session=${token}`), getRes, `/api/drafts/${draftId}`);
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.json().draft.status, "draft");
});

test("Phase4: submitter cannot edit/delete/promote another user's draft (403)", async () => {
  const { handler } = makeTestEnv();
  // Register a second submitter
  const regRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/auth/register", { name: "Other User", email: "other@example.com", password: "Other1234", role: "submitter" }), regRes, "/api/auth/register");
  const otherToken = regRes.json().sessionToken;

  const aylToken = await loginAs(handler, "aylin@epam.local", "Submit123!");

  // Aylin creates a draft
  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/drafts", { title: "Aylin draft", category: "Sustainability" }, `session=${aylToken}`), createRes, "/api/drafts");
  const draftId = createRes.json().draft.id;

  // Other user tries PATCH
  const patchRes = fakeResponse();
  await handler(fakeRequest("PATCH", `/api/drafts/${draftId}`, { title: "Stolen" }, `session=${otherToken}`), patchRes, `/api/drafts/${draftId}`);
  assert.equal(patchRes.statusCode, 403);

  // Other user tries DELETE
  const delRes = fakeResponse();
  await handler(fakeRequest("DELETE", `/api/drafts/${draftId}`, undefined, `session=${otherToken}`), delRes, `/api/drafts/${draftId}`);
  assert.equal(delRes.statusCode, 403);

  // Other user tries submit
  const submitRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/drafts/${draftId}/submit`, undefined, `session=${otherToken}`), submitRes, `/api/drafts/${draftId}/submit`);
  assert.equal(submitRes.statusCode, 403);
});

test("Phase3: oversized attachment payload rejected (> 8 MB)", async () => {
  const { handler } = makeTestEnv();
  const loginRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/auth/login", { email: "aylin@epam.local", password: "Submit123!" }), loginRes, "/api/auth/login");
  const token = loginRes.json().sessionToken;

  // Claim size of 9 MB total (server uses reported size)
  const attachments = [
    { name: "huge.bin", type: "application/octet-stream", size: 9 * 1024 * 1024, dataUrl: "data:application/octet-stream;base64,AA==" }
  ];

  const ideaRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Oversized payload test",
    description: "This idea has a single attachment that claims to be larger than the 8 MB limit.",
    category: "Process Improvement",
    attachments
  }, `session=${token}`), ideaRes, "/api/ideas");

  assert.equal(ideaRes.statusCode, 400);
  assert.match(ideaRes.json().error, /8 MB/i);
});

// ── Phase 5: Multi-Stage Review ───────────────────────────────

// Helper: post a new idea as submitter and return { ideaId, subToken, adminToken }
async function setupIdeaForReview(handler) {
  const subToken = await loginAs(handler, "aylin@epam.local", "Submit123!");
  const adminToken = await loginAs(handler, "admin@innovatepam.local", "Admin123!");
  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Stage review test idea",
    description: "This idea is used to test the multi-stage review pipeline in Phase 5 of the project.",
    category: "Developer Productivity"
  }, `session=${subToken}`), createRes, "/api/ideas");
  assert.equal(createRes.statusCode, 201);
  const ideaId = createRes.json().idea.id;
  return { ideaId, subToken, adminToken };
}

test("Phase5: new idea has current_stage=null and revision_requested=0", async () => {
  const { handler } = makeTestEnv();
  const subToken = await loginAs(handler, "aylin@epam.local", "Submit123!");
  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Fresh submitted idea",
    description: "Long enough description to pass validation checks for submission.",
    category: "Sustainability",
    extra_fields: { sustainability_metric: "CO2" }
  }, `session=${subToken}`), createRes, "/api/ideas");
  assert.equal(createRes.statusCode, 201);
  const idea = createRes.json().idea;
  assert.equal(idea.current_stage, null, "current_stage should be null on submission");
  assert.equal(idea.revision_requested, 0);
  assert.equal(idea.status, "submitted");
});

test("Phase5: GET /api/stages returns 4 stages", async () => {
  const { handler } = makeTestEnv();
  const res = fakeResponse();
  await handler(fakeRequest("GET", "/api/stages"), res, "/api/stages");
  assert.equal(res.statusCode, 200);
  const { stages } = res.json();
  assert.equal(stages.length, 4);
  assert.equal(stages[0].id, "initial-screening");
  assert.equal(stages[3].id, "final-selection");
});

test("Phase5: first approve advances to stage 2 (technical-review)", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  const actionRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve" }, `session=${adminToken}`), actionRes, `/api/ideas/${ideaId}/stage-action`);
  assert.equal(actionRes.statusCode, 200);
  const idea = actionRes.json().idea;
  assert.equal(idea.current_stage, "technical-review", "After first approve should be at technical-review");
  assert.equal(idea.status, "under-review");
});

test("Phase5: four approves → accepted with current_stage=null", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  // Approve through stages 1-3 (no comment needed)
  for (let i = 0; i < 3; i++) {
    const r = fakeResponse();
    await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
      { action: "approve" }, `session=${adminToken}`), r, `/api/ideas/${ideaId}/stage-action`);
    assert.equal(r.statusCode, 200);
  }
  // Final stage approve requires comment
  const finalRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve", comment: "Excellent business case." }, `session=${adminToken}`), finalRes, `/api/ideas/${ideaId}/stage-action`);
  assert.equal(finalRes.statusCode, 200);
  const idea = finalRes.json().idea;
  assert.equal(idea.status, "accepted");
  assert.equal(idea.current_stage, null, "Terminal idea has null current_stage");
});

test("Phase5: reject at stage 2 → status=rejected, history records stage", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  // Advance to technical-review (stage 2)
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve" }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  const rejectRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "reject", comment: "Not technically feasible." }, `session=${adminToken}`), rejectRes, `/api/ideas/${ideaId}/stage-action`);
  assert.equal(rejectRes.statusCode, 200);
  const idea = rejectRes.json().idea;
  assert.equal(idea.status, "rejected");
  assert.equal(idea.current_stage, null);
  // History should have a rejected entry with stage=technical-review
  const rejectEntry = idea.history.find((h) => h.status === "rejected");
  assert.ok(rejectEntry, "History should have a rejected entry");
  assert.equal(rejectEntry.stage, "technical-review");
});

test("Phase5: final-stage approve without comment returns 400", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  // Advance through all 3 intermediate stages
  for (let i = 0; i < 3; i++) {
    await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
      { action: "approve" }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);
  }
  // Try to approve final stage without comment
  const noCommentRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve" }, `session=${adminToken}`), noCommentRes, `/api/ideas/${ideaId}/stage-action`);
  assert.equal(noCommentRes.statusCode, 400);
  assert.match(noCommentRes.json().error, /comment.*required|required.*comment/i);
});

test("Phase5: request-revision at stage 3 → submitter sees revision_requested=1, revision_from_stage=business-impact", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, subToken, adminToken } = await setupIdeaForReview(handler);

  // Advance to business-impact (stage 3)
  for (let i = 0; i < 2; i++) {
    await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
      { action: "approve" }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);
  }

  const revRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "request-revision", comment: "Please add ROI estimates." }, `session=${adminToken}`), revRes, `/api/ideas/${ideaId}/stage-action`);
  assert.equal(revRes.statusCode, 200);
  const idea = revRes.json().idea;
  assert.equal(idea.status, "submitted");
  assert.equal(idea.revision_requested, 1);
  assert.equal(idea.revision_from_stage, "business-impact");
  assert.equal(idea.current_stage, null);
});

test("Phase5: submitter PATCH resubmits revision, returns to revision_from_stage", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, subToken, adminToken } = await setupIdeaForReview(handler);

  // Advance to stage 2, then request revision
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve" }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "request-revision", comment: "Needs more detail." }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  // Submitter edits title
  const patchRes = fakeResponse();
  await handler(fakeRequest("PATCH", `/api/ideas/${ideaId}`,
    {
      title: "Stage review test idea revised",
      description: "This idea is used to test the multi-stage review pipeline in Phase 5 of the project.",
      category: "Developer Productivity"
    }, `session=${subToken}`), patchRes, `/api/ideas/${ideaId}`);
  assert.equal(patchRes.statusCode, 200);
  const idea = patchRes.json().idea;
  assert.equal(idea.title, "Stage review test idea revised");
  assert.equal(idea.status, "under-review");
  assert.equal(idea.current_stage, "technical-review");
  assert.equal(idea.revision_requested, 0);
});

test("Phase5: submitter cannot PATCH another user's revision", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  // Request revision first
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "request-revision", comment: "Fix something." }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  // Register a different submitter and try to PATCH
  const reg = fakeResponse();
  await handler(fakeRequest("POST", "/api/auth/register", { name: "Other User", email: "other2@example.com", password: "Other1234", role: "submitter" }), reg, "/api/auth/register");
  const otherToken = reg.json().sessionToken;

  const patchRes = fakeResponse();
  await handler(fakeRequest("PATCH", `/api/ideas/${ideaId}`,
    { title: "Stolen", description: "This is stolen content trying to override another user idea.", category: "Developer Productivity" },
    `session=${otherToken}`), patchRes, `/api/ideas/${ideaId}`);
  assert.equal(patchRes.statusCode, 403);
});

test("Phase5: admin cannot PATCH idea content", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  // Request revision first so the idea is in revision state
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "request-revision", comment: "Fix something." }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  const patchRes = fakeResponse();
  await handler(fakeRequest("PATCH", `/api/ideas/${ideaId}`,
    { title: "Admin override", description: "Admin trying to override content of idea.", category: "Developer Productivity" },
    `session=${adminToken}`), patchRes, `/api/ideas/${ideaId}`);
  assert.equal(patchRes.statusCode, 403);
  assert.match(patchRes.json().error, /admin/i);
});

test("Phase5: submitter cannot PATCH when revision_requested=0", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, subToken } = await setupIdeaForReview(handler);

  // No revision requested — idea is just submitted
  const patchRes = fakeResponse();
  await handler(fakeRequest("PATCH", `/api/ideas/${ideaId}`,
    { title: "Unauthorized edit", description: "Trying to edit without revision request being set.", category: "Developer Productivity" },
    `session=${subToken}`), patchRes, `/api/ideas/${ideaId}`);
  assert.equal(patchRes.statusCode, 403);
  assert.match(patchRes.json().error, /awaiting revision/i);
});

test("Phase5: non-admin cannot perform stage-action", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, subToken } = await setupIdeaForReview(handler);

  const res = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve" }, `session=${subToken}`), res, `/api/ideas/${ideaId}/stage-action`);
  assert.equal(res.statusCode, 403);
});

// ── Phase 6: Blind Review ──────────────────────────────────────

test("Phase6: submitting with blind_review=true — admin sees anonymized name, submitter sees own real name", async () => {
  const { handler } = makeTestEnv();
  const subToken   = await loginAs(handler, "aylin@epam.local", "Submit123!");
  const adminToken = await loginAs(handler, "admin@innovatepam.local", "Admin123!");

  // Submit with blind_review=true
  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Blind idea test submission",
    description: "This idea is submitted with blind review enabled to test anonymization.",
    category: "Developer Productivity",
    blind_review: true
  }, `session=${subToken}`), createRes, "/api/ideas");
  assert.equal(createRes.statusCode, 201);
  const created = createRes.json().idea;
  assert.equal(created.blind_review, 1, "blind_review flag should be 1");

  // Admin list — should see anonymized name
  const adminListRes = fakeResponse();
  await handler(fakeRequest("GET", "/api/ideas", undefined, `session=${adminToken}`), adminListRes, "/api/ideas");
  const adminIdea = adminListRes.json().ideas.find((i) => i.id === created.id);
  assert.ok(adminIdea, "Idea should appear in admin list");
  assert.match(adminIdea.authorName, /^Submitter #[0-9A-F]{4}$/, "Admin should see anonymized handle");
  assert.equal(adminIdea.authorEmail, null, "Admin should not see author email during blind review");

  // Submitter list — should see own real name
  const subListRes = fakeResponse();
  await handler(fakeRequest("GET", "/api/ideas", undefined, `session=${subToken}`), subListRes, "/api/ideas");
  const subIdea = subListRes.json().ideas.find((i) => i.id === created.id);
  assert.ok(subIdea, "Idea should appear in submitter list");
  assert.equal(subIdea.authorName, "Aylin Submitter", "Submitter should see own real name");
});

test("Phase6: after final accept, admin sees real author name", async () => {
  const { handler } = makeTestEnv();
  const subToken   = await loginAs(handler, "aylin@epam.local", "Submit123!");
  const adminToken = await loginAs(handler, "admin@innovatepam.local", "Admin123!");

  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Blind reveal after accept",
    description: "This idea tests that blind review reveals author after final accept decision.",
    category: "Developer Productivity",
    blind_review: true
  }, `session=${subToken}`), createRes, "/api/ideas");
  const ideaId = createRes.json().idea.id;

  // Approve through all 4 stages
  for (let i = 0; i < 3; i++) {
    await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
      { action: "approve" }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);
  }
  const finalRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve", comment: "Excellent work on this blind idea." }, `session=${adminToken}`), finalRes, `/api/ideas/${ideaId}/stage-action`);
  assert.equal(finalRes.statusCode, 200);
  const idea = finalRes.json().idea;
  assert.equal(idea.status, "accepted");
  // After accept, real name should reveal to admin
  assert.equal(idea.authorName, "Aylin Submitter", "Author name should reveal after terminal status");
});

test("Phase6: toggling blind_review after a stage action returns 409", async () => {
  const { handler } = makeTestEnv();
  const subToken   = await loginAs(handler, "aylin@epam.local", "Submit123!");
  const adminToken = await loginAs(handler, "admin@innovatepam.local", "Admin123!");

  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Lock blind review test idea",
    description: "This idea tests the lock on blind review toggle after stage action taken.",
    category: "Developer Productivity",
    blind_review: true
  }, `session=${subToken}`), createRes, "/api/ideas");
  const ideaId = createRes.json().idea.id;

  // Take a stage action
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve" }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  // Try to toggle blind_review — should get 409
  const toggleRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/blind-review`,
    { enabled: false }, `session=${adminToken}`), toggleRes, `/api/ideas/${ideaId}/blind-review`);
  assert.equal(toggleRes.statusCode, 409);
  assert.match(toggleRes.json().error, /cannot be changed/i);
});

test("Phase6: blind_review pill (flag) present in response payload", async () => {
  const { handler } = makeTestEnv();
  const subToken = await loginAs(handler, "aylin@epam.local", "Submit123!");

  const res = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Blind flag check idea",
    description: "Testing that blind_review boolean appears in the idea response payload.",
    category: "Sustainability",
    extra_fields: { sustainability_metric: "CO2" },
    blind_review: true
  }, `session=${subToken}`), res, "/api/ideas");
  assert.equal(res.statusCode, 201);
  const idea = res.json().idea;
  assert.equal(idea.blind_review, 1, "blind_review should be 1 in payload");
});

test("Phase6: admin can toggle blind_review before any stage action", async () => {
  const { handler } = makeTestEnv();
  const subToken   = await loginAs(handler, "aylin@epam.local", "Submit123!");
  const adminToken = await loginAs(handler, "admin@innovatepam.local", "Admin123!");

  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Admin enables blind review",
    description: "Testing admin toggles blind review on an idea before any stage action.",
    category: "Developer Productivity"
  }, `session=${subToken}`), createRes, "/api/ideas");
  const ideaId = createRes.json().idea.id;
  assert.equal(createRes.json().idea.blind_review, 0, "Initially blind_review=0");

  // Admin enables blind review
  const toggleRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/blind-review`,
    { enabled: true }, `session=${adminToken}`), toggleRes, `/api/ideas/${ideaId}/blind-review`);
  assert.equal(toggleRes.statusCode, 200);
  assert.equal(toggleRes.json().idea.blind_review, 1);
});

// ── Phase 7: Scoring System ────────────────────────────────────

test("Phase7: GET /api/score-dimensions returns 4 dimensions", async () => {
  const { handler } = makeTestEnv();
  const res = fakeResponse();
  await handler(fakeRequest("GET", "/api/score-dimensions"), res, "/api/score-dimensions");
  assert.equal(res.statusCode, 200);
  const { dimensions } = res.json();
  assert.equal(dimensions.length, 4);
  assert.ok(dimensions.some((d) => d.id === "impact"));
  assert.ok(dimensions.some((d) => d.id === "effort" && d.invertedForComposite === true));
});

test("Phase7: admin posts scores and aggregate composite is computed correctly", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  // Post scores from first admin evaluator
  const scoreRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/scores`, {
    scores: { impact: 4, feasibility: 5, effort: 2, innovation: 4 }
  }, `session=${adminToken}`), scoreRes, `/api/ideas/${ideaId}/scores`);
  assert.equal(scoreRes.statusCode, 200);
  const { aggregate } = scoreRes.json();
  assert.ok(aggregate, "Aggregate should be present");
  assert.ok(typeof aggregate.composite === "number", "Composite should be a number");
  // impact(4) + feasibility(5) + innovation(4) + (6-effort=6-2=4) = 17 / 4 = 4.25 → rounds to 4.3
  assert.equal(aggregate.composite, 4.3);
  assert.equal(aggregate.evaluatorCount, 1);
});

test("Phase7: upsert replaces prior score value", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  // Post initial scores
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/scores`, {
    scores: { impact: 2, feasibility: 3, effort: 4, innovation: 3 }
  }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/scores`);

  // Post updated scores (upsert)
  const upsertRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/scores`, {
    scores: { impact: 5, feasibility: 5, effort: 1, innovation: 5 }
  }, `session=${adminToken}`), upsertRes, `/api/ideas/${ideaId}/scores`);
  assert.equal(upsertRes.statusCode, 200);
  const { aggregate } = upsertRes.json();
  // impact(5) + feasibility(5) + innovation(5) + (6-1=5) = 20 / 4 = 5.0
  assert.equal(aggregate.composite, 5.0);
});

test("Phase7: two evaluators — composite averaged across both", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  // Register a second admin
  const reg2 = fakeResponse();
  await handler(fakeRequest("POST", "/api/auth/register", { name: "Admin Two", email: "admin2@example.com", password: "Admin2345", role: "admin" }), reg2, "/api/auth/register");
  const admin2Token = reg2.json().sessionToken;

  // Admin 1: impact=4, feasibility=4, effort=2, innovation=4 → (4+4+4+4)/4 = 4.0
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/scores`, {
    scores: { impact: 4, feasibility: 4, effort: 2, innovation: 4 }
  }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/scores`);

  // Admin 2: impact=2, feasibility=2, effort=4, innovation=2 → (2+2+2+2)/4 = 2.0
  const finalRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/scores`, {
    scores: { impact: 2, feasibility: 2, effort: 4, innovation: 2 }
  }, `session=${admin2Token}`), finalRes, `/api/ideas/${ideaId}/scores`);
  const { aggregate } = finalRes.json();
  // composite = (4.0 + 2.0) / 2 = 3.0
  assert.equal(aggregate.composite, 3.0);
  assert.equal(aggregate.evaluatorCount, 2);
});

test("Phase7: submitter cannot POST scores (403)", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, subToken } = await setupIdeaForReview(handler);

  const res = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/scores`, {
    scores: { impact: 3, feasibility: 3, effort: 3, innovation: 3 }
  }, `session=${subToken}`), res, `/api/ideas/${ideaId}/scores`);
  assert.equal(res.statusCode, 403);
});

test("Phase7: submitter cannot GET scores (403)", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, subToken } = await setupIdeaForReview(handler);

  const res = fakeResponse();
  await handler(fakeRequest("GET", `/api/ideas/${ideaId}/scores`, undefined, `session=${subToken}`), res, `/api/ideas/${ideaId}/scores`);
  assert.equal(res.statusCode, 403);
});

test("Phase7: score value out of range (0 and 6) rejected with 400", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  const res0 = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/scores`, {
    scores: { impact: 0 }
  }, `session=${adminToken}`), res0, `/api/ideas/${ideaId}/scores`);
  assert.equal(res0.statusCode, 400, "Score of 0 should be rejected");

  const res6 = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/scores`, {
    scores: { impact: 6 }
  }, `session=${adminToken}`), res6, `/api/ideas/${ideaId}/scores`);
  assert.equal(res6.statusCode, 400, "Score of 6 should be rejected");
});

test("Phase7: effort inversion verified — effort=5 contributes 1, effort=1 contributes 5 in composite", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  // Only effort=5, no other dimensions
  const highEffortRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/scores`, {
    scores: { effort: 5 }
  }, `session=${adminToken}`), highEffortRes, `/api/ideas/${ideaId}/scores`);
  const { aggregate: aggHigh } = highEffortRes.json();
  // effort=5 inverted: 6-5=1, composite = 1/1 = 1.0
  assert.equal(aggHigh.composite, 1.0, "effort=5 should invert to composite contribution of 1");

  // Upsert effort=1
  const lowEffortRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/scores`, {
    scores: { effort: 1 }
  }, `session=${adminToken}`), lowEffortRes, `/api/ideas/${ideaId}/scores`);
  const { aggregate: aggLow } = lowEffortRes.json();
  // effort=1 inverted: 6-1=5, composite = 5/1 = 5.0
  assert.equal(aggLow.composite, 5.0, "effort=1 should invert to composite contribution of 5");
});

// ── Revert tests ──────────────────────────────────────────────

test("Revert: approve 2 stages then revert → back at stage 1 with history action revert", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  // Approve stage 1 → moves to stage 2 (technical-review)
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve" }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);
  // Approve stage 2 → moves to stage 3 (business-impact)
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve" }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  // Revert → should go back to stage 2 (technical-review)
  const revertRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/revert`,
    { comment: "Oops, let me redo this stage." }, `session=${adminToken}`), revertRes, `/api/ideas/${ideaId}/revert`);
  assert.equal(revertRes.statusCode, 200, "Revert should succeed");
  const idea = revertRes.json().idea;
  assert.equal(idea.current_stage, "technical-review", "After revert from stage3 should be at stage2");
  assert.equal(idea.status, "under-review");
  const revertEntry = idea.history.find((h) => h.comment === "Oops, let me redo this stage.");
  assert.ok(revertEntry, "History should include the revert comment");
});

test("Revert: reject then revert → status returns to under-review at previous stage", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  // Approve to stage 2
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve" }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  // Reject at stage 2
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "reject", comment: "Not feasible." }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  // Revert (reopen)
  const revertRes = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/revert`,
    { comment: "Reconsidering after discussion." }, `session=${adminToken}`), revertRes, `/api/ideas/${ideaId}/revert`);
  assert.equal(revertRes.statusCode, 200, "Reopen should succeed");
  const idea = revertRes.json().idea;
  assert.equal(idea.status, "under-review", "Status should be under-review after reopen");
  assert.ok(idea.current_stage, "Should have a stage after reopen");
});

test("Revert: comment too short returns 400", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, adminToken } = await setupIdeaForReview(handler);

  // Approve to move into review
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve" }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  const res = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/revert`,
    { comment: "no" }, `session=${adminToken}`), res, `/api/ideas/${ideaId}/revert`);
  assert.equal(res.statusCode, 400);
  assert.match(res.json().error, /comment.*required|required.*comment/i);
});

test("Revert: submitter cannot revert (403)", async () => {
  const { handler } = makeTestEnv();
  const { ideaId, subToken, adminToken } = await setupIdeaForReview(handler);

  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve" }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  const res = fakeResponse();
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/revert`,
    { comment: "trying to revert." }, `session=${subToken}`), res, `/api/ideas/${ideaId}/revert`);
  assert.equal(res.statusCode, 403);
});

// ── Bug 2 regression tests ────────────────────────────────────

test("Bug2: second PATCH on same idea after successful revision returns 403 'Idea is not awaiting revision.'", async () => {
  const { handler } = makeTestEnv();
  const subToken   = await loginAs(handler, "aylin@epam.local", "Submit123!");
  const adminToken = await loginAs(handler, "admin@innovatepam.local", "Admin123!");

  // Submitter creates idea
  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Bug2 revision double-submit test",
    description: "This idea tests that a second PATCH after a successful revision is rejected by the server.",
    category: "Developer Productivity"
  }, `session=${subToken}`), createRes, "/api/ideas");
  assert.equal(createRes.statusCode, 201);
  const ideaId = createRes.json().idea.id;

  // Admin approves to stage 2, then requests revision
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "approve" }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "request-revision", comment: "Please add more details." }, `session=${adminToken}`),
    fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  // First PATCH (successful revision) — sets revision_requested=0
  const firstPatch = fakeResponse();
  await handler(fakeRequest("PATCH", `/api/ideas/${ideaId}`,
    { title: "Bug2 revision double-submit test", description: "Updated with more details for the revision cycle test.", category: "Developer Productivity" },
    `session=${subToken}`), firstPatch, `/api/ideas/${ideaId}`);
  assert.equal(firstPatch.statusCode, 200, "First PATCH should succeed");
  assert.equal(firstPatch.json().idea.revision_requested, 0, "revision_requested should be 0 after revision");

  // Second PATCH on the same idea (revision_requested is now 0) → must 403
  const secondPatch = fakeResponse();
  await handler(fakeRequest("PATCH", `/api/ideas/${ideaId}`,
    { title: "Bug2 stale resubmit attempt", description: "This should be rejected as the idea is no longer awaiting revision.", category: "Developer Productivity" },
    `session=${subToken}`), secondPatch, `/api/ideas/${ideaId}`);
  assert.equal(secondPatch.statusCode, 403, "Second PATCH after revision should return 403");
  assert.match(secondPatch.json().error, /awaiting revision/i, "Error message should mention 'awaiting revision'");
});

// ── Bug 3 regression tests ────────────────────────────────────

test("Bug3: revision PATCH with attachments array keeps specified IDs and removes omitted ones", async () => {
  const { handler, db } = makeTestEnv();
  const subToken   = await loginAs(handler, "aylin@epam.local", "Submit123!");
  const adminToken = await loginAs(handler, "admin@innovatepam.local", "Admin123!");

  // Create idea with two attachments
  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Bug3 revision attachment test idea",
    description: "Testing that existing attachments can be kept or removed during a revision PATCH.",
    category: "Developer Productivity",
    attachments: [
      { name: "keep.txt",   type: "text/plain", size: 5, dataUrl: "data:text/plain;base64,aGVsbG8=" },
      { name: "remove.txt", type: "text/plain", size: 3, dataUrl: "data:text/plain;base64,Ynll" }
    ]
  }, `session=${subToken}`), createRes, "/api/ideas");
  assert.equal(createRes.statusCode, 201);
  const idea = createRes.json().idea;
  const ideaId = idea.id;
  assert.equal(idea.attachments.length, 2, "Idea should start with 2 attachments");
  const keepId   = idea.attachments.find((a) => a.name === "keep.txt").id;
  const removeId = idea.attachments.find((a) => a.name === "remove.txt").id;

  // Admin requests revision
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "request-revision", comment: "Please revise and fix attachments." }, `session=${adminToken}`),
    fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  // Submitter revises: keep one existing, remove the other, add a new upload
  const patchRes = fakeResponse();
  await handler(fakeRequest("PATCH", `/api/ideas/${ideaId}`, {
    title: "Bug3 revision attachment test idea",
    description: "Testing that existing attachments can be kept or removed during a revision PATCH.",
    category: "Developer Productivity",
    attachments: [
      { id: keepId },                                                                   // keep existing
      { name: "new.txt", type: "text/plain", size: 4, dataUrl: "data:text/plain;base64,bmV3IQ==" } // new upload
      // remove.txt is omitted → should be deleted
    ]
  }, `session=${subToken}`), patchRes, `/api/ideas/${ideaId}`);
  assert.equal(patchRes.statusCode, 200, "Revision PATCH with attachments should succeed");
  const updated = patchRes.json().idea;
  assert.equal(updated.attachments.length, 2, "Should have 2 attachments: kept + new");
  assert.ok(updated.attachments.some((a) => a.id === keepId), "kept.txt should still be present");
  assert.ok(!updated.attachments.some((a) => a.id === removeId), "remove.txt should be gone");
  assert.ok(updated.attachments.some((a) => a.name === "new.txt"), "new.txt should be added");

  // Verify DB directly
  const attCount = db.prepare("SELECT COUNT(*) AS n FROM attachments WHERE idea_id = ?").get(ideaId).n;
  assert.equal(attCount, 2, "DB should have exactly 2 attachments after reconcile");
  const removedRow = db.prepare("SELECT * FROM attachments WHERE id = ?").get(removeId);
  assert.ok(!removedRow, "Removed attachment should be deleted from DB");
});

test("Bug3: revision PATCH with empty attachments array removes all existing attachments", async () => {
  const { handler, db } = makeTestEnv();
  const subToken   = await loginAs(handler, "aylin@epam.local", "Submit123!");
  const adminToken = await loginAs(handler, "admin@innovatepam.local", "Admin123!");

  // Create idea with one attachment
  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Bug3 revision clear all attachments test",
    description: "Testing that passing an empty attachments array removes all existing files on revision.",
    category: "Developer Productivity",
    attachments: [
      { name: "deleteme.txt", type: "text/plain", size: 5, dataUrl: "data:text/plain;base64,aGVsbG8=" }
    ]
  }, `session=${subToken}`), createRes, "/api/ideas");
  assert.equal(createRes.statusCode, 201);
  const ideaId = createRes.json().idea.id;

  // Admin requests revision
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "request-revision", comment: "Please remove the attachment." }, `session=${adminToken}`),
    fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  // Submitter submits with empty attachments array
  const patchRes = fakeResponse();
  await handler(fakeRequest("PATCH", `/api/ideas/${ideaId}`, {
    title: "Bug3 revision clear all attachments test",
    description: "Testing that passing an empty attachments array removes all existing files on revision.",
    category: "Developer Productivity",
    attachments: []
  }, `session=${subToken}`), patchRes, `/api/ideas/${ideaId}`);
  assert.equal(patchRes.statusCode, 200, "Revision PATCH should succeed");
  assert.equal(patchRes.json().idea.attachments.length, 0, "All attachments should be removed");

  const attCount = db.prepare("SELECT COUNT(*) AS n FROM attachments WHERE idea_id = ?").get(ideaId).n;
  assert.equal(attCount, 0, "DB should have 0 attachments after clearing");
});

test("Revision extra_fields: PATCH with new extra_fields → response and GET show updated values", async () => {
  const { handler } = makeTestEnv();
  const subToken = await loginAs(handler, "aylin@epam.local", "Submit123!");
  const adminToken = await loginAs(handler, "admin@innovatepam.local", "Admin123!");

  const createRes = fakeResponse();
  await handler(fakeRequest("POST", "/api/ideas", {
    title: "Extra fields revision test idea",
    description: "Testing that extra_fields survive a revision cycle end to end in the portal.",
    category: "AI and Automation",
    extra_fields: { model_or_tool: "GPT-4o", automation_target: "Email triage" }
  }, `session=${subToken}`), createRes, "/api/ideas");
  assert.equal(createRes.statusCode, 201);
  const ideaId = createRes.json().idea.id;

  // Admin requests revision
  await handler(fakeRequest("POST", `/api/ideas/${ideaId}/stage-action`,
    { action: "request-revision", comment: "Please update the AI model." }, `session=${adminToken}`), fakeResponse(), `/api/ideas/${ideaId}/stage-action`);

  // Submitter revises with new extra_fields
  const patchRes = fakeResponse();
  await handler(fakeRequest("PATCH", `/api/ideas/${ideaId}`,
    {
      title: "Extra fields revision test idea",
      description: "Testing that extra_fields survive a revision cycle end to end in the portal.",
      category: "AI and Automation",
      extra_fields: { model_or_tool: "Claude-3.5", automation_target: "Support tickets" }
    }, `session=${subToken}`), patchRes, `/api/ideas/${ideaId}`);
  assert.equal(patchRes.statusCode, 200, "Revision PATCH should succeed");
  const patchedIdea = patchRes.json().idea;
  assert.equal(patchedIdea.extra_fields?.model_or_tool, "Claude-3.5", "PATCH response should have updated extra_field");

  // Verify via list endpoint (admin view)
  const listRes = fakeResponse();
  await handler(fakeRequest("GET", "/api/ideas", undefined, `session=${adminToken}`), listRes, "/api/ideas");
  const listed = listRes.json().ideas.find((i) => i.id === ideaId);
  assert.ok(listed, "Idea should appear in admin list");
  assert.equal(listed.extra_fields?.model_or_tool, "Claude-3.5", "List endpoint should reflect updated extra_fields");
  assert.equal(listed.extra_fields?.automation_target, "Support tickets");
});
