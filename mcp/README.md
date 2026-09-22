# @srschatagent/mcp

MCP server that connects Claude Code, Cursor, Codex, and any MCP-compatible AI assistant to the **SRS AI knowledge base**.

Once installed, just ask your AI assistant questions naturally — it will automatically query the SRS knowledge base and return answers with sources.

---

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- An SRS AI API key (from your SRS AI admin portal)

---

## Install — Claude Code

### Option A: Per-project (team-shared)

Add `.mcp.json` to your project root and commit it — **no secrets go in this file**:

```json
{
  "mcpServers": {
    "srschatagent": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@srschatagent/mcp"]
    }
  }
}
```

> If you already have `npx` on PATH, the `@srschatagent/mcp` package is downloaded and cached automatically on first use. No separate install step is needed.

Then create your personal `.env` in the project root (see [Configure](#configure) below).

### Option B: User-level (all projects)

```bash
claude mcp add --transport stdio srschatagent \
  --scope user \
  -- npx -y @srschatagent/mcp
```

Still requires a `.env` in each project root with your API key.

---

## Install — Cursor

In Cursor's `mcp_settings.json`:

```json
{
  "mcpServers": {
    "srschatagent": {
      "command": "npx",
      "args": ["-y", "@srschatagent/mcp"]
    }
  }
}
```

---

## Configure

Copy `.env.example` (from the repo root) to `.env` in your **project root**:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```
SRS_CHAT_API_KEY=arcai-YOUR_KEY_HERE
SRS_CHAT_BASE_URL=https://chat.srs-ai.build
```

Add these lines to `.gitignore` (so your key is never committed):

```
.env
.claude/srschatagent-session.json
```

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SRS_CHAT_API_KEY` | **Yes** | — | Your personal API key from the SRS AI admin portal |
| `SRS_CHAT_BASE_URL` | No | `https://chat.srs-ai.build` | Change only if the app is deployed elsewhere |
| `SRS_CHAT_USER_EMAIL` | No | — | Optional — sent for attribution in chat logs |
| `SRS_CHAT_USER_NAME` | No | — | Optional — sent for attribution in chat logs |

> The server reads `.env` from your project root automatically. You do **not** need to export shell environment variables.

---

## Usage

Restart Claude Code (or reload MCP servers) after editing `.mcp.json` or `.env`.

Then just ask questions naturally — Claude will call `srs_query` automatically:

```
What kind of engine does the Toyota Crown have?
What was the main topic of the meeting on May 22, 2024?
What are the approval requirements for a renewal deal with a discount?
What is the publication date of the blockchain paper?
```

To start a fresh conversation (clear session context):

```
Start a new SRS session and ask about the Toyota Crown engine.
```

---

## Session management

Your conversation context is persisted in `.claude/srschatagent-session.json` (project-local, git-ignored). This means follow-up questions carry context from previous ones — just like the SRS chat web app.

To reset:
- Tell Claude: *"Start a new SRS session"*
- Or delete `.claude/srschatagent-session.json`

---

## Troubleshooting

**Missing API key error at startup**
```
[srschatagent-mcp] SRS_CHAT_API_KEY not found.
```
Check that `.env` exists in the project root and contains `SRS_CHAT_API_KEY=...`.

**View server logs**
```bash
claude mcp logs srschatagent
```

**Verify the server is registered**
```bash
claude mcp list
```

**Wrong base URL**
If the SRS application has moved, update `SRS_CHAT_BASE_URL` in your `.env`.
