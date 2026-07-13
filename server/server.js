import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 3000);
const password = process.env.BILL_PASSWORD || "Bill";
const sessionSecret = process.env.SESSION_SECRET || "dev-change-me";
const userKey = "bill";
const volumeStateDir = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || "";
const localStateFile = process.env.STATE_FILE
  ? path.resolve(process.env.STATE_FILE)
  : volumeStateDir
    ? path.join(volumeStateDir, "planner-state.json")
    : path.join(rootDir, ".local-planner-state.json");
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
    })
  : null;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

await initStore();

const server = http.createServer(async (request, response) => {
  try {
    setCors(response);
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    if (url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true });
      return;
    }
    if (url.pathname === "/api/login" && request.method === "POST") {
      await handleLogin(request, response);
      return;
    }
    if (url.pathname === "/api/state" && request.method === "GET") {
      requireToken(request);
      sendJson(response, 200, await readState());
      return;
    }
    if (url.pathname === "/api/state" && request.method === "PUT") {
      requireToken(request);
      const body = await readJsonBody(request);
      await writeState(body.state || {});
      sendJson(response, 200, { ok: true, updatedAt: new Date().toISOString() });
      return;
    }
    if (url.pathname === "/api/widget/today" && request.method === "GET") {
      requireToken(request);
      sendJson(response, 200, await getWidgetToday(url.searchParams.get("date")));
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    const status = error.statusCode || 500;
    sendJson(response, status, { error: status === 500 ? "server-error" : error.message });
    if (status === 500) console.error(error);
  }
});

server.listen(port, () => {
  console.log(`IELTS planner listening on ${port}`);
});

async function initStore() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS planner_state (
      user_key TEXT PRIMARY KEY,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function handleLogin(request, response) {
  const body = await readJsonBody(request);
  if (body.password !== password) {
    throw httpError(401, "wrong-password");
  }
  sendJson(response, 200, { token: signToken(userKey) });
}

async function readState() {
  if (pool) {
    const result = await pool.query("SELECT state, updated_at FROM planner_state WHERE user_key = $1", [userKey]);
    if (!result.rows.length) return { state: {}, updatedAt: null };
    return { state: result.rows[0].state || {}, updatedAt: result.rows[0].updated_at };
  }
  try {
    const raw = await fs.readFile(localStateFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return { state: {}, updatedAt: null };
  }
}

async function writeState(state) {
  if (pool) {
    await pool.query(
      `
        INSERT INTO planner_state (user_key, state, updated_at)
        VALUES ($1, $2, now())
        ON CONFLICT (user_key)
        DO UPDATE SET state = EXCLUDED.state, updated_at = now()
      `,
      [userKey, state]
    );
    return;
  }
  await fs.mkdir(path.dirname(localStateFile), { recursive: true });
  await fs.writeFile(localStateFile, JSON.stringify({ state, updatedAt: new Date().toISOString() }, null, 2));
}

async function getWidgetToday(date) {
  const today = date || new Date().toISOString().slice(0, 10);
  const { state } = await readState();
  const rows = state.planRows || [];
  const row = rows.find((item) => item.date === today) || null;
  const slots = state.schedule?.[today] || {};
  const items = Object.entries(slots)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([hour, slot]) => {
      const normalized = typeof slot === "string" ? { text: slot } : slot || {};
      return { hour: `${hour.padStart(2, "0")}:00`, text: normalized.text || "" };
    })
    .filter((item) => item.text);
  return {
    date: today,
    title: row ? [row.ieltsPlan, row.ieltsModule].filter(Boolean).join(" / ") : "No main plan",
    project: row ? [row.projectType, row.projectPlan || row.projectModule].filter(Boolean).join(" / ") : "",
    notes: row?.actual || state.planOverrides?.[today]?.actual || "",
    items,
  };
}

async function serveStatic(requestPath, response) {
  const cleanPath = requestPath === "/" ? "/index.html" : decodeURIComponent(requestPath);
  const resolved = path.resolve(rootDir, `.${cleanPath}`);
  if (!resolved.startsWith(rootDir)) throw httpError(403, "forbidden");
  try {
    const data = await fs.readFile(resolved);
    const ext = path.extname(resolved);
    response.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": staticCacheControl(resolved),
    });
    response.end(data);
  } catch {
    const fallback = await fs.readFile(path.join(rootDir, "index.html"));
    response.writeHead(200, { "Content-Type": contentTypes[".html"], "Cache-Control": "no-store" });
    response.end(fallback);
  }
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2_000_000) throw httpError(413, "payload-too-large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function signToken(subject) {
  const payload = Buffer.from(JSON.stringify({ sub: subject, iat: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function requireToken(request) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw httpError(401, "missing-token");
  const expected = crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw httpError(401, "invalid-token");
  }
  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw httpError(401, "invalid-token");
  }
  if (decoded.sub !== userKey) throw httpError(401, "invalid-token");
}

function setCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function staticCacheControl(filePath) {
  const noStoreFiles = new Set(["app.js", "config.js", "plan-data.js", "sw.js"]);
  if (path.extname(filePath) === ".html" || noStoreFiles.has(path.basename(filePath))) return "no-store";
  return "public, max-age=3600";
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
