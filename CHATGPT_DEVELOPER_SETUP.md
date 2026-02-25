# ChatGPT Developer Mode — TaxPilot Setup Guide

This guide explains how to connect TaxPilot as an MCP server to ChatGPT so the
interactive UI renders inline in the conversation.

## Architecture

```
ChatGPT  ←→  MCP Streamable HTTP  ←→  TaxPilot Server (bridge/server.ts)
                   │
                   ├─ tools/list    → returns all tools with _meta (openai/outputTemplate)
                   ├─ tools/call    → returns structuredContent + _meta → widget renders UI
                   ├─ resources/list → TaxPilot widget HTML template
                   └─ resources/read → self-contained HTML + JS widget (text/html;profile=mcp-app)
```

ChatGPT:
1. Connects to the TaxPilot MCP server via Streamable HTTP.
2. Lists available tools (intake, checklist, routing, reminders, etc.).
3. When a tool is called, the response includes `structuredContent` (JSON)
   and `_meta["openai/outputTemplate"]` pointing to the widget resource URI.
4. ChatGPT fetches the widget HTML via `resources/read`.
5. The widget renders inside an iframe, receiving data via `window.openai.toolOutput`
   and the MCP Apps JSON-RPC bridge (`postMessage`).

## Prerequisites

- **Node 18+**
- **npm** or **pnpm**
- A ChatGPT Plus / Team / Enterprise subscription (developer mode access)

## 1. Install & build

```bash
cd TaxPilot
npm install
npm run build        # compiles TypeScript → dist/
```

## 2. Start the server

```bash
# Option A — development (tsx, auto-compiles)
npm run bridge

# Option B — production (after npm run build)
npm run start
```

The server starts on **http://localhost:3001** (configurable via `PORT` env var).

Verify it's running:

```bash
curl http://localhost:3001/health
# → {"ok":true,"service":"tax-intake-mcp-bridge","platform":"azure"}
```

## 3. Expose to the internet (if running locally)

ChatGPT needs a public URL. Use one of:

- **ngrok**: `ngrok http 3001` → copy the `https://xxxx.ngrok-free.app` URL
- **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:3001`
- **Azure / Railway / Render**: deploy and use the public hostname

## 4. Add MCP server in ChatGPT

1. Go to **ChatGPT → Settings → Developer → MCP Servers** (or the agent builder).
2. Click **"Add MCP Server"**.
3. Enter the server URL:

   ```
   https://YOUR_HOST/mcp
   ```

   (Replace `YOUR_HOST` with your public URL from step 3, or your Azure hostname.)

4. ChatGPT will connect, call `initialize`, then `tools/list`.
5. You should see the TaxPilot tools appear in the tool list.

### If using the stdio transport (Claude Desktop / VS Code)

Add this to your MCP client config (`mcp-config.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "taxpilot": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {}
    }
  }
}
```

## 5. Start a conversation

In ChatGPT, start a new chat. The model will see the TaxPilot tools. Try:

> "Show me the TaxPilot dashboard"

ChatGPT will call `render_taxpilot_ui` → the H&R Block-branded widget renders
inline with welcome message and action buttons.

> "Start a new tax intake"

ChatGPT calls `start_intake` → widget shows the intake form with step progress.

> "Generate a document checklist for client C-001"

ChatGPT calls `generate_document_checklist` → widget shows the checklist UI.

## MCP Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mcp` | POST | MCP Streamable HTTP (ChatGPT standard) |
| `/mcp` | GET | SSE transport (legacy MCP) |
| `/sse` | POST | Same as `/mcp` POST (backwards-compat) |
| `/sse` | GET | Same as `/mcp` GET (backwards-compat) |
| `/messages` | POST | Legacy SSE message endpoint |
| `/health` | GET | Health check |
| `/api/tools` | GET | List all MCP tools (JSON) |
| `/api/widget-data` | GET | Latest tool result (REST fallback) |

## How the Widget Works

The widget is a self-contained HTML document with inline CSS + JavaScript that:

1. **Receives data** via three channels (priority order):
   - `window.openai.toolOutput` — initial data from ChatGPT Apps SDK
   - `openai:set_globals` event — subsequent updates
   - `ui/notifications/tool-result` — MCP Apps JSON-RPC bridge

2. **Renders** H&R Block-branded UI components:
   - Forms, selection cards, multi-select
   - Progress bars, step trackers
   - Info cards, tax pro cards, appointment summaries
   - Document checklists, banners, buttons

3. **Interacts** with ChatGPT via:
   - `ui/message` — sends follow-up messages to the conversation
   - `tools/call` — calls MCP tools directly from the widget
   - `ui/update-model-context` — notifies the model of UI state changes

## Available Tools

| Tool | Description |
|------|-------------|
| `render_taxpilot_ui` | Show the TaxPilot home screen |
| `start_intake` | Begin a new client intake session |
| `process_intake_response` | Process client answers during intake |
| `get_intake_progress` | Get intake session progress |
| `get_client_summary` | Get full client profile |
| `generate_document_checklist` | Generate personalized doc checklist |
| `get_pending_documents` | List outstanding required documents |
| `route_to_tax_pro` | Find the best-matched tax professional |
| `get_appointment_estimate` | Estimate appointment duration |
| `create_appointment` | Book an appointment |
| `create_reminder` | Set up document reminders |
| `send_reminder` | Send a reminder notification |
| `get_client_reminders` | View all reminders |
| `send_client_notification` | Send custom email/SMS |
| `mark_document_collected` | Mark a document as received |
| `get_tax_pro_recommendations` | Get ranked tax pro recommendations |

## Troubleshooting

### Widget shows "Waiting for tool results…"
- The model needs to call a tool first. Ask it to "show the TaxPilot dashboard".
- Check the browser console for errors.

### ChatGPT says "Failed to connect to MCP server"
- Ensure the URL ends with `/mcp` (not just the root).
- Verify the server is running and reachable from the internet.
- Check CORS headers are being sent (the server has them enabled).

### Chrome 142+ blocks local widgets
If you're on Chrome 142+, disable the `local-network-access` flag:
1. Go to `chrome://flags/`
2. Find `#local-network-access-check`
3. Set it to **Disabled**
4. Restart Chrome.

### Widget renders but buttons don't work
- Ensure the MCP Apps bridge is working (`window.openai` should be defined).
- Check the console for JSON-RPC errors.
- Buttons with `tool_call` actions call the tool directly via the bridge.
  If the bridge isn't available, they fall back to `sendMessage`.
