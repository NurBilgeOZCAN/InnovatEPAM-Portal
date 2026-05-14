import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const edgeCandidates = [
  process.env.EDGE_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
].filter(Boolean);

function resolveEdgePath() {
  const edgePath = edgeCandidates.find((candidate) => existsSync(candidate));
  if (!edgePath) {
    throw new Error("Microsoft Edge executable was not found.");
  }
  return edgePath;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForHttp(url, label, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      lastError = new Error(`${label} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`${label} did not become ready: ${lastError?.message || "timeout"}`);
}

async function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  const pending = new Map();
  const events = [];
  let nextId = 1;

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result || {});
      }
      return;
    }

    if (message.method === "Runtime.exceptionThrown" || message.method === "Log.entryAdded") {
      events.push(message);
    }
  });

  function send(method, params = {}) {
    const id = nextId;
    nextId += 1;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`CDP command timed out: ${method}`));
        }
      }, 5000);
    });
  }

  return {
    events,
    send,
    close: () => socket.close()
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed.");
  }
  return result.result?.value;
}

async function waitForExpression(cdp, expression, label, timeoutMs = 7000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

function failOnBrowserErrors(events) {
  const badEvents = events.filter((event) => {
    if (event.method === "Runtime.exceptionThrown") {
      return true;
    }
    const entry = event.params?.entry;
    return entry?.level === "error" && !String(entry?.url || "").includes("favicon");
  });

  if (badEvents.length > 0) {
    throw new Error(`Browser reported errors: ${JSON.stringify(badEvents.slice(0, 3))}`);
  }
}

const serverPort = await getFreePort();
const cdpPort = await getFreePort();
const appUrl = `http://127.0.0.1:${serverPort}/`;
const runtimeDir = path.join(root, "runtime_logs");
const profileDir = path.join(runtimeDir, `edge-profile-${Date.now()}`);
await mkdir(profileDir, { recursive: true });

const server = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(serverPort) },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true
});

let edge;
let cdp;
try {
  await waitForHttp(appUrl, "local app server");

  edge = spawn(
    resolveEdgePath(),
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--disable-extensions",
      "--disable-background-networking",
      "--window-size=1365,900",
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${profileDir}`,
      appUrl
    ],
    {
      cwd: root,
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true
    }
  );

  await waitForHttp(`http://127.0.0.1:${cdpPort}/json/version`, "Edge DevTools");
  const targetsResponse = await waitForHttp(`http://127.0.0.1:${cdpPort}/json/list`, "Edge target list");
  const targets = await targetsResponse.json();
  const target = targets.find((item) => item.type === "page" && item.url === appUrl) || targets[0];
  if (!target?.webSocketDebuggerUrl) {
    throw new Error("Could not find an Edge page target.");
  }

  cdp = await connectCdp(target.webSocketDebuggerUrl);
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Page.enable");

  await waitForExpression(
    cdp,
    `document.title === "InnovatEPAM Portal" && document.querySelector("#authPage")?.hidden === false`,
    "auth screen"
  );
  await waitForExpression(cdp, `globalThis.__innovatepamReady === true`, "app readiness");
  
  // Set localStorage flags for guide and onboarding
  await evaluate(cdp, `localStorage.clear(); true`);
  await evaluate(cdp, `localStorage.setItem("innovatepam.onboarding.v1", "1"); true`);
  await evaluate(cdp, `localStorage.setItem("innovatepam.guide.submitter", "1"); true`);
  await evaluate(cdp, `localStorage.setItem("innovatepam.guide.admin", "1"); true`);
  await evaluate(cdp, `location.reload(); true`);
  
  // Wait for page to be ready again after reload
  await waitForExpression(
    cdp,
    `document.querySelector("#authPage")?.hidden === false`,
    "auth screen after reload"
  );
  await waitForExpression(cdp, `globalThis.__innovatepamReady === true`, "app readiness after reload");
  
  await waitForExpression(
    cdp,
    `document.querySelector(".site-footer a")?.href.includes("github.com/bilgeozcan")`,
    "creator footer link"
  );
  await evaluate(
    cdp,
    `location.hash = "#submit"; true`
  );
  await waitForExpression(
    cdp,
    `location.hash === "#login"`,
    "protected route redirect"
  );
  await waitForExpression(
    cdp,
    `document.querySelector("input[type=file]")?.multiple === false`,
    "single attachment input"
  );

  await evaluate(
    cdp,
    `document.querySelector('[data-demo-email="aylin@epam.local"]').click(); true`
  );
  await waitForExpression(
    cdp,
    `location.hash === "#dashboard" && document.querySelector("#dashboardView")?.hidden === false && document.body.innerText.includes("Idea board")`,
    "submitter workspace"
  );
  await evaluate(
    cdp,
    `location.hash = "#guide"; true`
  );
  await waitForExpression(
    cdp,
    `location.hash === "#guide" && document.querySelector("#guideView")?.hidden === false && document.body.innerText.includes("Portal Overview")`,
    "signed-in guide route"
  );
  await evaluate(
    cdp,
    `location.hash = "#submit"; true`
  );
  await waitForExpression(
    cdp,
    `location.hash === "#submit" && document.querySelector("#submitPanel")?.classList.contains("route-focus")`,
    "submit route focus"
  );

  await evaluate(
    cdp,
    `(() => {
      const form = document.querySelector("#ideaForm");
      form.elements.title.value = "Edge runtime idea";
      form.elements.category.value = "Developer Productivity";
      form.elements.description.value = "This idea verifies the complete browser runtime through Microsoft Edge.";
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      return true;
    })()`
  );
  await waitForExpression(
    cdp,
    `document.body.innerText.includes("Edge runtime idea")`,
    "submitted idea"
  );

  await evaluate(cdp, `document.querySelector("#logoutButton").click(); true`);
  await waitForExpression(
    cdp,
    `document.querySelector("#authPage")?.hidden === false`,
    "logged out auth screen"
  );
  await evaluate(
    cdp,
    `document.querySelector('[data-demo-email="admin@innovatepam.local"]').click(); true`
  );
  await waitForExpression(
    cdp,
    `document.querySelector("#appView")?.hidden === false && document.body.innerText.includes("Edge runtime idea")`,
    "admin workspace"
  );
  await evaluate(
    cdp,
    `(() => {
      const card = [...document.querySelectorAll(".idea-card")].find((item) =>
        item.textContent.includes("Edge runtime idea")
      );
      const form = card.querySelector("[data-review-form]");
      form.elements.status.value = "accepted";
      form.elements.comment.value = "Approved for an MVP pilot.";
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      return true;
    })()`
  );
  await waitForExpression(
    cdp,
    `(() => {
      const data = JSON.parse(localStorage.getItem("innovatepam.portal.v1"));
      const idea = data.ideas.find((item) => item.title === "Edge runtime idea");
      return idea?.status === "accepted" && idea.history.some((entry) => entry.comment === "Approved for an MVP pilot.");
    })()`,
    "admin review persistence"
  );

  failOnBrowserErrors(cdp.events);
  console.log(`Edge smoke passed at ${appUrl}`);
} finally {
  cdp?.close();
  if (edge && !edge.killed) {
    edge.kill();
  }
  if (!server.killed) {
    server.kill();
  }
}
