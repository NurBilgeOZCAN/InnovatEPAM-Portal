import {
  CATEGORIES,
  DEMO_CREDENTIALS,
  ROLES,
  STATUSES,
  STATUS_META,
} from "./portal-core.js";
import { api } from "./api-client.js";

/* Driver.js loaded lazily so a CDN miss never breaks the rest of the app */
let _driverFn = null;
async function loadDriver() {
  if (_driverFn) return _driverFn;
  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.esm.js");
    _driverFn = mod.driver;
  } catch {
    /* CDN unavailable — tour silently disabled */
  }
  return _driverFn;
}

/* ─── Constants ─────────────────────────────────────────────── */
const ONBOARDING_KEY      = "innovatepam.onboarding.v1";
const guideKey            = (role) => `innovatepam.guide.${role}`;
const WELCOME_KEY         = "innovatepam.welcomed";
const THEME_KEY           = "innovatepam.theme";
const BLIND_MODE_KEY      = "innovatepam.admin.blindReviewMode";
const MAX_FILES           = 5;
const MAX_FILES_BYTES     = 8 * 1024 * 1024;

// Phase 2: category fields cache — populated on boot from /api/categories
let categoryFieldsCache = {};
// Selected files list for multi-file drop zone
let selectedFiles = [];
// Phase 7: score dimensions config fetched from server
let scoreDimensionsCache = [];
// Admin workspace blind-review mode
let adminBlindMode = localStorage.getItem(BLIND_MODE_KEY) === "true";

// Mirror of server anonHandle — same FNV-1a logic
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

/* ─── Theme ──────────────────────────────────────────────────── */
function applyTheme(theme) {
  const prev = document.getElementById("__theme-tx");
  if (prev) prev.remove();
  const tx = document.createElement("style");
  tx.id = "__theme-tx";
  tx.textContent = `*, *::before, *::after {
    transition: background 0.32s ease, background-color 0.32s ease,
                border-color 0.32s ease, color 0.22s ease,
                box-shadow 0.32s ease !important; }`;
  document.head.appendChild(tx);
  setTimeout(() => tx.remove(), 420);

  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);

  const isDark = theme === "dark";
  const label  = isDark ? "☀ Light" : "☾ Dark";
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.textContent = label;
    btn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
  });
}

function toggleTheme() {
  applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
}

/* ─── Role-specific guide steps ─────────────────────────────── */
const SUBMITTER_STEPS = [
  { icon: "💡", text: "Go to <strong>Submit Idea</strong> in the top navigation" },
  { icon: "📝", text: "Write a clear title, pick a category, and describe the problem + impact" },
  { icon: "📎", text: "Attach a support file to strengthen your case (any format · max 2 MB)" },
  { icon: "🚀", text: "Click <strong>Submit idea</strong> — it enters the review pipeline immediately" },
  { icon: "📊", text: "Track status changes on the <strong>Dashboard</strong> with full history" },
];

const ADMIN_STEPS = [
  { icon: "📋", text: "Open the <strong>Dashboard</strong> — you see all ideas from every submitter" },
  { icon: "🔍", text: "Use the status filter to find <strong>Submitted</strong> ideas awaiting review" },
  { icon: "📂", text: "Read each idea's description and download any support file" },
  { icon: "⚖️", text: "Use the <strong>review form</strong> at the bottom of each card to update status" },
  { icon: "✍️", text: "Always add an evaluator comment — it's <strong>required</strong> for Accept/Reject" },
];

/* ─── Driver.js interactive tours ───────────────────────────── */
const SUBMITTER_TOUR = [
  {
    element: "#submitPanel",
    popover: {
      title: "📝 Your idea form",
      description: "Fill in each field here to build the strongest possible submission. Let's walk through it step by step.",
      side: "left", align: "start",
    },
  },
  {
    element: "#submitPanel input[name='title']",
    popover: {
      title: "💡 Idea title",
      description: "Write a short, action-oriented name. Be specific — \"AI meeting summarizer\" beats \"AI tool\". Max 90 characters.",
      side: "bottom",
    },
  },
  {
    element: "#categorySelect",
    popover: {
      title: "🏷️ Category",
      description: "Pick the category that best fits. It helps evaluators route your idea to the right expert quickly.",
      side: "bottom",
    },
  },
  {
    element: "#submitPanel textarea[name='description']",
    popover: {
      title: "📄 Description",
      description: "Name the problem, propose your solution, and hint at impact. 3–5 clear sentences is ideal. More evidence = higher acceptance rate.",
      side: "top",
    },
  },
  {
    element: "#fileDropZone",
    popover: {
      title: "📎 Support file",
      description: "Drag a file here or click to browse. A diagram, doc, or data sheet as evidence makes your idea significantly more compelling.",
      side: "top",
    },
  },
  {
    element: "#submitIdeaBtn",
    popover: {
      title: "🚀 Submit!",
      description: "Click to send your idea into the review pipeline. Evaluators see it on their dashboard immediately — good luck!",
      side: "top",
    },
  },
];

const ADMIN_TOUR_STEPS = [
  {
    element: "#metricsPanel",
    popover: {
      title: "📊 Overview metrics",
      description: "At a glance — total ideas in scope, how many are in review, how many were accepted, and how many have attachments.",
      side: "bottom",
    },
  },
  {
    element: ".filters",
    popover: {
      title: "🔍 Filter & search",
      description: "Use the status filter to find ideas at a specific stage. Start with \"Submitted\" to see what needs your attention first.",
      side: "bottom",
    },
  },
  {
    element: "#ideasList",
    popover: {
      title: "📋 Idea cards",
      description: "Each card shows the idea's title, description, category, author, and any attached file. The status badge shows where it stands in the pipeline.",
      side: "top",
    },
  },
  {
    element: "#ideasList",
    popover: {
      title: "⚖️ Review form",
      description: "Scroll down inside any card to find the review form. Select a new status, write your evaluator comment (required for Accept/Reject), and click Update.",
      side: "top",
    },
  },
];

async function startTour(role) {
  const driverFn = await loadDriver();
  if (!driverFn) return;
  const steps = role === ROLES.ADMIN ? ADMIN_TOUR_STEPS : SUBMITTER_TOUR;
  const driverObj = driverFn({
    showProgress:    true,
    animate:         true,
    overlayOpacity:  0.65,
    progressText:    "Step {{current}} of {{total}}",
    nextBtnText:     "Next →",
    prevBtnText:     "← Back",
    doneBtnText:     "Done ✓",
    steps,
    onDestroyStarted: () => { driverObj.destroy(); },
  });
  driverObj.drive();
}

/* ─── DOM refs ───────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const refs = {
  onboardingOverlay: $("onboardingOverlay"),
  authPage:          $("authPage"),
  appView:           $("appView"),

  obSteps:      $$(".ob-step"),
  obDots:       $$(".ob-dot"),
  obNextBtn:    $("obNextBtn"),
  obSkipBtn:    $("obSkipBtn"),
  obRoleCards:  $("obRoleCards"),
  obFinalTitle: $("obFinalTitle"),
  obFinalText:  $("obFinalText"),
  obFinalTips:  $("obFinalTips"),

  firstRunGuide: $("firstRunGuide"),
  frgBackdrop:   $("frgBackdrop"),
  frgClose:      $("frgClose"),
  frgIconWrap:   $("frgIconWrap"),
  frgTitle:      $("frgTitle"),
  frgSubtitle:   $("frgSubtitle"),
  frgSteps:      $("frgSteps"),
  frgLater:      $("frgLater"),
  frgAction:     $("frgAction"),

  authFormsWrap: $("authFormsWrap"),
  signInPanel:   $("signInPanel"),
  registerPanel: $("registerPanel"),
  authTabPill:   $("authTabPill"),
  tabSignIn:     $("tabSignIn"),
  tabRegister:   $("tabRegister"),

  loginForm:       $("loginForm"),
  registerForm:    $("registerForm"),
  ideaForm:        $("ideaForm"),
  loginMessage:    $("loginMessage"),
  registerMessage: $("registerMessage"),
  ideaMessage:     $("ideaMessage"),
  routeMessage:    $("routeMessage"),
  demoAccess:      $("demoAccess"),

  logoutButton:    $("logoutButton"),
  resetDemoButton: $("resetDemoButton"),
  userChip:        $("userChip"),
  showGuideBtn:    $("showGuideBtn"),
  footerGuideBtn:  $("footerGuideBtn"),
  navLinks:        $$("[data-route-link]"),

  dashboardView: $("dashboardView"),
  submitView:    $("submitView"),
  guideView:     $("guideView"),

  workspaceTitle: $("workspaceTitle"),
  workspaceCopy:  $("workspaceCopy"),
  metricsPanel:   $("metricsPanel"),
  ideasList:      $("ideasList"),
  statusFilter:   $("statusFilter"),
  searchInput:    $("searchInput"),
  welcomeBanner:  $("welcomeBanner"),

  sessionPanel:    $("sessionPanel"),
  submitPanel:     $("submitPanel"),
  categorySelect:  $("categorySelect"),
  titleCounter:    $("titleCounter"),
  descCounter:     $("descCounter"),
  fileDropZone:    $("fileDropZone"),
  attachmentInput: $("attachmentInput"),
  fdzPlaceholder:  $("fdzPlaceholder"),

  docsLinks:    $$(".docs-link"),
  docsSections: $$(".docs-section"),

  // Phase 4: draft management
  draftEditBanner: $("draftEditBanner"),
  discardDraftBtn: $("discardDraftBtn"),
  cancelRevisionBtn: $("cancelRevisionBtn"),
  saveDraftBtn:    $("saveDraftBtn"),
  submitPanelTitle: $("submitPanelTitle"),
  draftsSection:   $("draftsSection"),
  draftsList:      $("draftsList"),
  existingAttachmentsList: $("existingAttachmentsList"),
};

/* ─── App state ─────────────────────────────────────────────── */
let currentUser = null;
let currentIdeas = [];
let currentDrafts = [];
// ID of the draft currently being edited (null = new idea)
let editingDraftId = null;
// Phase 5: stages config fetched from server
let stagesConfig = [];
// Phase 5: idea being revised by submitter (null = not in revision mode)
let revisingIdeaId = null;
// Bug 3: existing attachments when editing a draft or revising an idea
let editingAttachments = [];
// Phase 7: sort by composite toggle
let sortByComposite = false;

/* ─── Reusable confirm/prompt modal ────────────────────────── */
const _cm = {
  el: () => document.getElementById("confirmModal"),
  title: () => document.getElementById("cmTitle"),
  msg: () => document.getElementById("cmMessage"),
  input: () => document.getElementById("cmInput"),
  err: () => document.getElementById("cmError"),
  confirm: () => document.getElementById("cmConfirm"),
  cancel: () => document.getElementById("cmCancel"),
};
function openModal({ title, message, input = false, placeholder = "", minLength = 0, confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const el = _cm.el();
    _cm.title().textContent = title || "Confirm";
    _cm.msg().textContent = message || "";
    _cm.msg().hidden = !message;
    const ip = _cm.input();
    ip.hidden = !input;
    ip.value = "";
    ip.placeholder = placeholder;
    _cm.err().hidden = true;
    _cm.err().textContent = "";
    const conf = _cm.confirm();
    conf.textContent = confirmLabel;
    conf.classList.toggle("danger-confirm", danger);
    el.hidden = false;
    setTimeout(() => (input ? ip.focus() : conf.focus()), 30);

    const cleanup = (result) => {
      el.hidden = true;
      conf.removeEventListener("click", onConfirm);
      el.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      ip.removeEventListener("keydown", onIpEnter);
      resolve(result);
    };
    const onConfirm = () => {
      const val = input ? ip.value.trim() : "";
      if (input && val.length < minLength) {
        _cm.err().textContent = `Reason must be at least ${minLength} characters.`;
        _cm.err().hidden = false;
        ip.focus();
        return;
      }
      cleanup({ ok: true, value: val });
    };
    const onBackdrop = (e) => {
      if (e.target.dataset.cmCancel !== undefined) cleanup({ ok: false });
    };
    const onKey = (e) => {
      if (e.key === "Escape") cleanup({ ok: false });
    };
    const onIpEnter = (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onConfirm(); }
    };
    conf.addEventListener("click", onConfirm);
    el.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
    if (input) ip.addEventListener("keydown", onIpEnter);
  });
}

/* ─── Scoring modal (Phase 7) ────────────────────────────── */
function openScoringModal(idea) {
  return new Promise((resolve) => {
    const myScores = { ...(idea.myScores || {}) };
    const dims = scoreDimensionsCache;
    const scoring = idea.scoring;

    const modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    const renderRows = () => dims.map((dim) => {
      const mine = myScores[dim.id];
      const pills = [1,2,3,4,5].map((n) => {
        const isMine = mine === n;
        return `<button class="score-pill${isMine ? " score-pill--mine" : ""}" type="button"
          data-dim="${escapeHtml(dim.id)}" data-val="${n}"
          aria-pressed="${isMine ? "true" : "false"}">${n}</button>`;
      }).join("");
      const meanHtml = scoring?.byDimension?.[dim.id] !== undefined
        ? `<span class="score-dim-mean">${scoring.byDimension[dim.id]}</span>` : `<span class="score-dim-mean">—</span>`;
      const invNote = dim.invertedForComposite ? '<span class="score-inverted-note" title="Lower effort is better">↓</span>' : "";
      return `<div class="score-dim-row">
        <span class="score-dim-label">${escapeHtml(dim.label)}${invNote}</span>
        <span class="score-pills">${pills}</span>
        ${meanHtml}
      </div>`;
    }).join("");

    const compHtml = scoring
      ? `<span class="sm-composite"><span>Composite</span><strong>${scoring.composite}</strong><span class="muted">· ${scoring.evaluatorCount} evaluator${scoring.evaluatorCount !== 1 ? "s" : ""}</span></span>`
      : `<span class="sm-composite muted">No scores yet</span>`;

    modal.innerHTML = `
      <div class="cm-backdrop" data-sm-cancel></div>
      <div class="cm-card sm-card">
        <h3 class="cm-title">Rate this idea</h3>
        <p class="cm-message">${escapeHtml(idea.title)}</p>
        <div class="sm-rows">${renderRows()}</div>
        ${compHtml}
        <div class="cm-actions">
          <button class="ghost-button" type="button" data-sm-cancel>Cancel</button>
          <button class="primary-button sm-save" type="button">Save scores</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cleanup = (result) => {
      document.removeEventListener("keydown", onKey);
      modal.remove();
      resolve(result);
    };
    const onKey = (e) => { if (e.key === "Escape") cleanup({ ok: false }); };

    modal.addEventListener("click", (e) => {
      const pill = e.target.closest(".score-pill");
      if (pill) {
        const dim = pill.dataset.dim;
        const val = parseInt(pill.dataset.val, 10);
        myScores[dim] = val;
        modal.querySelectorAll(`.score-pill[data-dim="${CSS.escape(dim)}"]`).forEach((p) => {
          const on = parseInt(p.dataset.val, 10) === val;
          p.classList.toggle("score-pill--mine", on);
          p.setAttribute("aria-pressed", on ? "true" : "false");
        });
        return;
      }
      if (e.target.dataset.smCancel !== undefined) cleanup({ ok: false });
      if (e.target.closest(".sm-save")) cleanup({ ok: true, scores: myScores });
    });
    document.addEventListener("keydown", onKey);
  });
}

/* ════════════════════════════════════════════
   ONBOARDING (pre-auth, 5 steps)
════════════════════════════════════════════ */
let obStep = 0;
let obSelectedRole = null;
const OB_TOTAL = refs.obSteps.length;

function showOnboarding() {
  if (localStorage.getItem(ONBOARDING_KEY)) return;
  refs.onboardingOverlay.hidden = false;
  setObStep(0);
  refs.authPage.style.filter = "blur(4px)";
  refs.authPage.style.pointerEvents = "none";
}

function hideOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, "1");
  refs.onboardingOverlay.hidden = true;
  refs.authPage.style.filter = "";
  refs.authPage.style.pointerEvents = "";
}

function setObStep(i) {
  obStep = i;
  refs.obSteps.forEach((s, idx) => s.classList.toggle("active", idx === i));
  refs.obDots.forEach((d, idx) => d.classList.toggle("active", idx === i));
  const isLast = i === OB_TOTAL - 1;
  refs.obNextBtn.textContent = isLast ? "Get started →" : "Next →";
  if (isLast) updateFinalStep();
}

function updateFinalStep() {
  if (obSelectedRole === "submitter") {
    refs.obFinalTitle.textContent = "Ready to submit your first idea!";
    refs.obFinalText.textContent  = "Sign in or register as a Submitter. The demo account is ready to go immediately.";
    refs.obFinalTips.innerHTML = `
      <div class="ob-tip-row"><span>→</span><span>Demo: <strong>aylin@epam.local / Submit123!</strong></span></div>
      <div class="ob-tip-row"><span>→</span><span>Or register a new submitter account</span></div>
      <div class="ob-tip-row"><span>→</span><span>Head to <strong>Submit Idea</strong> to start your first submission</span></div>
    `;
  } else if (obSelectedRole === "admin") {
    refs.obFinalTitle.textContent = "Ready to start reviewing ideas!";
    refs.obFinalText.textContent  = "Sign in as an Evaluator Admin. The demo admin account has ideas waiting for review.";
    refs.obFinalTips.innerHTML = `
      <div class="ob-tip-row"><span>→</span><span>Demo: <strong>admin@innovatepam.local / Admin123!</strong></span></div>
      <div class="ob-tip-row"><span>→</span><span>Or register a new evaluator admin account</span></div>
      <div class="ob-tip-row"><span>→</span><span>Filter ideas by <strong>Submitted</strong> to find ones awaiting review</span></div>
    `;
  } else {
    refs.obFinalTitle.textContent = "Ready to go!";
    refs.obFinalText.textContent  = "Sign in or register to get started. Use the demo accounts to instantly explore both roles.";
    refs.obFinalTips.innerHTML = `
      <div class="ob-tip-row"><span>→</span><span>Use demo accounts to explore without registering</span></div>
      <div class="ob-tip-row"><span>→</span><span>Register to create a persistent user account</span></div>
      <div class="ob-tip-row"><span>→</span><span>Data is persisted server-side in SQLite</span></div>
    `;
  }
}

refs.obRoleCards.addEventListener("click", (e) => {
  const card = e.target.closest("[data-role]");
  if (!card) return;
  obSelectedRole = card.dataset.role;
  refs.obRoleCards.querySelectorAll(".ob-role-card").forEach((c) => {
    c.classList.toggle("selected", c === card);
  });
});

refs.obNextBtn.addEventListener("click", () => {
  if (obStep < OB_TOTAL - 1) {
    setObStep(obStep + 1);
  } else {
    hideOnboarding();
  }
});

refs.obSkipBtn.addEventListener("click", hideOnboarding);

/* ════════════════════════════════════════════
   POST-LOGIN FIRST-RUN GUIDE
════════════════════════════════════════════ */
function renderFirstRunGuide(role) {
  const isAdmin = role === ROLES.ADMIN;
  const steps   = isAdmin ? ADMIN_STEPS : SUBMITTER_STEPS;

  refs.frgIconWrap.textContent  = isAdmin ? "⚖️" : "💡";
  refs.frgTitle.textContent     = isAdmin ? "Welcome, Evaluator Admin!" : "Welcome! Let's submit your first idea.";
  refs.frgSubtitle.textContent  = isAdmin
    ? "Here's how to review and evaluate submitted ideas:"
    : "Here's how to create and track your first submission:";

  refs.frgSteps.innerHTML = steps.map((step, i) => `
    <li style="animation-delay:${0.05 + i * 0.07}s">
      <span class="frg-step-icon">${step.icon}</span>
      <span>${step.text}</span>
    </li>
  `).join("");

  refs.frgAction.textContent = isAdmin ? "Go to Dashboard →" : "Submit my first idea →";
  refs.frgAction.href        = isAdmin ? "#dashboard" : "#submit";
}

function showFirstRunGuide() {
  if (!currentUser) return;
  if (localStorage.getItem(guideKey(currentUser.role))) return;
  openGuide();
}

function openGuide() {
  if (!currentUser) return;
  renderFirstRunGuide(currentUser.role);
  refs.firstRunGuide.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeGuide() {
  if (currentUser) localStorage.setItem(guideKey(currentUser.role), "1");
  refs.firstRunGuide.hidden = true;
  document.body.style.overflow = "";
}

refs.frgClose.addEventListener("click", closeGuide);
refs.frgLater.addEventListener("click", closeGuide);
refs.frgBackdrop.addEventListener("click", closeGuide);
refs.showGuideBtn.addEventListener("click", openGuide);

refs.frgAction.addEventListener("click", (e) => {
  e.preventDefault();
  const role  = currentUser?.role;
  const route = role === ROLES.ADMIN ? "dashboard" : "submit";
  closeGuide();
  setRoute(route, true);
  setTimeout(() => startTour(role), 380);
});

refs.footerGuideBtn.addEventListener("click", () => setRoute("guide"));

/* ════════════════════════════════════════════
   WELCOME BANNER
════════════════════════════════════════════ */
function maybeShowWelcomeBanner() {
  if (!currentUser || !refs.welcomeBanner) return;
  if (sessionStorage.getItem(WELCOME_KEY)) return;
  sessionStorage.setItem(WELCOME_KEY, "1");

  const roleLabel = currentUser.role === ROLES.ADMIN ? "Evaluator Admin" : "Submitter";
  const firstName  = escapeHtml(currentUser.name.split(" ")[0]);
  refs.welcomeBanner.innerHTML = `
    <div class="welcome-banner" role="status">
      <div class="wb-text">
        <strong>Welcome back, ${firstName}!</strong>
        <span>Signed in as <em>${escapeHtml(roleLabel)}</em> · ${
          currentUser.role === ROLES.ADMIN
            ? "You can see and evaluate all submitted ideas."
            : "Submit ideas and track their progress here."
        }</span>
      </div>
      <button class="wb-close" type="button" aria-label="Dismiss welcome banner">Dismiss</button>
    </div>
  `;

  refs.welcomeBanner.querySelector(".wb-close")?.addEventListener("click", () => {
    refs.welcomeBanner.innerHTML = "";
  });
}

/* ════════════════════════════════════════════
   CHARACTER COUNTERS
════════════════════════════════════════════ */
function updateCounter(input, counterEl, max) {
  const len = input.value.length;
  counterEl.textContent = `${len} / ${max}`;
  counterEl.classList.toggle("warn",   len > max * 0.85);
  counterEl.classList.toggle("danger", len >= max);
}

const titleInput   = refs.ideaForm?.elements.namedItem("title");
const descTextarea = refs.ideaForm?.elements.namedItem("description");

titleInput?.addEventListener("input",   () => updateCounter(titleInput, refs.titleCounter, 90));
descTextarea?.addEventListener("input", () => updateCounter(descTextarea, refs.descCounter, 2500));

/* ════════════════════════════════════════════
   FILE DROP ZONE — multi-file (Phase 3)
════════════════════════════════════════════ */
function renderFileList() {
  if (!refs.fdzPlaceholder) return;
  if (selectedFiles.length === 0) {
    refs.fdzPlaceholder.innerHTML = `
      <span class="fdz-icon">📎</span>
      <span>Click to browse or drag files here</span>
      <span class="fdz-hint">Any format · max 5 files · total max 8 MB</span>
    `;
    refs.fileDropZone?.classList.remove("has-file");
    return;
  }
  const totalBytes = selectedFiles.reduce((s, f) => s + f.size, 0);
  const overSize  = totalBytes > MAX_FILES_BYTES;
  const overCount = selectedFiles.length > MAX_FILES;
  refs.fdzPlaceholder.innerHTML = `
    <ul class="file-list">
      ${selectedFiles.map((file, i) => `
        <li class="file-list-item">
          <span class="file-list-icon">${fileTypeIcon(file.type)}</span>
          <span class="file-list-name">${escapeHtml(file.name)}</span>
          <span class="file-list-size">${formatSize(file.size)}</span>
          <button class="file-list-remove" type="button" data-file-idx="${i}" aria-label="Remove ${escapeHtml(file.name)}">✕</button>
        </li>
      `).join("")}
    </ul>
    <span class="fdz-hint ${overSize || overCount ? "fdz-hint-error" : ""}">
      ${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""} · ${formatSize(totalBytes)} total
      ${overCount ? ` · ✗ max ${MAX_FILES} files` : ""}
      ${overSize  ? ` · ✗ max 8 MB` : ""}
    </span>
  `;
  refs.fileDropZone?.classList.add("has-file");
}

function fileTypeIcon(mimeType) {
  if (!mimeType) return "📎";
  if (mimeType.startsWith("image/"))       return "🖼";
  if (mimeType === "application/pdf")      return "📄";
  if (mimeType.startsWith("video/"))       return "🎬";
  if (mimeType.startsWith("text/"))        return "📝";
  return "📎";
}

function resetFilePlaceholder() {
  selectedFiles = [];
  renderFileList();
}

function addFiles(fileList) {
  for (const file of fileList) {
    if (!selectedFiles.some((f) => f.name === file.name && f.size === file.size)) {
      selectedFiles.push(file);
    }
  }
  if (selectedFiles.length > MAX_FILES) {
    selectedFiles = selectedFiles.slice(0, MAX_FILES);
  }
  renderFileList();
}

if (refs.fileDropZone && refs.attachmentInput) {
  // Make input accept multiple files
  refs.attachmentInput.setAttribute("multiple", "");

  refs.fileDropZone.addEventListener("click", (e) => {
    if (e.target.closest(".file-list-remove")) return;
    if (e.target !== refs.attachmentInput) refs.attachmentInput.click();
  });

  refs.fdzPlaceholder?.addEventListener("click", (e) => {
    const btn = e.target.closest(".file-list-remove");
    if (!btn) return;
    const idx = parseInt(btn.dataset.fileIdx, 10);
    selectedFiles.splice(idx, 1);
    renderFileList();
  });

  refs.fileDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    refs.fileDropZone.classList.add("dragover");
  });

  refs.fileDropZone.addEventListener("dragleave", () => {
    refs.fileDropZone.classList.remove("dragover");
  });

  refs.fileDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    refs.fileDropZone.classList.remove("dragover");
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  refs.attachmentInput.addEventListener("change", () => {
    if (refs.attachmentInput.files?.length) {
      addFiles(refs.attachmentInput.files);
      refs.attachmentInput.value = "";
    }
  });
}

/* ════════════════════════════════════════════
   AUTH TAB SWITCHING
════════════════════════════════════════════ */
let activePanel = "signin";

async function switchToPanel(target) {
  if (target === activePanel) return;
  const fromEl = target === "register" ? refs.signInPanel : refs.registerPanel;
  const toEl   = target === "register" ? refs.registerPanel : refs.signInPanel;

  fromEl.classList.add("fade-out");
  await new Promise((r) => setTimeout(r, 220));
  fromEl.hidden = true;
  fromEl.classList.remove("fade-out");

  toEl.hidden = false;
  toEl.classList.add("fade-in");
  await new Promise((r) => setTimeout(r, 20));
  toEl.classList.remove("fade-in");

  refs.authTabPill.classList.toggle("right", target === "register");
  refs.tabSignIn.classList.toggle("active",    target === "signin");
  refs.tabRegister.classList.toggle("active",  target === "register");
  refs.tabSignIn.setAttribute("aria-selected",   String(target === "signin"));
  refs.tabRegister.setAttribute("aria-selected", String(target === "register"));

  activePanel = target;
}

refs.tabSignIn.addEventListener("click",   () => switchToPanel("signin"));
refs.tabRegister.addEventListener("click", () => switchToPanel("register"));

/* Password show/hide toggles */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".pw-eye");
  if (!btn) return;
  const input  = btn.closest(".pw-wrap").querySelector("input");
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
});

/* ════════════════════════════════════════════
   ROUTING
════════════════════════════════════════════ */
function getRoute() {
  const hash = (location.hash || "").replace("#", "");
  // Treat "submit?draft=..." as the "submit" route
  if (hash.startsWith("submit")) return "submit";
  return hash || (currentUser ? "dashboard" : "login");
}

function getDraftIdFromHash() {
  const hash = (location.hash || "").replace("#", "");
  const match = hash.match(/^submit\?draft=(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setRoute(route, replace = false) {
  const hash = `#${route}`;
  if (location.hash === hash) { applyRoute(); return; }
  if (replace) { history.replaceState(null, "", hash); applyRoute(); return; }
  location.hash = hash;
}

function applyRoute(message = "") {
  let route = getRoute();
  const publicRoutes = ["login", "register", "guide"];

  if (!currentUser && !publicRoutes.includes(route)) {
    route = "login";
    history.replaceState(null, "", "#login");
  }

  if (currentUser && ["login", "register"].includes(route)) {
    setRoute("dashboard", true);
    return;
  }

  const isAuth = !currentUser;
  refs.authPage.hidden = !isAuth;
  refs.appView.hidden  = isAuth;
  refs.logoutButton.hidden = isAuth;
  const authToggle = document.getElementById("authThemeToggle");
  if (authToggle) authToggle.hidden = !isAuth;

  refs.navLinks.forEach((link) => {
    const active = link.dataset.routeLink === route;
    link.classList.toggle("active", active);
    active ? link.setAttribute("aria-current", "page") : link.removeAttribute("aria-current");
  });

  if (!currentUser) return;

  refs.dashboardView.hidden = route !== "dashboard";
  refs.submitView.hidden    = route !== "submit";
  refs.guideView.hidden     = route !== "guide";

  if (route === "submit") {
    refs.submitPanel.classList.add("route-focus");
    setTimeout(() => refs.submitPanel.classList.remove("route-focus"), 1800);
    refs.workspaceTitle.textContent = "Prepare a complete idea submission";
    refs.workspaceCopy.textContent  = "Add the problem, proposed impact, category, and one useful support file.";
    // Check if editing a draft via hash
    const draftId = getDraftIdFromHash();
    if (draftId && draftId !== editingDraftId) {
      loadDraftForEditing(draftId);
    } else if (!draftId && editingDraftId) {
      clearDraftEditMode();
    }
  } else if (route === "guide") {
    refs.workspaceTitle.textContent = "Follow the guided demo workflow";
    refs.workspaceCopy.textContent  = "Use submitter and admin flows to show the full MVP in a few minutes.";
  } else {
    refs.workspaceTitle.textContent = "Innovation review console";
    refs.workspaceCopy.textContent  = "Capture ideas, keep context attached, and move decisions through a clean review trail.";
  }

  if (refs.routeMessage) {
    refs.routeMessage.textContent = message || "";
    refs.routeMessage.hidden = !message;
  }

  if (route === "dashboard") maybeShowWelcomeBanner();
}

/* ════════════════════════════════════════════
   RENDERING
════════════════════════════════════════════ */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "No updates";
  return new Intl.DateTimeFormat("en", {
    month:  "short",
    day:    "2-digit",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSize(size) {
  const b = Number(size || 0);
  if (b < 1024)        return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function setMessage(el, message, tone = "error") {
  if (!el) return;
  el.textContent = message || "";
  el.dataset.tone = tone;
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function render() {
  refs.logoutButton.hidden = !currentUser;

  if (currentUser) {
    renderUserChip();
    renderSession();
    await refreshIdeas();
  }

  applyRoute();
}

async function refreshIdeas() {
  // Phase 5: load stages config if not already loaded
  if (stagesConfig.length === 0) {
    try {
      const data = await api.stages();
      stagesConfig = data.stages || [];
    } catch {
      stagesConfig = [];
    }
  }
  // Phase 7: load score dimensions if not yet loaded
  if (scoreDimensionsCache.length === 0) {
    try {
      const data = await api.scoreDimensions();
      scoreDimensionsCache = data.dimensions || [];
    } catch {
      scoreDimensionsCache = [];
    }
  }
  try {
    const data = await api.listIdeas();
    currentIdeas = data.ideas || [];
  } catch {
    currentIdeas = [];
  }
  // Phase 4: fetch drafts for submitters
  if (currentUser?.role === ROLES.SUBMITTER) {
    try {
      const data = await api.listDrafts();
      currentDrafts = data.drafts || [];
    } catch {
      currentDrafts = [];
    }
  } else {
    currentDrafts = [];
  }
  renderMetrics();
  renderIdeas();
  renderDrafts();
}

function renderUserChip() {
  if (!currentUser || !refs.userChip) return;
  const initials = currentUser.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  refs.userChip.innerHTML = `
    <div class="avatar" aria-hidden="true">${escapeHtml(initials)}</div>
    <span>${escapeHtml(currentUser.name)}</span>
  `;
}

function renderSession() {
  if (!refs.sessionPanel) return;
  const roleLabel = currentUser.role === ROLES.ADMIN ? "Evaluator admin" : "Submitter";
  refs.sessionPanel.innerHTML = `
    <p class="eyebrow">Signed in</p>
    <h2>${escapeHtml(currentUser.name)}</h2>
    <p class="muted">${escapeHtml(currentUser.email)}</p>
    <span class="role-pill">${escapeHtml(roleLabel)}</span>
    <a class="text-link profile-link" href="${currentUser.role === ROLES.ADMIN ? "#dashboard" : "#submit"}">
      ${currentUser.role === ROLES.ADMIN ? "Review ideas" : "Submit an idea"}
    </a>
  `;
}

function renderMetrics() {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const idea of currentIdeas) {
    byStatus[idea.status] = (byStatus[idea.status] || 0) + 1;
  }
  const metrics = {
    total: currentIdeas.length,
    byStatus,
    withAttachments: currentIdeas.filter((i) => (i.attachments?.length > 0) || i.attachment).length,
  };
  const cards = [
    ["Total ideas",  metrics.total,                   "All ideas in your current role scope"],
    ["In review",    metrics.byStatus["under-review"], "Items awaiting evaluator action"],
    ["Accepted",     metrics.byStatus.accepted,        "Approved for follow-up"],
    ["Attachments",  metrics.withAttachments,          "Ideas with supporting files"],
  ];
  refs.metricsPanel.innerHTML = cards.map(([label, value, note]) => `
    <article class="metric-card">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(String(value))}</div>
      <p class="metric-note">${escapeHtml(note)}</p>
    </article>
  `).join("");
}

function renderIdeas() {
  // Update admin blind-mode toggle button in workspace header
  const existingBlindBtn = document.getElementById("adminBlindModeBtn");
  if (currentUser?.role === ROLES.ADMIN) {
    if (!existingBlindBtn) {
      const heroCtas = document.querySelector(".view-hero-ctas");
      if (heroCtas) {
        const btn = document.createElement("button");
        btn.id = "adminBlindModeBtn";
        btn.className = "ghost-button admin-blind-btn";
        btn.type = "button";
        btn.title = "Toggle workspace-wide blind review mode";
        heroCtas.appendChild(btn);
        btn.addEventListener("click", () => {
          adminBlindMode = !adminBlindMode;
          localStorage.setItem(BLIND_MODE_KEY, String(adminBlindMode));
          renderIdeas();
        });
      }
    }
    const btn = document.getElementById("adminBlindModeBtn");
    if (btn) {
      btn.textContent = adminBlindMode ? "Blind mode · ON" : "Blind review mode";
      btn.classList.toggle("blind-mode-active", adminBlindMode);
    }
    // Show/hide the blind-active pill in the workspace header
    let pill = document.getElementById("blindModePill");
    if (adminBlindMode) {
      if (!pill) {
        pill = document.createElement("span");
        pill.id = "blindModePill";
        pill.className = "blind-mode-pill";
        pill.textContent = "Blind review · ON";
        const heroText = document.querySelector(".view-hero-text");
        if (heroText) heroText.appendChild(pill);
      }
    } else if (pill) {
      pill.remove();
    }
  } else {
    // Not admin — remove if they somehow exist
    existingBlindBtn?.remove();
    document.getElementById("blindModePill")?.remove();
  }

  const query  = refs.searchInput.value.trim().toLowerCase();
  const status = refs.statusFilter.value || "all";
  let ideas  = currentIdeas.filter((idea) => {
    const statusOk = status === "all" || idea.status === status;
    const hay = `${idea.title} ${idea.description} ${idea.category}`.toLowerCase();
    return statusOk && hay.includes(query);
  });

  // Phase 7: sort by composite if toggle is on (admin only)
  if (sortByComposite && currentUser?.role === ROLES.ADMIN) {
    ideas = [...ideas].sort((a, b) => {
      const ca = a.scoring?.composite ?? -Infinity;
      const cb = b.scoring?.composite ?? -Infinity;
      return cb - ca;
    });
  }

  if (ideas.length === 0) {
    refs.ideasList.innerHTML = `
      <div class="empty-state">
        <strong>No ideas match this view.</strong>
        <span>Adjust the filters or submit a new idea.</span>
      </div>
    `;
    return;
  }

  refs.ideasList.innerHTML = ideas.map(renderIdeaCard).join("");
}

function renderDrafts() {
  if (!refs.draftsSection || !refs.draftsList) return;
  const isSubmitter = currentUser?.role === ROLES.SUBMITTER;
  refs.draftsSection.hidden = !isSubmitter || currentDrafts.length === 0;
  if (!isSubmitter || currentDrafts.length === 0) return;

  refs.draftsList.innerHTML = currentDrafts.map(renderDraftCard).join("");
}

function renderDraftCard(draft) {
  return `
    <article class="idea-card draft-card">
      <div class="idea-card-main">
        <div>
          <div class="idea-title-row">
            <span class="status-badge draft-badge">Draft</span>
          </div>
          <h3>${escapeHtml(draft.title)}</h3>
          ${draft.description ? `<p>${escapeHtml(draft.description.slice(0, 120))}${draft.description.length > 120 ? "…" : ""}</p>` : '<p class="muted">No description yet.</p>'}
        </div>
        <dl class="idea-meta">
          <div><dt>Category</dt><dd>${escapeHtml(draft.category)}</dd></div>
          <div><dt>Last updated</dt><dd>${formatDate(draft.updatedAt)}</dd></div>
        </dl>
      </div>
      <div class="draft-actions">
        <button class="secondary-button" type="button" data-draft-edit="${escapeHtml(draft.id)}">Edit</button>
        <button class="primary-button" type="button" data-draft-submit="${escapeHtml(draft.id)}">Submit</button>
        <button class="danger-button" type="button" data-draft-delete="${escapeHtml(draft.id)}">Delete</button>
      </div>
    </article>
  `;
}

function renderIdeaCard(idea) {
  const status = STATUS_META[idea.status] || STATUS_META.submitted;

  // Admin workspace blind-mode override: when ON, replace author name with deterministic handle
  const isAdmin = currentUser.role === ROLES.ADMIN;
  const isTerminal = ["accepted", "rejected"].includes(idea.status);
  let displayAuthorName = idea.authorName || idea.authorId || "Unknown";
  if (isAdmin && adminBlindMode) {
    displayAuthorName = anonHandle(idea.authorId);
  }

  // Phase 3: multi-attachment chips
  const attachmentList = (idea.attachments || []);
  const attachmentsHtml = attachmentList.length > 0
    ? `<div class="attachment-chips">
        ${attachmentList.map((att) => renderAttachmentChip(idea.id, att)).join("")}
       </div>`
    : '<span class="no-attachment">No attachments</span>';

  // Phase 2: extra_fields display
  const extraHtml = renderExtraFieldsDisplay(idea.category, idea.extra_fields);

  // Phase 5: stepper widget
  const stepperHtml = renderStageStepper(idea);

  // Blind pill: shown when the submitter chose blind_review=1
  // When admin has workspace blind mode ON, hide it (names already hidden); show when OFF so admin knows
  const blindPill = (idea.blind_review === 1 && isAdmin && !adminBlindMode)
    ? `<span class="blind-pill" title="Submitter chose anonymous submission">Submitted anonymously</span>`
    : (idea.blind_review === 1 && !isAdmin && !isTerminal)
    ? `<span class="blind-pill" title="Blind review enabled — author hidden during evaluation">Blind</span>`
    : "";

  // Per-card blind toggle is removed; replaced by workspace-level toggle above.

  // Phase 5: revision banner for submitter
  const revisionBanner = (currentUser.role === ROLES.SUBMITTER && idea.revision_requested && idea.authorId === currentUser.id)
    ? (() => {
        const lastRevEntry = [...(idea.history || [])].reverse().find((h) => h.status === "submitted" && h.stage);
        const revComment = lastRevEntry?.comment || "Please revise your idea.";
        return `<div class="revision-banner" data-revision-banner>
          <div class="rb-text">
            <strong>Revision requested</strong><p>${escapeHtml(revComment)}</p>
          </div>
          <button class="primary-button" type="button" data-revise-idea="${escapeHtml(idea.id)}">Edit &amp; resubmit</button>
        </div>`;
      })()
    : "";

  // Phase 7: scoring panel (admin only, not submitter)
  const scoringHtml = isAdmin ? renderScoringPanel(idea) : "";

  // Phase 5: admin review form — 3 buttons + inline error
  const reviewForm =
    isAdmin && !isTerminal
      ? `<form class="review-form stage-action-form" data-stage-form data-idea-id="${escapeHtml(idea.id)}">
           <div class="review-form-row">
             <input name="comment" type="text" placeholder="Comment (required for reject, request-revision, and final approve)">
             <div class="stage-action-buttons">
               <button class="secondary-button" type="submit" data-action="approve">Approve &rarr;</button>
               <button class="danger-button" type="submit" data-action="reject">Reject &times;</button>
               <button class="secondary-button" type="submit" data-action="request-revision">Request revision &#8617;</button>
             </div>
           </div>
           <p class="review-error" hidden></p>
         </form>`
      : isAdmin && isTerminal
      ? `<div class="undo-area reopen-area">
           <button class="ghost-button reopen-btn reopen-modal-btn" type="button" data-reopen-idea="${escapeHtml(idea.id)}">&#8635; Reopen idea</button>
         </div>`
      : "";

  // Revert button (single, opens modal) for non-terminal ideas in review
  const revertHtml = isAdmin && !isTerminal && (idea.current_stage || (idea.history || []).some((h) => h.stage))
    ? `<div class="undo-area revert-area">
         <button class="ghost-button revert-btn revert-modal-btn" type="button" data-revert-idea="${escapeHtml(idea.id)}">&#8634; Revert last action</button>
       </div>`
    : "";

  // History entries: apply admin blind-mode override to actorId display
  const historyHtml = (idea.history || []).map((entry) => {
    const meta  = STATUS_META[entry.status] || STATUS_META.submitted;
    const stageLabel = entry.stage ? stagesConfig.find((s) => s.id === entry.stage)?.label || entry.stage : null;
    let actorDisplay = entry.actorId;
    if (isAdmin && adminBlindMode && entry.actorId === idea.authorId) {
      actorDisplay = anonHandle(idea.authorId);
    }
    return `<li><strong>${escapeHtml(meta.label)}</strong>${stageLabel ? ` <span class="history-stage-chip">${escapeHtml(stageLabel)}</span>` : ""} by ${escapeHtml(actorDisplay)} — ${escapeHtml(entry.comment || "")} <span>${formatDate(entry.at)}</span></li>`;
  }).join("");

  return `
    <article class="idea-card">
      ${stepperHtml}
      <div class="idea-card-main">
        <div>
          <div class="idea-title-row">
            <span class="status-badge ${escapeHtml(status.tone)}">${escapeHtml(status.label)}</span>
            ${blindPill}
            <span class="idea-id">${escapeHtml(idea.id.replace("idea-", "#"))}</span>
          </div>
          <h3>${escapeHtml(idea.title)}</h3>
          <p>${escapeHtml(idea.description)}</p>
          ${extraHtml}
        </div>
        <dl class="idea-meta">
          <div><dt>Category</dt><dd>${escapeHtml(idea.category)}</dd></div>
          <div><dt>Owner</dt><dd>${escapeHtml(displayAuthorName)}</dd></div>
          <div><dt>Updated</dt><dd>${formatDate(idea.updatedAt)}</dd></div>
          <div><dt>Files</dt><dd>${attachmentsHtml}</dd></div>
          ${(isAdmin && idea.scoring) ? `<div><dt>Score</dt><dd class="composite-chip">Composite: ${idea.scoring.composite} · ${idea.scoring.evaluatorCount} evaluator${idea.scoring.evaluatorCount !== 1 ? "s" : ""}</dd></div>` : ""}
        </dl>
      </div>
      ${scoringHtml}
      ${revisionBanner}
      ${reviewForm}
      ${revertHtml}
      <details class="history-panel">
        <summary>Status history (${(idea.history || []).length} ${(idea.history || []).length === 1 ? "entry" : "entries"})</summary>
        <ol>${historyHtml}</ol>
      </details>
    </article>
  `;
}

// Phase 5: stages stepper
function renderStageStepper(idea) {
  if (stagesConfig.length === 0) return "";
  const isAccepted = idea.status === "accepted";
  const isRejected = idea.status === "rejected";
  // Find the stage where rejection happened (from last history entry with a stage)
  let rejectedAtStage = null;
  if (isRejected) {
    const lastWithStage = [...(idea.history || [])].reverse().find((h) => h.stage);
    rejectedAtStage = lastWithStage?.stage || null;
  }
  const pips = stagesConfig.map((stage) => {
    let state = "pending";
    if (isAccepted) {
      state = "done";
    } else if (isRejected) {
      if (stage.id === rejectedAtStage) {
        state = "rejected";
      } else {
        const stageOrder = stage.order;
        const rejectedOrder = stagesConfig.find((s) => s.id === rejectedAtStage)?.order ?? 0;
        state = stageOrder < rejectedOrder ? "done" : "pending";
      }
    } else if (idea.current_stage) {
      const currentOrder = stagesConfig.find((s) => s.id === idea.current_stage)?.order ?? 0;
      if (stage.order < currentOrder) state = "done";
      else if (stage.id === idea.current_stage) state = "active";
    }
    const icon = state === "done" ? "✓" : state === "rejected" ? "✕" : state === "active" ? "●" : "○";
    return `<span class="stage-pip stage-pip--${escapeHtml(state)}" title="${escapeHtml(stage.label)}">${icon} <span class="stage-pip-label">${escapeHtml(stage.label)}</span></span>`;
  });
  return `<div class="stage-stepper" aria-label="Review pipeline">${pips.join('<span class="stage-sep">→</span>')}</div>`;
}

// Phase 7: scoring is a single button that opens a modal with the pill grid
function renderScoringPanel(idea) {
  if (scoreDimensionsCache.length === 0) return "";
  const scoring = idea.scoring;
  const myScores = (idea.myScores || {});
  const hasMyScores = Object.keys(myScores).length > 0;

  const composite = scoring
    ? `<span class="score-agg-pill"><span class="score-agg-label">Composite</span><strong>${scoring.composite}</strong><span class="score-agg-evaluators">${scoring.evaluatorCount} ev</span></span>`
    : `<span class="score-agg-pill score-empty">Not scored yet</span>`;

  return `<div class="scoring-strip">
    <button class="ghost-button score-open-btn" type="button"
      data-score-open-idea="${escapeHtml(idea.id)}">
      ${hasMyScores ? "Update my scores" : "Rate this idea"}
    </button>
    ${composite}
  </div>`;
}

function renderAttachmentChip(ideaId, att) {
  // If attachment has an id use /api/attachments/:id, else fall back to legacy route
  const url = att.id
    ? `/api/attachments/${encodeURIComponent(att.id)}`
    : `/api/ideas/${encodeURIComponent(ideaId)}/attachment`;

  const mimeType = att.type || "";
  if (mimeType.startsWith("image/")) {
    return `<span class="att-chip att-chip-image">
      <img src="${url}" alt="${escapeHtml(att.name)}" class="att-thumb" loading="lazy">
      <a href="${url}" download="${escapeHtml(att.name)}" class="att-name">${escapeHtml(att.name)}</a>
      <span class="att-size">${formatSize(att.size)}</span>
    </span>`;
  }
  if (mimeType === "application/pdf") {
    return `<span class="att-chip att-chip-pdf">
      <span class="att-pill">PDF</span>
      <a href="${url}" download="${escapeHtml(att.name)}" class="att-name">${escapeHtml(att.name)}</a>
      <span class="att-size">${formatSize(att.size)}</span>
    </span>`;
  }
  if (mimeType.startsWith("video/")) {
    return `<span class="att-chip att-chip-video">
      <span class="att-pill">Video</span>
      <a href="${url}" download="${escapeHtml(att.name)}" class="att-name">${escapeHtml(att.name)}</a>
      <span class="att-size">${formatSize(att.size)}</span>
    </span>`;
  }
  // Generic
  return `<span class="att-chip">
    <span class="att-pill">File</span>
    <a href="${url}" download="${escapeHtml(att.name)}" class="att-name">${escapeHtml(att.name)}</a>
    <span class="att-size">${formatSize(att.size)}</span>
  </span>`;
}

function renderExtraFieldsDisplay(category, extra_fields) {
  if (!extra_fields || Object.keys(extra_fields).length === 0) return "";
  const fields = categoryFieldsCache[category] || [];
  if (fields.length === 0) return "";
  const entries = fields
    .filter((f) => extra_fields[f.key] !== undefined && extra_fields[f.key] !== null && extra_fields[f.key] !== "")
    .map((f) => `<div><dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(String(extra_fields[f.key]))}</dd></div>`)
    .join("");
  if (!entries) return "";
  return `<dl class="extra-fields-display">${entries}</dl>`;
}

function renderStaticOptions() {
  // Categories: use cached API categories or fall back to static import
  const cats = Object.keys(categoryFieldsCache).length > 0
    ? Object.keys(categoryFieldsCache)
    : CATEGORIES;

  if (refs.categorySelect) {
    refs.categorySelect.innerHTML = cats.map(
      (c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
    ).join("");
    renderExtraFields(refs.categorySelect.value);
  }

  if (refs.statusFilter) {
    refs.statusFilter.innerHTML = [
      '<option value="all">All statuses</option>',
      ...STATUSES.map((s) => `<option value="${s}">${escapeHtml(STATUS_META[s].label)}</option>`),
    ].join("");
  }

  if (refs.demoAccess) {
    refs.demoAccess.innerHTML = DEMO_CREDENTIALS.map(
      (c) => `<button class="demo-button" type="button" data-demo-email="${escapeHtml(c.email)}" data-demo-password="${escapeHtml(c.password)}">${escapeHtml(c.label)}</button>`
    ).join("");
  }
}

/* ── Phase 2: dynamic extra-fields block ─────────────────────── */
function getExtraFieldsContainer() {
  let el = document.getElementById("extraFieldsBlock");
  if (!el) {
    // Fallback: append to form if placeholder not found in markup
    el = document.createElement("div");
    el.id = "extraFieldsBlock";
    el.className = "extra-fields-section-wrap";
    const categoryLabel = document.getElementById("categorySelect")?.closest("label");
    if (categoryLabel) {
      categoryLabel.insertAdjacentElement("afterend", el);
    } else {
      document.getElementById("ideaForm")?.appendChild(el);
    }
  }
  return el;
}

function renderExtraFields(category) {
  const container = getExtraFieldsContainer();
  const fields = categoryFieldsCache[category] || [];
  if (fields.length === 0) {
    container.innerHTML = "";
    return;
  }
  const bodyClass = fields.length > 1 ? "extra-fields-body" : "";
  container.innerHTML = `
    <div class="extra-fields-section">
      <p class="extra-fields-heading">Category details <span class="optional-tag">${category}</span></p>
      <div class="${bodyClass}">${fields.map((f) => renderExtraFieldInput(f)).join("")}</div>
    </div>
  `;
}

function renderExtraFieldInput(field) {
  const req = field.required ? ' <span class="req-star" aria-hidden="true">*</span>' : ' <span class="optional-tag">(optional)</span>';
  if (field.type === "textarea") {
    return `
      <label class="extra-field-label">
        ${escapeHtml(field.label)}${req}
        <span class="field-help">${escapeHtml(field.help)}</span>
        <textarea name="ef_${escapeHtml(field.key)}" rows="3" ${field.required ? "required" : ""}
          placeholder="${escapeHtml(field.help)}"></textarea>
      </label>`;
  }
  if (field.type === "select") {
    const opts = (field.options || []).map(
      (o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`
    ).join("");
    return `
      <label class="extra-field-label">
        ${escapeHtml(field.label)}${req}
        <span class="field-help">${escapeHtml(field.help)}</span>
        <select name="ef_${escapeHtml(field.key)}" ${field.required ? "required" : ""}>${opts}</select>
      </label>`;
  }
  return `
    <label class="extra-field-label">
      ${escapeHtml(field.label)}${req}
      <span class="field-help">${escapeHtml(field.help)}</span>
      <input name="ef_${escapeHtml(field.key)}" type="${field.type === "number" ? "number" : "text"}"
        ${field.type === "number" ? "min='1' max='500'" : ""}
        ${field.required ? "required" : ""}
        placeholder="${escapeHtml(field.help)}">
    </label>`;
}

/* ════════════════════════════════════════════
   DRAFT EDIT MODE
════════════════════════════════════════════ */
async function loadDraftForEditing(draftId) {
  try {
    const data = await api.getDraft(draftId);
    const draft = data.draft;
    editingDraftId = draftId;

    // Show banner
    if (refs.draftEditBanner) refs.draftEditBanner.hidden = false;
    if (refs.submitPanelTitle) refs.submitPanelTitle.textContent = "Edit draft";

    // Populate form
    const form = refs.ideaForm;
    if (!form) return;
    const titleInput = form.elements.namedItem("title");
    const descEl = form.elements.namedItem("description");
    if (titleInput) { titleInput.value = draft.title || ""; updateCounter(titleInput, refs.titleCounter, 90); }
    if (descEl) { descEl.value = draft.description || ""; updateCounter(descEl, refs.descCounter, 2500); }
    if (refs.categorySelect) {
      refs.categorySelect.value = draft.category || refs.categorySelect.value;
      renderExtraFields(refs.categorySelect.value);
      // Populate extra fields
      if (draft.extra_fields) {
        const fields = categoryFieldsCache[draft.category] || [];
        for (const field of fields) {
          const el = form.elements.namedItem(`ef_${field.key}`);
          if (el && draft.extra_fields[field.key] !== undefined) {
            el.value = draft.extra_fields[field.key];
          }
        }
      }
    }
    // Populate existing attachments list (files already attached to this draft)
    editingAttachments = (draft.attachments || []).map((a) => ({ id: a.id, name: a.name, size: a.size, type: a.type }));
    renderExistingAttachments();
    // Clear file input — existing attachments are shown separately; new uploads via the drop zone
    resetFilePlaceholder();
  } catch (err) {
    setMessage(refs.ideaMessage, err.message || "Failed to load draft.");
  }
}

function clearDraftEditMode() {
  editingDraftId = null;
  if (refs.draftEditBanner) refs.draftEditBanner.hidden = true;
  if (refs.submitPanelTitle) refs.submitPanelTitle.textContent = "New idea";
}

/* ════════════════════════════════════════════
   EVENT HANDLERS
════════════════════════════════════════════ */
async function handleLogin(e) {
  e.preventDefault();
  const values = formValues(refs.loginForm);
  try {
    const data = await api.login(values.email, values.password);
    currentUser = data.user;
    refs.loginForm.reset();
    setMessage(refs.loginMessage, "");
    setRoute("dashboard", true);
    await render();
    showFirstRunGuide();
  } catch (err) {
    setMessage(refs.loginMessage, err.message || "Login failed.");
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const values = formValues(refs.registerForm);
  try {
    const data = await api.register(values.name, values.email, values.password, values.role);
    currentUser = data.user;
    refs.registerForm.reset();
    setMessage(refs.registerMessage, "Account created.", "success");
    setRoute("dashboard", true);
    await render();
    showFirstRunGuide();
  } catch (err) {
    setMessage(refs.registerMessage, err.message || "Registration failed.");
  }
}

function collectFormData() {
  const values = formValues(refs.ideaForm);
  const extra_fields = {};
  const fields = categoryFieldsCache[values.category] || [];
  for (const field of fields) {
    const val = values[`ef_${field.key}`];
    if (val !== undefined && String(val).trim() !== "") {
      extra_fields[field.key] = field.type === "number" ? Number(val) : val;
    }
  }
  return { values, extra_fields: Object.keys(extra_fields).length > 0 ? extra_fields : undefined };
}

/* Render existing-attachment chips for draft-edit / revision-edit mode */
function renderExistingAttachments() {
  const el = refs.existingAttachmentsList;
  if (!el) return;
  if (editingAttachments.length === 0) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.innerHTML = `
    <div class="existing-attachments-header">Existing files</div>
    <ul class="existing-attachments-items">
      ${editingAttachments.map((att, idx) => `
        <li class="existing-att-item" data-att-idx="${idx}">
          <span class="att-chip">
            <span class="att-name">${escapeHtml(att.name)}</span>
            <span class="att-size">${formatSize(att.size)}</span>
          </span>
          <button type="button" class="remove-existing-att ghost-button" data-att-idx="${idx}" aria-label="Remove ${escapeHtml(att.name)}">✕ Remove</button>
        </li>
      `).join("")}
    </ul>
  `;
}

function resetSubmitForm() {
  refs.ideaForm.reset();
  delete refs.ideaForm.dataset.reviseIdea;
  resetFilePlaceholder();
  renderExtraFields(refs.categorySelect?.value || "");
  if (refs.titleCounter) refs.titleCounter.textContent = "0 / 90";
  if (refs.descCounter)  refs.descCounter.textContent  = "0 / 2500";
  clearDraftEditMode();
  revisingIdeaId = null;
  editingAttachments = [];
  renderExistingAttachments();
  if (refs.submitPanelTitle) refs.submitPanelTitle.textContent = "Submit an idea";
  // Hide the Cancel revision button, restore Save as draft button
  if (refs.cancelRevisionBtn) refs.cancelRevisionBtn.hidden = true;
  if (refs.saveDraftBtn) refs.saveDraftBtn.hidden = false;
}

async function handleIdeaSubmit(e) {
  e.preventDefault();
  setMessage(refs.ideaMessage, "");

  // Recover revisingIdeaId from form dataset in case the module-level var was cleared by a re-render
  if (!revisingIdeaId && refs.ideaForm.dataset.reviseIdea) {
    revisingIdeaId = refs.ideaForm.dataset.reviseIdea;
  }

  // Client-side file validation
  if (selectedFiles.length > MAX_FILES) {
    return setMessage(refs.ideaMessage, `Maximum ${MAX_FILES} attachments allowed.`);
  }
  const totalBytes = selectedFiles.reduce((s, f) => s + f.size, 0);
  if (totalBytes > MAX_FILES_BYTES) {
    return setMessage(refs.ideaMessage, "Total attachment size must not exceed 8 MB.");
  }

  try {
    const { values, extra_fields } = collectFormData();
    const newUploads = await Promise.all(selectedFiles.map(readAttachmentFile));

    if (revisingIdeaId) {
      // Phase 5: submitter revision resubmit
      // Client-side guard: verify the idea is still awaiting revision before hitting the server
      const ideaSnapshot = currentIdeas.find((i) => i.id === revisingIdeaId);
      if (ideaSnapshot && !ideaSnapshot.revision_requested) {
        return setMessage(refs.ideaMessage,
          "This idea is no longer awaiting revision — refresh to see its current state.", "error");
      }
      // Build combined attachments: kept existing IDs + new uploads
      const attachments = [
        ...editingAttachments.map((a) => ({ id: a.id })),
        ...newUploads
      ];
      await api.submitRevision(revisingIdeaId, values.title, values.description, values.category, extra_fields,
        attachments.length > 0 ? attachments : undefined);
      revisingIdeaId = null;
      delete refs.ideaForm.dataset.reviseIdea;
    } else if (editingDraftId) {
      // drafts do not carry blind_review from the form
      // Update draft then promote to submitted
      const attachments = [
        ...editingAttachments.map((a) => ({ id: a.id })),
        ...newUploads
      ];
      await api.updateDraft(editingDraftId, values.title, values.description, values.category, extra_fields,
        attachments);
      try {
        await api.submitDraft(editingDraftId);
      } catch (err) {
        // Validation failed — redirect to fix
        setMessage(refs.ideaMessage, err.message || "Submission failed. Please fix errors and try again.", "error");
        return;
      }
    } else {
      const blindReviewChecked = Boolean(refs.ideaForm?.elements?.namedItem?.("blind_review")?.checked);
      await api.submitIdea(
        values.title, values.description, values.category, extra_fields,
        newUploads.length > 0 ? newUploads : undefined,
        blindReviewChecked
      );
    }

    resetSubmitForm();
    setMessage(refs.ideaMessage, "Idea submitted successfully!", "success");
    setRoute("dashboard", true);
    await render();
  } catch (err) {
    setMessage(refs.ideaMessage, err.message || "Submission failed.");
  }
}

async function handleSaveDraft() {
  setMessage(refs.ideaMessage, "");

  // Revisions cannot be saved as drafts — guard against accidental click
  const activeRevisingId = revisingIdeaId || refs.ideaForm.dataset.reviseIdea;
  if (activeRevisingId) {
    return setMessage(refs.ideaMessage,
      "You are revising an idea — use Submit to resubmit or Cancel to discard changes.", "error");
  }

  if (selectedFiles.length > MAX_FILES) {
    return setMessage(refs.ideaMessage, `Maximum ${MAX_FILES} attachments allowed.`);
  }
  const totalBytes = selectedFiles.reduce((s, f) => s + f.size, 0);
  if (totalBytes > MAX_FILES_BYTES) {
    return setMessage(refs.ideaMessage, "Total attachment size must not exceed 8 MB.");
  }

  try {
    const { values, extra_fields } = collectFormData();
    const newUploads = await Promise.all(selectedFiles.map(readAttachmentFile));
    const attachments = [
      ...editingAttachments.map((a) => ({ id: a.id })),
      ...newUploads
    ];

    if (editingDraftId) {
      await api.updateDraft(editingDraftId, values.title, values.description, values.category, extra_fields, attachments);
    } else {
      await api.createDraft(values.title, values.description, values.category, extra_fields, newUploads.length > 0 ? newUploads : undefined);
    }

    resetSubmitForm();
    setMessage(refs.ideaMessage, "Draft saved.", "success");
    setRoute("dashboard", true);
    await render();
  } catch (err) {
    setMessage(refs.ideaMessage, err.message || "Could not save draft.");
  }
}

async function handleReviewSubmit(e) {
  // Phase 5: handle new stage-action form
  const stageForm = e.target.closest("[data-stage-form]");
  if (stageForm) {
    e.preventDefault();
    const action = e.submitter?.dataset?.action;
    if (!action) return;
    const commentInput = stageForm.querySelector("input[name='comment']");
    const errorEl = stageForm.querySelector(".review-error");
    const comment = commentInput?.value?.trim() || "";
    const ideaId = stageForm.dataset.ideaId;

    // Helper: show inline error and focus comment
    const showReviewError = (msg) => {
      if (errorEl) { errorEl.textContent = msg; errorEl.hidden = false; }
      commentInput?.focus();
    };
    const clearReviewError = () => { if (errorEl) { errorEl.textContent = ""; errorEl.hidden = true; } };

    // Clear error when user types
    if (commentInput && !commentInput.dataset.errorListenerAdded) {
      commentInput.dataset.errorListenerAdded = "1";
      commentInput.addEventListener("input", clearReviewError);
    }

    // Determine if we're at the final stage (needs comment for approve)
    const idea = currentIdeas.find((i) => i.id === ideaId);
    const currentStageId = idea?.current_stage || stagesConfig[0]?.id;
    const currentStageIdx = stagesConfig.findIndex((s) => s.id === currentStageId);
    const isFinalStage = stagesConfig.length > 0 && currentStageIdx === stagesConfig.length - 1;

    // Client-side guard: comment required?
    const commentRequired =
      action === "reject" ||
      action === "request-revision" ||
      (action === "approve" && isFinalStage);
    if (commentRequired && !comment) {
      showReviewError("A comment is required for this action.");
      return;
    }

    // Confirm for reject (use themed modal)
    if (action === "reject") {
      const res = await openModal({
        title: "Reject this idea?",
        message: `The idea will be marked rejected with this comment: "${comment.slice(0, 140)}"`,
        confirmLabel: "Reject idea",
        danger: true
      });
      if (!res.ok) return;
    }

    try {
      await api.stageAction(ideaId, action, comment);
      await refreshIdeas();
    } catch (err) {
      showReviewError(err.message || "Action failed.");
    }
    return;
  }
  // Legacy review form (kept for backwards compat)
  const form = e.target.closest("[data-review-form]");
  if (!form) return;
  e.preventDefault();
  const values = formValues(form);
  try {
    await api.updateStatus(form.dataset.ideaId, values.status, values.comment);
    await refreshIdeas();
  } catch (err) {
    const commentInput = form.querySelector("input[name='comment']");
    if (commentInput) commentInput.placeholder = err.message || "Update failed.";
  }
}

async function handleDraftAction(e) {
  const editBtn   = e.target.closest("[data-draft-edit]");
  const submitBtn = e.target.closest("[data-draft-submit]");
  const deleteBtn = e.target.closest("[data-draft-delete]");

  if (editBtn) {
    const id = editBtn.dataset.draftEdit;
    location.hash = `#submit?draft=${encodeURIComponent(id)}`;
    return;
  }

  if (submitBtn) {
    const id = submitBtn.dataset.draftSubmit;
    try {
      await api.submitDraft(id);
      await refreshIdeas();
    } catch (err) {
      // Redirect to edit so user can fix validation errors
      location.hash = `#submit?draft=${encodeURIComponent(id)}`;
      // Show error after navigation
      setTimeout(() => setMessage(refs.ideaMessage, err.message || "Submission failed. Fix the errors and try again.", "error"), 300);
    }
    return;
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.draftDelete;
    try {
      await api.deleteDraft(id);
      await refreshIdeas();
    } catch (err) {
      console.error("Delete draft failed:", err);
    }
  }
}

async function handleDemoAccess(e) {
  const btn = e.target.closest("[data-demo-email]");
  if (!btn) return;
  const email    = btn.dataset.demoEmail;
  const password = btn.dataset.demoPassword;
  try {
    const data = await api.login(email, password);
    currentUser = data.user;
    setRoute("dashboard", true);
    await render();
    showFirstRunGuide();
  } catch (err) {
    setMessage(refs.loginMessage, err.message || "Demo login failed.");
  }
}

function readAttachmentFile(file) {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load",  () =>
      resolve({ name: file.name, type: file.type || "application/octet-stream", size: file.size, dataUrl: String(reader.result || "") })
    );
    reader.addEventListener("error", () => reject(new Error("Attachment could not be read.")));
    reader.readAsDataURL(file);
  });
}

async function resetDemo() {
  try {
    await api.resetDemo();
    currentUser = null;
    currentIdeas = [];
    refs.loginForm.reset();
    refs.registerForm.reset();
    refs.ideaForm.reset();
    resetFilePlaceholder();
    if (refs.titleCounter) refs.titleCounter.textContent = "0 / 90";
    if (refs.descCounter)  refs.descCounter.textContent  = "0 / 2500";
    setMessage(refs.loginMessage,    "");
    setMessage(refs.registerMessage, "");
    setMessage(refs.ideaMessage,     "");
    localStorage.removeItem(guideKey("submitter"));
    localStorage.removeItem(guideKey("admin"));
    sessionStorage.removeItem(WELCOME_KEY);
    if (refs.welcomeBanner) refs.welcomeBanner.innerHTML = "";
    setRoute("login", true);
    applyRoute();
  } catch (err) {
    console.error("Reset failed:", err);
  }
}

/* ── Docs section navigation ── */
refs.docsLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const section = link.dataset.section;
    refs.docsLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
    refs.docsSections.forEach((s) => {
      const match = s.dataset.section === section;
      s.hidden = !match;
      s.classList.toggle("active", match);
    });
  });
});

/* ─── Theme toggle buttons ──────────────────────────────────── */
document.getElementById("authThemeToggle")?.addEventListener("click", toggleTheme);
document.getElementById("topbarThemeToggle")?.addEventListener("click", toggleTheme);

/* ─── Wire up events ────────────────────────────────────────── */
refs.loginForm.addEventListener("submit",    handleLogin);
refs.registerForm.addEventListener("submit", handleRegister);
refs.ideaForm.addEventListener("submit",     handleIdeaSubmit);
refs.ideasList.addEventListener("submit",    handleReviewSubmit);
refs.demoAccess.addEventListener("click",    handleDemoAccess);

// Phase 4: draft actions
refs.saveDraftBtn?.addEventListener("click", handleSaveDraft);
refs.discardDraftBtn?.addEventListener("click", async () => {
  if (editingDraftId) {
    try { await api.deleteDraft(editingDraftId); } catch { /* ignore */ }
  }
  resetSubmitForm();
  setRoute("submit", true);
  await render();
});

refs.cancelRevisionBtn?.addEventListener("click", () => {
  resetSubmitForm();
  setRoute("dashboard", true);
});

// Remove an existing attachment chip from the edit/revision form
refs.existingAttachmentsList?.addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".remove-existing-att");
  if (!removeBtn) return;
  const idx = parseInt(removeBtn.dataset.attIdx, 10);
  if (!isNaN(idx)) {
    editingAttachments.splice(idx, 1);
    renderExistingAttachments();
  }
});

refs.draftsList?.addEventListener("click", handleDraftAction);

// Phase 5: revision "Edit & resubmit" button
refs.ideasList.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-revise-idea]");
  if (!btn) return;
  revisingIdeaId = btn.dataset.reviseIdea;
  const idea = currentIdeas.find((i) => i.id === revisingIdeaId);
  if (!idea) return;
  // Pre-fill submit form with existing idea fields
  editingDraftId = null;
  if (refs.submitPanelTitle) refs.submitPanelTitle.textContent = "Edit & Resubmit";
  setRoute("submit", true);
  await render();
  // Pre-fill form fields
  const form = refs.ideaForm;
  if (!form) return;
  // Store revisingIdeaId in form dataset so it survives any re-render that may clear the module-level var
  form.dataset.reviseIdea = revisingIdeaId;
  const titleInput = form.querySelector("input[name='title']");
  const descInput  = form.querySelector("textarea[name='description']");
  if (titleInput) titleInput.value = idea.title || "";
  if (descInput)  descInput.value  = idea.description || "";
  const catSel = refs.categorySelect;
  if (catSel) {
    catSel.value = idea.category || "";
    catSel.dispatchEvent(new Event("change"));
    // Populate extra fields after renderExtraFields rebuilds the inputs
    if (idea.extra_fields) {
      const fields = categoryFieldsCache[idea.category] || [];
      for (const field of fields) {
        const el = form.elements.namedItem(`ef_${field.key}`);
        if (el && idea.extra_fields[field.key] !== undefined) {
          el.value = idea.extra_fields[field.key];
        }
      }
    }
  }
  // Clear stale file selection from any previous idea
  selectedFiles = [];
  resetFilePlaceholder();
  // Load existing attachments for this idea so user can see and optionally remove them
  editingAttachments = (idea.attachments || []).map((a) => ({ id: a.id, name: a.name, size: a.size, type: a.type }));
  renderExistingAttachments();
  // Show a revision banner in the submit panel; hide "Save as draft", show "Cancel revision"
  if (refs.draftEditBanner) {
    refs.draftEditBanner.hidden = false;
    const labelEl = refs.draftEditBanner.querySelector(".draft-edit-label");
    if (labelEl) labelEl.textContent = "Revising idea";
  }
  if (refs.saveDraftBtn) refs.saveDraftBtn.hidden = true;
  if (refs.cancelRevisionBtn) refs.cancelRevisionBtn.hidden = false;
});

// Phase 6: blind review checkbox toggle (admin, pre-review)
refs.ideasList.addEventListener("change", async (e) => {
  const cb = e.target.closest(".blind-review-checkbox");
  if (!cb) return;
  const ideaId = cb.dataset.ideaId;
  try {
    await api.setBlindReview(ideaId, cb.checked);
    await refreshIdeas();
  } catch (err) {
    cb.checked = !cb.checked; // revert
    console.error("Blind review toggle failed:", err.message);
  }
});

// Phase 7: "Rate this idea" button — opens modal, saves on confirm
refs.ideasList.addEventListener("click", async (e) => {
  const openBtn = e.target.closest(".score-open-btn");
  if (openBtn) {
    const ideaId = openBtn.dataset.scoreOpenIdea;
    const idea = currentIdeas.find((i) => i.id === ideaId);
    if (!idea) return;
    const result = await openScoringModal(idea);
    if (!result.ok) return;
    if (Object.keys(result.scores).length === 0) return;
    try {
      await api.postScores(ideaId, idea.current_stage || null, result.scores);
      await refreshIdeas();
    } catch (err) {
      await openModal({ title: "Could not save scores", message: err.message || "Save failed.", confirmLabel: "OK" });
    }
    return;
  }

  // Revert / Reopen — open the modal, send on confirm
  const undoBtn = e.target.closest(".revert-modal-btn, .reopen-modal-btn");
  if (undoBtn) {
    const isReopen = undoBtn.classList.contains("reopen-modal-btn");
    const ideaId = isReopen ? undoBtn.dataset.reopenIdea : undoBtn.dataset.revertIdea;
    const result = await openModal({
      title: isReopen ? "Reopen this idea" : "Revert last stage action",
      message: isReopen
        ? "The idea will return to under-review at the stage before the terminal decision."
        : "Step the pipeline back one stage. The last history entry will be removed.",
      input: true,
      placeholder: "Reason (min 4 characters)",
      minLength: 4,
      confirmLabel: isReopen ? "Reopen idea" : "Revert",
      danger: !isReopen
    });
    if (!result.ok) return;
    undoBtn.disabled = true;
    try {
      await api.revertIdea(ideaId, result.value);
      await refreshIdeas();
    } catch (err) {
      undoBtn.disabled = false;
      await openModal({
        title: "Could not complete action",
        message: err.message || "Operation failed.",
        confirmLabel: "OK"
      });
    }
    return;
  }
});

refs.logoutButton.addEventListener("click", async () => {
  try { await api.logout(); } catch { /* ignore */ }
  currentUser = null;
  currentIdeas = [];
  sessionStorage.removeItem(WELCOME_KEY);
  setRoute("login", true);
  applyRoute();
});

refs.resetDemoButton.addEventListener("click", resetDemo);

refs.statusFilter.addEventListener("change", renderIdeas);
refs.searchInput.addEventListener("input",   renderIdeas);

// Phase 7: sort by composite toggle (admin only)
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-sort-composite]");
  if (!btn) return;
  sortByComposite = !sortByComposite;
  btn.classList.toggle("active", sortByComposite);
  btn.textContent = sortByComposite ? "Sort: Composite ▲" : "Sort: Composite";
  renderIdeas();
});

// Phase 2: re-render extra fields on category change
refs.categorySelect?.addEventListener("change", () => {
  renderExtraFields(refs.categorySelect.value);
});

window.addEventListener("hashchange", () => applyRoute());

/* ─── Boot ──────────────────────────────────────────────────── */
applyTheme(localStorage.getItem(THEME_KEY) || "dark");

// Fetch category fields from API (single source of truth), then render static options
api.categories()
  .then((data) => {
    if (data.fields) categoryFieldsCache = data.fields;
  })
  .catch(() => {
    // Fall back to building cache from static CATEGORY_FIELDS via static CATEGORIES — no-op, renderStaticOptions uses CATEGORIES fallback
  })
  .finally(() => {
    renderStaticOptions();
  });

// Check session on boot, then render
api.session()
  .then((data) => { currentUser = data.user; })
  .catch(() => { currentUser = null; })
  .finally(async () => {
    await render();
    showOnboarding();
    globalThis.__innovatepamReady = true;
  });
