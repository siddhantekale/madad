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

## Deferred / roadmap

- **KNN semantic search** over `session_index` (the vectors are stored; nothing reads them yet).
- **Streaming** chat responses (currently non-streaming).
- **Custom API endpoint** to replace DeepSeek/OpenAI (the provider seams are ready).
- **Bulletproof background notifications** for long replies (server + remote push, or a
  native background-task assertion) — local notifications only fire within iOS's ~30s
  background grace window today.
```
