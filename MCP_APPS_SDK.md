# MCP Apps SDK Integration (ChatGPT Visual UI)

TaxPilot uses the **OpenAI MCP Apps SDK** to render interactive UI widgets directly inside ChatGPT conversations. When a user interacts with TaxPilot tools in ChatGPT, rich visual components (forms, cards, checklists, progress bars) appear inline — not just text.

## Architecture

```
ChatGPT (Host)
  │
  ├── MCP Streamable HTTP → POST /sse
  │     ├── tools/list     → returns tools with _meta.ui.resourceUri
  │     ├── resources/list → returns widget resource (ui://taxpilot/widget.html)
  │     ├── resources/read → returns widget HTML (text/html;profile=mcp-app)
  │     └── tools/call     → returns { content + structuredContent }
  │
  └── Widget iframe (sandboxed)
        ├── postMessage bridge (JSON-RPC 2.0)
        ├── Receives: ui/notifications/tool-result → renders structuredContent
        ├── Sends: tools/call → interactive actions from buttons/forms
        └── Renders: HRB-branded components (buttons, forms, cards, checklists)
```

## Key Files

| File | Purpose |
|------|---------|
| `public/taxpilot-widget.html` | Self-contained widget HTML (CSS + JS + renderer) loaded in ChatGPT iframe |
| `src/bridge/server.ts` | Express server with MCP Streamable HTTP — serves tools, resources, widget HTML |
| `src/index.ts` | Stdio MCP server (also supports Apps SDK via resource handlers) |
| `src/ui/components.types.ts` | TypeScript interfaces for 17 UI component types |
| `src/ui/components.builders.ts` | Fluent builder API for creating structured UI responses |
| `src/ui/formatters/structured.examples.ts` | Example screen builders (home, intake, checklist, etc.) |

## How It Works

### 1. Tool Discovery
ChatGPT connects via MCP Streamable HTTP and calls `tools/list`. Every tool includes:
```json
{
  "name": "start_intake",
  "_meta": {
    "ui": { "resourceUri": "ui://taxpilot/widget.html" },
    "ui/resourceUri": "ui://taxpilot/widget.html"
  }
}
```
The `_meta.ui.resourceUri` tells ChatGPT this tool has an associated visual widget.

### 2. Widget Loading
ChatGPT calls `resources/read` with `uri: "ui://taxpilot/widget.html"` and receives the full HTML. It renders this in a sandboxed iframe.

### 3. Tool Execution + Widget Rendering
When a tool is called, the response includes both text (for the model) and `structuredContent` (for the widget):
```json
{
  "content": [{ "type": "text", "text": "..." }],
  "structuredContent": { /* UIResponse or StructuredUIResponse */ }
}
```
ChatGPT sends `structuredContent` to the widget via `ui/notifications/tool-result` postMessage notification.

### 4. Interactive Actions
The widget renders buttons, forms, and selection cards. When users click them, the widget calls tools back via the postMessage bridge (`tools/call`), creating a bidirectional interaction loop.

## Widget Components

The widget renders these HRB-branded component types:

- **Banner** — Success/info/warning alerts with icons
- **TextBlock** — Headings, body text, captions
- **StepProgress** — 5-step intake progress indicator
- **ProgressBar** — Percentage-based progress
- **FormGroup** + **FormField** — Text, email, phone, date, select inputs
- **SelectionCard** — Single-choice grid options
- **MultiSelectCard** — Multi-choice options with checkmarks
- **InfoCard** — Key-value data display with badges
- **TaxProCard** — Tax professional recommendation cards with ratings
- **Checklist** — Document collection checklist with status icons
- **AppointmentSummaryCard** — Branded appointment confirmation
- **Carousel** — Horizontal scrolling card display
- **Button** — Primary, secondary, danger, ghost variants

## Testing Locally

1. Start the server: `npm start`
2. The widget at `http://localhost:3001/taxpilot-widget.html` shows standalone mode
3. To test in ChatGPT: use ngrok (`ngrok http 3001`) and configure the MCP server URL in ChatGPT settings

## Migrating Formatters

Current tool responses use the existing `UIResponse` format. The widget handles both:
- **Legacy `UIResponse`** (has `_ui.title`, `_ui.subtitle`, data fields) → rendered via `renderUIResponse()`  
- **New `StructuredUIResponse`** (has `components[]`, `screen`, `stateUpdates`) → rendered via `renderResponse()`

To get rich interactive widgets, migrate formatters in `src/ui/formatters/` to return `StructuredUIResponse` using the builders in `src/ui/components.builders.ts`. See `src/ui/formatters/structured.examples.ts` for examples of every screen.
