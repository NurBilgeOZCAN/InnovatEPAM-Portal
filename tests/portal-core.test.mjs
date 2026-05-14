import test from "node:test";
import assert from "node:assert/strict";

import {
  ROLES,
  createIdea,
  createSeedState,
  getPortalMetrics,
  getUserByEmail,
  getVisibleIdeas,
  loginUser,
  registerUser,
  updateIdeaStatus
} from "../src/server/domain.js";

const now = "2026-05-09T20:00:00.000Z";

test("registers a submitter and authenticates without exposing password hashes", () => {
  const state = createSeedState(now);
  const registration = registerUser(
    state,
    {
      name: "Deniz Rivera",
      email: "Deniz.Rivera@epam.com",
      password: "Sprint123",
      role: ROLES.SUBMITTER
    },
    now,
    "user-deniz"
  );

  assert.equal(registration.ok, true);
  assert.equal(registration.user.email, "deniz.rivera@epam.com");
  assert.equal(registration.user.role, ROLES.SUBMITTER);
  assert.equal("passwordHash" in registration.user, false);

  const login = loginUser(registration.state, {
    email: "deniz.rivera@epam.com",
    password: "Sprint123"
  });

  assert.equal(login.ok, true);
  assert.equal(login.user.id, "user-deniz");
  assert.equal("passwordHash" in login.user, false);
});

test("prevents duplicate registrations for the same email", () => {
  const state = createSeedState(now);
  const duplicate = registerUser(state, {
    name: "Aylin Submitter",
    email: "AYLIN@EPAM.LOCAL",
    password: "Submit123!",
    role: ROLES.SUBMITTER
  });

  assert.equal(duplicate.ok, false);
  assert.match(duplicate.error, /already exists/i);
});

test("creates an idea with one attachment and returns submitter scoped listings", () => {
  const state = createSeedState(now);
  const submitter = getUserByEmail(state, "aylin@epam.local");

  const result = createIdea(
    state,
    {
      title: "Reusable accessibility checklist",
      description:
        "Create a shared accessibility checklist that teams attach to delivery reviews before release.",
      category: "Developer Productivity",
      attachment: {
        name: "accessibility-checklist.pdf",
        type: "application/pdf",
        size: 18244,
        dataUrl: "data:application/pdf;base64,JVBERi0x"
      }
    },
    submitter.id,
    now,
    "idea-accessibility-checklist"
  );

  assert.equal(result.ok, true);
  assert.equal(result.idea.status, "submitted");
  assert.equal(result.idea.attachment.name, "accessibility-checklist.pdf");

  const visible = getVisibleIdeas(result.state, submitter);
  assert.equal(visible.some((idea) => idea.id === "idea-accessibility-checklist"), true);
});

test("allows admins to accept or reject with comments and blocks submitter review", () => {
  const state = createSeedState(now);
  const admin = getUserByEmail(state, "admin@innovatepam.local");
  const submitter = getUserByEmail(state, "aylin@epam.local");
  const ideaId = state.ideas[0].id;

  const blocked = updateIdeaStatus(state, ideaId, submitter.id, "accepted", "Looks strong.", now);
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /Only evaluator admins/i);

  const missingComment = updateIdeaStatus(state, ideaId, admin.id, "accepted", "", now);
  assert.equal(missingComment.ok, false);
  assert.match(missingComment.error, /comment/i);

  const accepted = updateIdeaStatus(
    state,
    ideaId,
    admin.id,
    "accepted",
    "Clear business value and low implementation risk.",
    now
  );

  assert.equal(accepted.ok, true);
  assert.equal(accepted.state.ideas[0].status, "accepted");
  assert.equal(accepted.state.ideas[0].history.at(-1).actorId, admin.id);
});

test("reports role-aware portal metrics", () => {
  const state = createSeedState(now);
  const admin = getUserByEmail(state, "admin@innovatepam.local");
  const submitter = getUserByEmail(state, "aylin@epam.local");

  const adminMetrics = getPortalMetrics(state, admin);
  const submitterMetrics = getPortalMetrics(state, submitter);

  assert.equal(adminMetrics.total, 1);
  assert.equal(adminMetrics.byStatus["under-review"], 1);
  assert.equal(adminMetrics.withAttachments, 1);
  assert.deepEqual(adminMetrics, submitterMetrics);
});
