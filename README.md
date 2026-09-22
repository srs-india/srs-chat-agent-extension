# SRS Chat Agent Extension

Tools that connect AI coding assistants (Claude Code, Cursor, Codex, and others) to the **SRS AI knowledge base**.

---

## What's in this repo

| Directory | What it is |
|---|---|
| `mcp/` | MCP server — works with any MCP-compatible client (Claude Code, Cursor, Codex, …) |

---

## Quick start (Claude Code)

1. Add `.mcp.json` to your project root:

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

2. Create `.env` in your project root (copy from `.env.example`):

```
SRS_CHAT_API_KEY=arcai-YOUR_KEY_HERE
SRS_CHAT_BASE_URL=https://chat.srs-ai.build
```

3. Add to `.gitignore`:

```
.env
.claude/srschatagent-session.json
```

4. Restart Claude Code and ask a question:

```
What kind of engine does the Toyota Crown have?
```

For full install and configuration details, see [`mcp/README.md`](mcp/README.md).

---

## npm package

Published as [`@srschatagent/mcp`](https://www.npmjs.com/package/@srschatagent/mcp) by the [`srschatagent`](https://www.npmjs.com/settings/srschatagent/members) npm organization.
