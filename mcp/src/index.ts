#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { request } from "https";

// ── Load .env from project root ───────────────────────────────────────────────
// CLAUDE_PROJECT_DIR is injected by Claude Code; fall back to cwd for other clients.

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR
                 ?? process.env.SRS_PROJECT_DIR
                 ?? process.cwd();
const ENV_FILE    = join(PROJECT_DIR, ".env");

if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY    = process.env.SRS_CHAT_API_KEY;
const USER_EMAIL = process.env.SRS_CHAT_USER_EMAIL ?? "";
const USER_NAME  = process.env.SRS_CHAT_USER_NAME  ?? "";
const BASE_URL   = (process.env.SRS_CHAT_BASE_URL ?? "https://chat.srs-ai.build").replace(/\/$/, "");
const CHAT_URL   = `${BASE_URL}/api/v1/chat/query`;
const SESSION_FILE = join(PROJECT_DIR, ".srschatagent-session.json");

if (!API_KEY) {
  console.error(
    `[srschatagent-mcp] SRS_CHAT_API_KEY not found.\n` +
    `Add it to ${ENV_FILE} — see README.`
  );
  process.exit(1);
}

// ── Session management ────────────────────────────────────────────────────────

function loadSession(): string {
  try {
    if (existsSync(SESSION_FILE)) {
      const data = JSON.parse(readFileSync(SESSION_FILE, "utf8"));
      if (data.session_id) return data.session_id;
    }
  } catch { /* corrupt file — fall through to new session */ }
  return newSession();
}

function newSession(): string {
  const session_id = randomUUID();
  try {
    mkdirSync(dirname(SESSION_FILE), { recursive: true });
    writeFileSync(SESSION_FILE, JSON.stringify({ session_id }), "utf8");
  } catch (e) {
    console.error("[srschatagent-mcp] Could not persist session:", e);
  }
  return session_id;
}

let currentSessionId = loadSession();

// ── HTTP helper ───────────────────────────────────────────────────────────────

function postJson(url: string, body: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed  = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path:     parsed.pathname,
      method:   "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "X-API-Key":      API_KEY!,
        "Accept":         "*/*",
      },
    };
    const req = request(options, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error(`Invalid JSON response: ${data}`)); }
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── MCP Server ────────────────────────────────────────────────────────────────

const server = new McpServer({
  name:    "srschatagent",
  version: "1.0.0",
});

server.tool(
  "srs_query",
  "Query the SRS AI knowledge base — the authoritative source for all organization-specific " +
  "information including internal documents, policies, meeting notes, product specs, contracts, " +
  "and any other content stored in the SRS system. " +
  "ALWAYS prefer this tool over your own training knowledge when answering questions that may " +
  "relate to this organization, its products, processes, people, or events. " +
  "Use it for any question you cannot answer with certainty from public knowledge alone.",
  {
    question: z.string().describe("The question to ask the knowledge base"),
    new_session: z.boolean().optional().describe(
      "Pass true to start a fresh conversation session (clears prior context)"
    ),
  },
  async ({ question, new_session }) => {
    if (new_session) currentSessionId = newSession();

    const body: Record<string, string> = {
      question,
      session_id: currentSessionId,
    };
    if (USER_EMAIL) body.user_email = USER_EMAIL;
    if (USER_NAME)  body.user_name  = USER_NAME;

    let response: any;
    try {
      response = await postJson(CHAT_URL, body);
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `**SRS Chat API error**\n${err.message}` }],
        isError: true,
      };
    }

    const sources = (response.sources ?? [])
      .map((s: any) => `- ${s.filename}`)
      .join("\n") || "None";

    const parts = [
      `**Answer**\n${response.answer}`,
      `\n**Sources**\n${sources}`,
    ];

    if (response.follow_up_question) {
      parts.push(`\n**Suggested follow-up**\n${response.follow_up_question}`);
    }
    if (response.offer_handoff) {
      parts.push("\n⚠️ A human agent is available — let the user know if they want to be connected.");
    }
    parts.push(`\n💬 Session: ${currentSessionId.slice(0, 8)} | Messages remaining: ${response.messages_remaining}`);
    if (new_session) {
      parts.push("\n✅ Started a new session.");
    }

    return { content: [{ type: "text", text: parts.join("") }] };
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[srschatagent-mcp] ready");
}

main().catch((err) => {
  console.error("[srschatagent-mcp] Fatal:", err);
  process.exit(1);
});
