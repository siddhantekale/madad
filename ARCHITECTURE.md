# Madad — Architecture

A personal, ChatGPT/Claude-style mobile chat app with an on-device, embedding-backed
knowledge store. Built for fun; designed so the chat/embedding backends are swappable
for a custom API endpoint later.

## Stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK 54, React Native 0.81, React 19, TypeScript |
| Navigation | `expo-router` (file-based) + `@react-navigation/drawer` (session side-panel) |
| Chat backend | **DeepSeek** (`deepseek-chat` / `deepseek-reasoner`), OpenAI-compatible via `fetch` |
| Embeddings | **OpenAI** `text-embedding-3-small` (1536-d) |
| Session storage | `@react-native-async-storage/async-storage` |
| Vector index | `expo-sqlite` (Float32 BLOB vectors) |
| Secrets | `expo-secure-store` (Keychain on native; `localStorage` on web) |
| Markdown | `react-native-markdown-display` (assistant messages) |
| Notifications | `expo-notifications` (local "reply ready") |
| Clipboard | `expo-clipboard` (copy a message) |
| Type | Source Sans Pro via `@expo-google-fonts/source-sans-3` |

Single light theme: plain white surfaces, Source Sans Pro throughout.

## Directory layout

```
src/
  app/                         # expo-router routes
    _layout.tsx                # root: fonts, providers, GestureHandler, Drawer
    index.tsx                  # chat screen (send orchestration + header index button)
    settings.tsx               # provider/model picker + secure API-key entry
  components/
    DrawerContent.tsx          # session list, "New chat", Settings link
    MessageBubble.tsx          # user (plain) vs assistant (Markdown + copy button)
    ChatInput.tsx              # auto-growing input, send/stop button
  context/
    SessionsContext.tsx        # session list, active session, lazy create + auto-title
    SettingsContext.tsx        # provider/model selection, API-key presence
  lib/
    types.ts                   # Message, Session, ProviderId
    id.ts                      # id generator
    storage.ts                 # AsyncStorage: sessions + settings
    secure.ts                  # secure-store wrapper (keychain / localStorage)
    db.ts                      # expo-sqlite: session_index table + helpers
    indexer.ts                 # summarize-if-long → embed → store snapshot
    notify.ts                  # notification permission + completion notification
    llm/
      types.ts                 # LLMProvider interface
      index.ts                 # provider registry + default
      providers/
        deepseek.ts            # real chat backend
        openai.ts, claude.ts, gemini.ts   # mocked stubs ("Awaiting Integration")
        mock.ts                # shared mock helper
    embeddings/
      types.ts                 # EmbeddingProvider interface
      openai.ts                # text-embedding-3-small impl
      index.ts                 # selected embedding provider
  constants/
    theme.ts                   # Colors, Font, Spacing, Radius
```

## Core data model (`lib/types.ts`)

```ts
Message  = { id, role: 'user' | 'assistant', content, createdAt }
Session  = { id, title, messages: Message[], createdAt, updatedAt }
ProviderId = 'deepseek' | 'claude' | 'openai' | 'gemini'
```

## Swappable backends

Two parallel interfaces keep the network layer behind a seam, so replacing
DeepSeek/OpenAI with a custom endpoint is a one-file change:

- **`LLMProvider`** (`lib/llm/types.ts`) — `send({ messages, model, apiKey, signal }) → string`.
  DeepSeek is the real default; Claude/OpenAI/Gemini are mocks for now.
- **`EmbeddingProvider`** (`lib/embeddings/types.ts`) — `embed(texts, { apiKey, signal }) → Float32Array[]`.
  OpenAI `text-embedding-3-small` is the only impl.

API keys are stored per-provider in secure storage and read at call time; they are
never written to disk in plaintext or committed.

## Component / responsibility map

| Component | Owns |
|---|---|
| `_layout` | Font loading, provider tree, the Drawer + per-screen header options |
| `ChatScreen` (`app/index.tsx`) | Send loop, abort/stop, header **index** button, completion notification |
| `SettingsScreen` (`app/settings.tsx`) | Choose provider+model; save/clear API keys |
| `DrawerContent` | List/switch/delete sessions; new chat; open Settings |
| `MessageBubble` | Render a message — Markdown + copy for assistant, plain for user |
| `ChatInput` | Compose + submit; shows stop while generating |
| `SessionsContext` | Session CRUD, persistence, lazy creation + auto-title |
| `SettingsContext` | Provider/model state, key presence, key read/write |

## Data flow — sending a message

```
ChatInput.onSend(text)
  → SessionsContext.addUserMessage(text)        # creates+titles session on first turn
  → ensureNotificationPermission()              # prompt while foreground
  → provider.send({ history, model, apiKey })   # DeepSeek (OpenAI-compatible POST)
  → SessionsContext.addAssistantMessage(reply)  # rendered as Markdown
  → if app backgrounded: notifyResponseReady(preview)   # local notification
```

A stop button aborts the in-flight request via `AbortController`.

## Data flow — embedding index (manual)

> **Frozen:** kept as-is and updated only on the manual button. Superseded going forward
> by the entity Knowledge Store (see "Planned" below) as the primary knowledge layer.

Triggered by the **refresh icon in the chat header** (per session — no timers/background):

```
indexSession(session)
  → build transcript
  → if transcript > ~28k chars: summarize via the active LLM
  → embeddingProvider.embed(text)               # OpenAI text-embedding-3-small
  → db.insertIndexRow(...)                       # append snapshot
```

`session_index` is append-only — each re-index of a session inserts a new row with the
same `session_id` and an incremented `index_id`, giving a version history of that
conversation's embedding over time:

```
session_index(
  session_id, index_id,           -- PK; index_id increments per re-index
  session_text,                    -- full transcript snapshot
  embedded_text, summarized,       -- exact text embedded (transcript or summary)
  embedding BLOB, dim, embed_model,
  created_at
)
```

## Build & run

- **Dev (Expo Go or dev build):** `npx expo start` → scan QR / press `i`.
- **Standalone on device (current):** `npx expo run:ios --device --configuration Release`
  (free Apple ID; app valid ~7 days, then rebuild).
- Native folders (`/ios`, `/android`) are git-ignored and regenerated by `expo prebuild`.
- After adding/removing a native module, wipe Pods + DerivedData before rebuilding to
  avoid Fabric codegen link errors (`facebook::react::Sealable` undefined):
  `rm -rf ios/Pods ios/build ios/Podfile.lock ~/Library/Developer/Xcode/DerivedData/Madad-* && npx pod-install`.

## Planned — Agents, Knowledge Store & Documents (design, not yet built)

> Direction agreed June 2026. **Layered onto the existing app — no rewrite, staying RN/Expo**
> (Grok's spec floated Flutter; rejected). On-device now; a backend ("agents and/or the graph
> on a server") is deferred and reachable via reserved per-row `sync_*` fields. **On-device LLM
> inference is out of scope** — the `LLMProvider` seam already gives model-agnosticism with
> remote providers.

### Memory layers (revised)

```
L1  Sessions        raw transcripts             AsyncStorage      (have)
L2  session_index   coarse per-session vectors  expo-sqlite       (FROZEN — manual button only)
L3  Knowledge Store entities + relationships     expo-sqlite       (NEW — primary knowledge layer)
        ▲
    Agents (Orchestrator → Memory) read L3 (+L2) and answer via the LLM
```

"In-memory" = the **agent runtime + graph working-set at query time**; the graph is **persisted in
SQLite** (a knowledge store shouldn't evaporate on restart).

### Knowledge Store (entities + relationships, expo-sqlite)

JSON `properties`, Float32 `embedding` BLOB (same pattern as `session_index`), with
provenance / confidence / version, and `sync_*` fields reserved for a future backend.

```
entities(id, user_id, entity_type, properties JSON, summary, text, embedding BLOB,
         tags JSON, confidence, status, version, source_chat_id, source_message_id,
         created_by, created_at, updated_at[, sync_status, cloud_id])
relationships(id, from_entity_id, to_entity_id, relationship_type, properties JSON,
              confidence, created_by, created_at)
```

Entities are created two ways in Phase 1 — **both user-driven** (the Memory agent does *recall*,
not auto-extraction, for now):
- **Document upload** → a `document` entity (see below).
- **"Author this answer"** → a user-authored `knowledge` entity from an assistant message
  (icon beside the copy icon; `created_by: user`, high confidence, embedded for recall).

### Agents

| Piece | Role |
|---|---|
| **Orchestrator** | Entry point for every query; plans, delegates, composes the final answer |
| **Memory agent** | Recall — semantic (embeddings) + graph traversal over the Knowledge Store; returns context |
| **Domain agents** (later) | Sit *between* orchestrator and memory; orchestrator routes by query type. e.g. *healthcare* = high-precision / no creativity; *poem* = creative |

Each agent = `{ id, label, systemPrompt, model, behaviorProfile (precision↔creativity → sampling
params where supported), tools, memoryAccess }`. Configs live in code for v1 (user-editable later).
DeepSeek supports OpenAI-style function-calling, so the tool-using loop is viable on the current provider.

New seams (same swap pattern as LLM/Embedding): **`GraphStore`** (upsert / neighbors(depth) /
search(text) / snapshotForPrompt(focus)), **`AgentRuntime`** (run(agent, input, {graph, llm})),
**`ToolRegistry`**, **`OCRProvider`**.

### Documents (first-class)

```
upload (expo-document-picker / expo-image-picker) in chat
  → store physical file in the app sandbox, per session (expo-file-system)
  → artifact row (file metadata; twin for the future File Explorer)
  → document entity (canonical for recall): properties{ file_path, mime, size, pages, ... }
  → OCRProvider.recognize(file) → extracted text into entity.text (+ embedding)
  → Memory agent can now recall the document
```

```
artifacts(id, user_id, filename, file_path, mime_type, file_size, source_chat_id,
          source_entity_id, artifact_type, tags, summary, embedding, folder_path,
          is_favorite, created_by, created_at, updated_at)
```

Artifacts table + sandbox storage come **now**; the **File Explorer UI is deferred**.

**Open decision — OCR engine:** on-device (iOS Vision / ML Kit — offline, clean on images,
PDFs need a render/extract step) vs cloud (Textract / Google Vision — robust on PDFs & scans,
extra key, data leaves device) vs vision-LLM. Behind the `OCRProvider` seam regardless.

### Suggested build order

1. `entities` + `relationships` tables + `GraphStore` seam (in-memory runtime over SQLite)
2. Document upload → file + artifact + `document` entity + OCR text + embedding
3. "Author this answer" entity action (icon beside copy)
4. Orchestrator + Memory agent (recall) + hybrid retrieval-augmented answer
5. Domain agents + routing; then File Explorer UI; then backend sync

## Still deferred

- **KNN search UI** over stored vectors (vectors exist; nothing reads them yet).
- **Streaming** chat responses (currently non-streaming).
- **Custom API endpoint** replacing DeepSeek/OpenAI (the provider seams are ready).
- **Backend** for agents/graph (on-device for now; `sync_*` fields are the hook).
- **Bulletproof background notifications** for long replies (server push or a native
  background-task assertion) — local notifications only fire within iOS's ~30s grace window today.
- **File Explorer UI**; **on-device LLM** inference.


ARCHITECTURE.md now carries the full agreed design — a clearly-flagged "Planned — Agents, Knowledge Store & Documents" section (revised memory-layer diagram, entities/relationships + artifacts schemas, the Orchestrator→Memory agent model with per-agent behavior profiles, the document→OCR→entity pipeline, the "author this answer" path, the new seams, and a build order), session_index marked frozen, and Flutter explicitly rejected. Memory updated too.

We're aligned on the big stuff. The plan is gated on three answers before I'd write code — re-surfacing tightly:

1. OCR engine (the real fork): on-device ML Kit / cloud (Textract·Vision) / vision-LLM? — behind an OCRProvider seam either way. My lean: cloud or vision-LLM first for PDF/scan quality, on-device offline later.
2. Document split: document entity = canonical for recall (path + OCR text + embedding), artifact row = its file-system twin for the later Explorer. ✅?
3. "Author this answer": create the entity immediately on tap, or pop a quick title/type prompt? My lean: immediate, optional title later.

Answer those and I'll start the build order — Step 1 is entities/relationships + the GraphStore seam, which is self-contained and needs no rebuild. Where do you and Grok differ from these leans?

```
