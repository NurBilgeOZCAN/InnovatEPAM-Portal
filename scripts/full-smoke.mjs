// End-to-end smoke test against a running server on :4173.
// Exercises every phase. Throws on any assertion failure.

const BASE = "http://localhost:4173";

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT: " + msg);
  console.log("  OK  " + msg);
}

async function rq(path, opts = {}, cookies = {}) {
  const headers = { "content-type": "application/json", ...(opts.headers || {}) };
  const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  if (cookieStr) headers.cookie = cookieStr;
  const res = await fetch(BASE + path, { ...opts, headers });
  const text = await res.text();
  let body = text;
  try { body = JSON.parse(text); } catch {}
  const setCookie = res.headers.get("set-cookie") || "";
  const session = /session=([^;]+)/.exec(setCookie)?.[1];
  return { status: res.status, body, session };
}

async function main() {
  console.log("\n[reset] POST /api/demo/reset");
  await rq("/api/demo/reset", { method: "POST" });

  // ─── Phase 1+SQLite: login as both demo accounts ────────────
  console.log("\n[P1] login as admin");
  const adminLogin = await rq("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@innovatepam.local", password: "Admin123!" })
  });
  assert(adminLogin.status === 200, "admin login 200");
  assert(adminLogin.body.user.role === "admin", "admin role");
  const adminCookie = { session: adminLogin.session };

  console.log("\n[P1] login as submitter");
  const subLogin = await rq("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "aylin@epam.local", password: "Submit123!" })
  });
  assert(subLogin.status === 200, "submitter login 200");
  const subCookie = { session: subLogin.session };

  // ─── Phase 2: category-driven extra fields ──────────────────
  console.log("\n[P2] GET /api/categories");
  const cats = await rq("/api/categories");
  assert(Array.isArray(cats.body.categories) && cats.body.categories.length >= 6, "6 categories");
  assert(cats.body.fields["AI and Automation"]?.length >= 1, "AI fields present");

  // ─── Phase 3: multi-attachment submit ──────────────────────
  console.log("\n[P3] submit idea with 2 attachments + extra_fields");
  const dataUrl = "data:text/plain;base64," + Buffer.from("hello world").toString("base64");
  const submission = await rq("/api/ideas", {
    method: "POST",
    body: JSON.stringify({
      title: "Smart triage v2",
      description: "Refresh of triage system with AI assistance and clear escalation paths for tough cases.",
      category: "AI and Automation",
      extra_fields: { model_or_tool: "GPT-4o", automation_target: "ticket routing" },
      attachments: [
        { name: "spec.txt", type: "text/plain", size: 11, dataUrl },
        { name: "diagram.txt", type: "text/plain", size: 11, dataUrl }
      ]
    })
  }, subCookie);
  assert(submission.status === 200 || submission.status === 201, "submission ok " + submission.status);
  const ideaId = submission.body.idea.id;
  assert(submission.body.idea.attachments.length === 2, "2 attachments stored");
  assert(submission.body.idea.extra_fields.model_or_tool === "GPT-4o", "extra_fields persisted");

  console.log("\n[P3] reject oversized payload (count > 5)");
  const tooMany = await rq("/api/ideas", {
    method: "POST",
    body: JSON.stringify({
      title: "Many files",
      description: "This has too many files attached and should be rejected outright.",
      category: "Sustainability",
      extra_fields: { sustainability_metric: "CO2", quantified_impact: "10%" },
      attachments: Array.from({ length: 6 }, (_, i) => ({ name: `f${i}.txt`, type: "text/plain", size: 5, dataUrl }))
    })
  }, subCookie);
  assert(tooMany.status === 400, "rejects 6 attachments with 400");

  // ─── Phase 4: drafts ───────────────────────────────────────
  console.log("\n[P4] create + edit + promote + delete drafts");
  const draft = await rq("/api/drafts", {
    method: "POST",
    body: JSON.stringify({ title: "Partial idea" })
  }, subCookie);
  assert(draft.status === 200 || draft.status === 201, "draft create ok");
  const draftId = draft.body.draft.id;

  const draftList = await rq("/api/drafts", {}, subCookie);
  assert(draftList.body.drafts.some(d => d.id === draftId), "draft visible in list");

  const adminIdeas = await rq("/api/ideas", {}, adminCookie);
  assert(!adminIdeas.body.ideas.some(i => i.id === draftId), "admin does NOT see drafts");

  const patched = await rq("/api/drafts/" + draftId, {
    method: "PATCH",
    body: JSON.stringify({
      title: "Completed draft title",
      description: "This draft now has a full description ready for review by the evaluators.",
      category: "Developer Productivity",
      extra_fields: { affected_team_size: 25, time_saved_per_week_hours: 4 }
    })
  }, subCookie);
  assert(patched.status === 200, "draft patch ok");

  const promoted = await rq("/api/drafts/" + draftId + "/submit", { method: "POST" }, subCookie);
  assert(promoted.status === 200, "draft promotion ok");
  assert(promoted.body.idea.status === "submitted", "promoted to submitted");
  const promotedIdeaId = promoted.body.idea.id;

  // Another draft to delete
  const draft2 = await rq("/api/drafts", {
    method: "POST",
    body: JSON.stringify({ title: "Trash me" })
  }, subCookie);
  const del = await rq("/api/drafts/" + draft2.body.draft.id, { method: "DELETE" }, subCookie);
  assert(del.status === 200, "draft delete ok");

  // ─── Phase 5: multi-stage review ────────────────────────────
  console.log("\n[P5] full stage pipeline on " + ideaId);
  for (const stage of ["initial-screening", "technical-review", "business-impact"]) {
    const r = await rq(`/api/ideas/${ideaId}/stage-action`, {
      method: "POST",
      body: JSON.stringify({ action: "approve", comment: "Looks good at " + stage })
    }, adminCookie);
    assert(r.status === 200, "approve at " + stage + " ok");
  }
  const finalApprove = await rq(`/api/ideas/${ideaId}/stage-action`, {
    method: "POST",
    body: JSON.stringify({ action: "approve", comment: "Approved overall — strong fit." })
  }, adminCookie);
  assert(finalApprove.status === 200, "final approve ok");
  assert(finalApprove.body.idea.status === "accepted", "status accepted");

  console.log("\n[P5] revision flow");
  const revIdea = await rq("/api/ideas", {
    method: "POST",
    body: JSON.stringify({
      title: "Needs work",
      description: "Initial submission missing details that the evaluator will request to be revised.",
      category: "Process Improvement",
      extra_fields: { current_process: "Lots of manual steps", proposed_change: "Automation" }
    })
  }, subCookie);
  const revIdeaId = revIdea.body.idea.id;
  await rq(`/api/ideas/${revIdeaId}/stage-action`, {
    method: "POST",
    body: JSON.stringify({ action: "approve", comment: "advance" })
  }, adminCookie);
  const reqRev = await rq(`/api/ideas/${revIdeaId}/stage-action`, {
    method: "POST",
    body: JSON.stringify({ action: "request-revision", comment: "Please add ROI estimate." })
  }, adminCookie);
  assert(reqRev.status === 200, "request-revision ok");
  assert(reqRev.body.idea.revision_requested === true || reqRev.body.idea.revision_requested === 1, "revision flag set");

  const submitterRevise = await rq("/api/ideas/" + revIdeaId, {
    method: "PATCH",
    body: JSON.stringify({
      title: "Needs work v2",
      description: "Now includes the ROI estimate and detailed plan as requested by the evaluator.",
      category: "Process Improvement",
      extra_fields: { current_process: "manual", proposed_change: "automated with 30% ROI" }
    })
  }, subCookie);
  assert(submitterRevise.status === 200, "submitter revise ok");
  assert(submitterRevise.body.idea.revision_requested === false || submitterRevise.body.idea.revision_requested === 0, "revision flag cleared");
  assert(submitterRevise.body.idea.current_stage === "technical-review", "returned to same stage");

  // ─── Phase 6: blind review ──────────────────────────────────
  console.log("\n[P6] blind review submission");
  const blindIdea = await rq("/api/ideas", {
    method: "POST",
    body: JSON.stringify({
      title: "Anonymous idea",
      description: "Submitted in blind review mode to verify anonymization of the author identity.",
      category: "Workplace Experience",
      extra_fields: { target_audience: "all engineers", rollout_scope: "Global" },
      blind_review: true
    })
  }, subCookie);
  assert(blindIdea.status === 200 || blindIdea.status === 201, "blind submit ok");
  const blindId = blindIdea.body.idea.id;

  const adminListBlind = await rq("/api/ideas", {}, adminCookie);
  const adminBlindRow = adminListBlind.body.ideas.find(i => i.id === blindId);
  assert(/^Submitter #/.test(adminBlindRow.authorName), "admin sees anonymized author: " + adminBlindRow.authorName);

  const ownerList = await rq("/api/ideas", {}, subCookie);
  const ownerBlindRow = ownerList.body.ideas.find(i => i.id === blindId);
  assert(!/^Submitter #/.test(ownerBlindRow.authorName), "owner sees own real name: " + ownerBlindRow.authorName);

  console.log("\n[P6] toggle blind after stage action = 409");
  await rq(`/api/ideas/${blindId}/stage-action`, {
    method: "POST",
    body: JSON.stringify({ action: "approve", comment: "advance" })
  }, adminCookie);
  const lock = await rq(`/api/ideas/${blindId}/blind-review`, {
    method: "POST",
    body: JSON.stringify({ enabled: false })
  }, adminCookie);
  assert(lock.status === 409, "blind toggle locked after stage action");

  // ─── Phase 7: scoring ───────────────────────────────────────
  console.log("\n[P7] scoring");
  const dims = await rq("/api/score-dimensions");
  assert(dims.body.dimensions.length === 4, "4 dimensions");

  const score1 = await rq(`/api/ideas/${revIdeaId}/scores`, {
    method: "POST",
    body: JSON.stringify({
      scores: { impact: 5, feasibility: 4, effort: 2, innovation: 5 },
      comment: "Strong"
    })
  }, adminCookie);
  assert(score1.status === 200, "admin posts scores ok");

  const scoresRead = await rq(`/api/ideas/${revIdeaId}/scores`, {}, adminCookie);
  assert(typeof scoresRead.body.aggregate.composite === "number", "composite computed");
  console.log("  -- composite=" + scoresRead.body.aggregate.composite + " evaluators=" + scoresRead.body.aggregate.evaluatorCount);

  const scoreOOB = await rq(`/api/ideas/${revIdeaId}/scores`, {
    method: "POST",
    body: JSON.stringify({ scores: { impact: 6 } })
  }, adminCookie);
  assert(scoreOOB.status === 400, "out-of-range score rejected");

  const submitterReadScores = await rq(`/api/ideas/${revIdeaId}/scores`, {}, subCookie);
  assert(submitterReadScores.status === 403, "submitter forbidden from scores");

  // ─── Static asset checks ────────────────────────────────────
  console.log("\n[static] HTML + JS + CSS load");
  for (const path of ["/", "/index.html", "/src/app.js", "/src/api-client.js", "/src/styles.css"]) {
    const r = await fetch(BASE + path);
    assert(r.ok, `GET ${path} → ${r.status}`);
  }

  console.log("\n✅ All smoke checks passed.");
}

main().catch((e) => {
  console.error("\n❌ SMOKE FAILED:", e.message);
  process.exit(1);
});
