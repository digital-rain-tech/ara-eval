# ARA-Eval Adversarial Chat + Model Dropdown — Design Spec

## Purpose

Two additions to the web interface:

1. **Model dropdown** — Replace freetext model input with a dropdown of tested reliable models plus a custom option.
2. **Adversarial chat page** — A chat interface where students converse directly with the LLM judge to probe failure modes, test context sensitivity, and discover where the evaluation breaks.

The adversarial chat is pedagogically motivated: students learn the most about LLM evaluation reliability by trying to break it.

## Feature 1: Model Dropdown

Replace the current freetext input in the top bar with a dropdown of the 3 models tested to 100% reliability:

| Model ID | Label | Notes |
|---|---|---|
| `arcee-ai/trinity-large-preview:free` | Arcee Trinity (default) | 18/18 success, ~17s/call |
| `openrouter/hunter-alpha` | Hunter Alpha | 18/18, most aggressive rater |
| `openrouter/healer-alpha` | Healer Alpha | 18/18, fastest (~6.5min/18 calls) |

Plus a "Custom..." option that reveals a text input for any OpenRouter model ID.

Applies to both the Evaluate page and the new Chat page.

## Feature 2: Adversarial Chat Page

### Layout

Same split-pane as the Evaluate page:

- **Left pane (40%)**: Live system prompt display. Updates instantly when any control changes. Jurisdiction section highlighted (same PromptInspector component).
- **Right pane (60%)**: Context controls at top, chat messages below, text input at bottom.

### Context Controls (top of right pane)

Always visible above the chat:
- **Personality** dropdown: compliance officer / CRO / ops director
- **Jurisdiction** tabs: Generic / HK / HK-Grounded
- **Rubric** dropdown: full / compact / bare
- **Model** dropdown: same as evaluate page
- **New Session** button

All controls are live — changing any control mid-conversation takes effect on the next message sent. When a control changes, a system message is inserted in the chat:

> *Context changed: jurisdiction Generic → HK-Grounded*

This makes conversation logs readable after the fact.

### Chat Interface

- Standard message list: user messages right-aligned, assistant messages left-aligned
- Context-change markers appear as centered system messages between regular messages
- Each assistant message shows token count and latency in small text
- Text input at bottom with send button
- Full conversation history is sent to OpenRouter on each message (the API is stateless)
- The system prompt is rebuilt from current controls on every send

### Persistence

New tables in the existing `results/ara-eval.db`:

```sql
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    model TEXT NOT NULL,
    initial_personality TEXT NOT NULL,
    initial_jurisdiction TEXT NOT NULL,
    initial_rubric TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    context_changes INTEGER NOT NULL DEFAULT 0,
    metadata TEXT
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    role TEXT NOT NULL,  -- 'user' | 'assistant' | 'system'
    content TEXT NOT NULL,
    personality TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    rubric TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    response_time_ms INTEGER,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
);
```

Each message records the active context at time of sending, so the full provenance is preserved.

### Chat History Page

`/chat/history` — lists past chat sessions:
- Columns: date, model, initial personality, initial jurisdiction, messages, context changes
- Click row → view full conversation with context-change markers and per-message metadata

### API Routes

- `POST /api/chat` — Send a message. Accepts: `sessionId`, `message`, `personality`, `jurisdiction`, `rubric`, `model`, `history` (prior messages). Returns: assistant response with tokens/latency. Creates session on first message.
- `GET /api/chat/sessions` — List sessions. Optional `?id=` for single session with all messages.

### New Files

```
web/src/app/chat/page.tsx              # Chat page (split-pane)
web/src/app/chat/history/page.tsx      # Chat session browser
web/src/app/api/chat/route.ts          # POST — send message
web/src/app/api/chat/sessions/route.ts # GET — list/detail sessions
web/src/components/ChatMessages.tsx    # Message list with context markers
web/src/components/ChatInput.tsx       # Text input + send button
web/src/components/ContextControls.tsx # Personality/jurisdiction/rubric/model
web/src/components/ModelSelector.tsx   # Shared model dropdown (used by both pages)
```

### Modified Files

- `web/src/lib/db.ts` — Add chat tables schema, session/message CRUD functions
- `web/src/app/page.tsx` — Replace model freetext with ModelSelector component
- `web/src/components/Nav.tsx` — Add "Chat" link

## What Does NOT Change

- Python code — untouched
- Evaluate page functionality — same behavior, just model input becomes a dropdown
- Existing database tables — untouched
- Prompt templates and scenarios — untouched
