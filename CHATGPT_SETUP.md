# TaxPilot — ChatGPT Integration Guide

Two ways to give TaxPilot a UI/UX inside ChatGPT:

| Approach | Where it runs | Effort | Best for |
|---|---|---|---|
| **Option A: Custom GPT** | Inside ChatGPT.com | 5 min setup, no code | End-users who have ChatGPT Plus |
| **Option B: Embedded Chat UI** | Your own site (`/chat`) | Needs `OPENAI_API_KEY` | Public-facing web app, any user |

---

## Option A: Custom GPT with Actions (No Code)

This creates a GPT in ChatGPT that calls your deployed TaxPilot API directly.

### Steps

1. **Open GPT Editor**: Go to [https://chatgpt.com/gpts/editor](https://chatgpt.com/gpts/editor)

2. **Configure tab**:
   - **Name**: `TaxPilot`
   - **Description**: AI-powered tax intake assistant
   - **Instructions**: Copy from [`gpt/GPT_INSTRUCTIONS.md`](gpt/GPT_INSTRUCTIONS.md)
   - **Conversation starters**:
     - "I need to prepare for my tax appointment"
     - "Help me get my tax documents together"
     - "Find the right tax professional for me"
     - "Start my tax intake process"

3. **Add Actions**:
   - Click **"Create new action"**
   - **Authentication**: None
   - **Schema**: Paste the contents of [`gpt/actions-schema.yaml`](gpt/actions-schema.yaml)
   - The server URL is already set to your Azure deployment

4. **Save & Publish**

### That's it!
Users can now say "Start my tax intake" inside ChatGPT and it will guide them through the entire flow using your API.

---

## Option B: Embedded Chat UI (OpenAI SDK)

This adds a ChatGPT-powered conversational UI to your own site at `/chat`. The OpenAI SDK handles the AI conversation; function calling triggers your TaxPilot services locally.

### Architecture

```
Browser  ──POST /api/chat──▶  Express Server  ──OpenAI SDK──▶  ChatGPT API
                                    │                              │
                                    │◀── function calls ───────────┘
                                    │
                                    ▼
                             TaxPilot Services
                          (intake, checklist, routing...)
```

### Setup

1. **Get an OpenAI API key** from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

2. **Set the environment variable**:
   ```bash
   # Local development
   export OPENAI_API_KEY=sk-...

   # Azure App Service
   az webapp config appsettings set \
     --name taxpilot \
     --resource-group your-rg \
     --settings OPENAI_API_KEY=sk-...
   ```

   Optional: choose a model (defaults to `gpt-4o`):
   ```bash
   export OPENAI_MODEL=gpt-4o-mini   # cheaper, still great
   ```

3. **Build & start**:
   ```bash
   npm run build
   npm start
   ```

4. **Open the chat**: Visit [http://localhost:8080/chat](http://localhost:8080/chat)

### API Reference

| Endpoint | Method | Body | Description |
|---|---|---|---|
| `/api/chat` | POST | `{ "message": "...", "chatId": "..." }` | Send a message, get AI response |
| `/api/chat/reset` | POST | `{ "chatId": "..." }` | Reset conversation |
| `/chat` | GET | — | Chat UI page |

#### POST `/api/chat`

```json
// Request
{
  "message": "I need to prepare for my tax appointment",
  "chatId": null  // null for new conversation, or reuse from prior response
}

// Response  
{
  "reply": "Welcome to TaxPilot! I'd love to help you prepare...",
  "chatId": "abc-123-def"
}
```

### How it works

1. User sends a message via the chat UI
2. Express server forwards it to OpenAI's Chat Completions API with TaxPilot's system prompt and tool definitions
3. ChatGPT decides which tools to call (e.g., `start_intake`, `process_intake_response`)
4. The server executes tool calls against your local TaxPilot services
5. Results are fed back to ChatGPT, which formulates a user-friendly response
6. The final response is sent to the browser

### Files Added

```
src/chatgpt/
  chatEngine.ts      # OpenAI SDK integration with function calling
gpt/
  GPT_INSTRUCTIONS.md  # System prompt & Custom GPT setup guide
  actions-schema.yaml  # OpenAPI schema optimized for GPT Actions
public/
  chat.html            # Chat UI page
```

---

## Choosing Between Options

**Use Option A (Custom GPT)** if:
- Your users already have ChatGPT Plus/Team/Enterprise
- You want zero hosting of a chat UI
- You want the familiar ChatGPT interface

**Use Option B (Embedded Chat)** if:
- You want a branded experience on your own domain
- Your users may not have ChatGPT accounts
- You want full control over the UI/UX
- You want to embed the chat in your existing web app

**Use Both** — they work simultaneously. The Custom GPT calls your REST API endpoints, while the embedded chat uses the OpenAI SDK with local function execution.
