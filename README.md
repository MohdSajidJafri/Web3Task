# WatchSync — YouTube Watch Party System

> Production-ready, real-time synchronized YouTube Watch Party system with strict server-side Role-Based Access Control (RBAC), anti-echo loop protection, sub-second drift compensation, and a participant action approval workflow.

---

## 🌐 Live Deployment
- **Live URL**: `https://youtube-watch-party-r1m5.onrender.com` *(Replace with your deployed Render service URL)*
- **Health Check Endpoint**: `/api/health`

---

## 🚀 Key Highlights & Architectural Strengths

1. **Object-Oriented Backend Architecture (OOP Bonus)**:
   - Clean domain encapsulation with `Participant`, `Room`, `RoomManager`, and `WebSocketHandler`.
   - Authoritative state storage with `getLiveCurrentTime()` accounting for elapsed real-time playback so late joiners sync with sub-second precision.
2. **Shared Video Queue & Participant Suggestions**:
   - Up Next playlist with real-time oEmbed YouTube title resolution, Play Now, Reordering, and Auto-Play when video ends.
   - Participant video suggestion workflow with 1-click Host/Moderator approval.
3. **Strict Server-Side Role-Based Access Control (RBAC)**:
   - Enforces four distinct roles: `Host` (Admin), `Moderator`, `Participant`, and `Viewer`.
   - Includes **Open-Party Mode** toggle allowing all participants to control playback when enabled by Host.
4. **Room Lock Controls & Session Reconnect Grace Period**:
   - Host can lock the room (`isLocked`) to prevent new participants from joining.
   - 15-second server grace period maintains exact roles on brief network drops or page refreshes (`sessionStorage`).
5. **Real-Time Drift & Ping Telemetry & Keyboard Shortcuts**:
   - Twitch-style telemetry health pill (`● SYNCED • 0.08s drift • 24ms`).
   - Floating live animated emoji reactions (`🔥`, `😂`, `😱`, `💜`, `👏`).
   - Clickable chat timestamps (`@MM:SS`) and global keyboard shortcuts (`Space`, `ArrowLeft/Right`, `M`, `F`, `C`).
6. **100% Automated E2E Test Suite (9 Tests)**:
   - Self-contained test harness (`npm test`) using `socket.io-client` testing all 9 critical flows.

---

## 🏗️ System Architecture

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  Browser Client                        │
                                  │   (React + TypeScript + Vite + Tailwind CSS)           │
                                  └───────────────┬────────────────────────▲───────────────┘
                                                  │                        │
                                       WebSocket  │                        │  sync_state,
                                       Events     │                        │  user_joined,
                                       (Action)   │                        │  chat_message
                                                  ▼                        │
┌──────────────────────────────────────────────────────────────────────────┴─────────────────────────┐
│                                     Express & Socket.IO Server                                     │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  WebSocketHandler (Controller)                                                                     │
│  ├── Payload validation & YouTube URL parsing (extractYouTubeVideoId)                              │
│  └── Strict RBAC checks: (canControlPlayback, canManageRoom)                                       │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  RoomManager (Service)                                                                             │
│  └── In-memory room registry, unique 6-char code generation, empty room cleanup                    │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Room (Authoritative Domain Model)                                                                 │
│  ├── videoId, playState ('playing' | 'paused'), currentTime, lastUpdatedAt                         │
│  ├── getLiveCurrentTime(): currentTime + (now - lastUpdatedAt) / 1000                              │
│  ├── Participants Map: userId -> Participant                                                       │
│  ├── Pending Requests Map: requestId -> Request                                                    │
│  └── Automatic Host Re-election upon Host disconnect                                               │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Participant (Model)                                                                               │
│  └── userId, socketId, username, role ('host' | 'moderator' | 'participant' | 'viewer')           │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

| Action / Capability | Host | Moderator | Participant | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| **Play / Pause Video** | ✅ | ✅ | ❌ *(Request only)* | ❌ |
| **Scrub / Seek Timeline** | ✅ | ✅ | ❌ *(Request only)* | ❌ |
| **Change YouTube Video** | ✅ | ✅ | ❌ *(Request only)* | ❌ |
| **Approve / Reject Participant Requests**| ✅ | ✅ | ❌ | ❌ |
| **Assign Roles (`Moderator`, `Participant`)** | ✅ | ❌ | ❌ | ❌ |
| **Transfer Host Role** | ✅ | ❌ | ❌ | ❌ |
| **Remove / Kick Participant** | ✅ | ❌ | ❌ | ❌ |
| **Send Chat Messages** | ✅ | ✅ | ✅ | ✅ |
| **Re-sync Playback Manually** | ✅ | ✅ | ✅ | ✅ |

---

## 📡 WebSocket Event Contracts

### Client to Server

| Event | Payload | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `join_room` | `{ roomId?, username, userId? }` | Public | Join existing room or create a new room (becomes Host). |
| `leave_room` | `{ roomId }` | Member | Leave room; re-elects Host if Host leaves and members remain. |
| `play` | `{ roomId, currentTime? }` | Host / Moderator | Starts video playback from timestamp; updates authoritative state. |
| `pause` | `{ roomId, currentTime? }` | Host / Moderator | Pauses video playback at timestamp. |
| `seek` | `{ roomId, time }` | Host / Moderator | Seeks video to specified timestamp in seconds. |
| `change_video`| `{ roomId, videoId }` | Host / Moderator | Updates video ID (accepts full YouTube URLs or 11-char IDs). |
| `request_control` | `{ roomId, action, payload, label }` | Member | Submits playback or role request for Host/Mod review. |
| `respond_control` | `{ roomId, requestId, approve: boolean }`| Host / Moderator | Approves or rejects a participant's pending request. |
| `assign_role` | `{ roomId, userId, role }` | Host Only | Promotes/demotes participant (`moderator`, `participant`, `viewer`). |
| `remove_participant` | `{ roomId, userId }` | Host Only | Kicks target participant from the room. |
| `transfer_host` | `{ roomId, userId }` | Host Only | Transfers room ownership; demotes old host to moderator. |
| `chat_message` | `{ roomId, text }` | Member | Sends real-time chat message to all room members. |
| `request_sync` | `{ roomId }` | Member | Requests fresh authoritative `sync_state` snapshot. |

### Server to Client

| Event | Payload | Recipients | Description |
| :--- | :--- | :--- | :--- |
| `room_joined` | `{ roomId, userId, username, role, isCreator }` | Sender Socket | Confirms room join details to sender. |
| `sync_state` | `{ roomId, playState, currentTime, videoId, lastUpdatedAt, updatedBy }` | Room Broadcast | Real-time synchronized playback state. |
| `user_joined` | `{ username, userId, role, participants }` | Room Broadcast | Notifies room of new member and updated roster. |
| `user_left` | `{ username, userId, participants }` | Room Broadcast | Notifies room of departing member. |
| `role_assigned` | `{ userId, username, role, participants }` | Room Broadcast | Notifies room of role promotion/demotion. |
| `participant_removed` | `{ userId, username, participants }` | Room Broadcast | Notifies room that a participant was kicked. |
| `kicked` | `{ message }` | Target Socket | Disconnects kicked user and returns them to Lobby. |
| `control_requested` | `{ request, pendingRequests }` | Room Broadcast | Alerts Host/Mods of new pending request. |
| `control_request_resolved`| `{ requestId, approve, request, pendingRequests }` | Room Broadcast | Resolves request and broadcasts updated pending list. |
| `chat_message` | `{ id, roomId, userId, username, role, text, timestamp }` | Room Broadcast | Real-time chat message. |
| `permission_denied` | `{ action, message }` | Sender Socket | Informs client that action was blocked by RBAC. |
| `error` | `{ message }` | Sender Socket | Validation or operational error. |

---

## 🛠️ Tech Stack & Directory Structure

```
Web3Task_Assignment/
├── client/                     # Frontend Application
│   ├── src/
│   │   ├── components/         # Modular React Components
│   │   │   ├── ApprovalBanner.tsx      # Host/Mod 1-click Approval UI
│   │   │   ├── ChatBox.tsx             # Real-time room chat
│   │   │   ├── ControlsBar.tsx         # Play/Pause, scrubber, video URL input
│   │   │   ├── Lobby.tsx               # Room creation & joining
│   │   │   ├── ParticipantsList.tsx    # Roster with role badges & host controls
│   │   │   ├── RequestControlModal.tsx # Participant action request modal
│   │   │   ├── RoomHeader.tsx          # Room code, copy link, role badge
│   │   │   └── YouTubePlayer.tsx       # YouTube IFrame API + anti-echo + drift sync
│   │   ├── services/socket.ts  # Client Socket.IO connection manager
│   │   ├── types/index.ts      # TypeScript interfaces
│   │   ├── App.tsx             # Main container
│   │   └── main.tsx            # React entry
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── server/                     # Backend Application
│   ├── src/
│   │   ├── controllers/
│   │   │   └── WebSocketHandler.js # Event contracts & RBAC gatekeeper
│   │   ├── models/
│   │   │   ├── Participant.js  # Participant entity with permission methods
│   │   │   └── Room.js         # Authoritative room state, sync math, requests
│   │   ├── services/
│   │   │   └── RoomManager.js  # In-memory room management & code generator
│   │   ├── utils/
│   │   │   └── youtube.js      # Robust YouTube URL parser & ID extractor
│   │   └── server.js           # Express + HTTP + Socket.IO server & SPA static hosting
│   ├── test-e2e.js             # Automated E2E test suite (socket.io-client)
│   └── package.json
├── package.json                # Monorepo root scripts
├── render.yaml                 # Render single-service deployment blueprint
├── .env.example
└── README.md
```

---

## 💻 Local Setup & Development

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### 1. Installation
Install all dependencies across root, server, and client with one command:
```bash
npm run install:all
```

### 2. Run in Development Mode
Starts both Express backend (port 5000) and Vite frontend (port 5173) concurrently:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build for Production
Compiles TypeScript and builds client assets into `client/dist`:
```bash
npm run build
```

### 4. Start Production Server
Runs the unified Express + Socket.IO server serving static client files from `client/dist`:
```bash
npm start
```
Open [http://localhost:5000](http://localhost:5000).

---

## 🧪 Automated End-to-End Testing

Run the automated WebSocket integration test suite:
```bash
npm test
```

### Test Coverage (`server/test-e2e.js`)
1. **Room Creation & Joining**: Verifies room code generation, Host role assignment for creator, and Participant role assignment for joiners.
2. **Strict Server-Side RBAC**: Asserts unauthorized `play`, `seek`, and `change_video` from a Participant are blocked with `permission_denied`.
3. **Approval Workflow**: Verifies participant request submission, Host approval, and authoritative `sync_state` broadcast.
4. **Moderator Role Promotion**: Promotes participant to Moderator and verifies immediate execution of playback controls (`pause` and `seek`).
5. **Host Transfer & Kick**: Transfers Host ownership and tests removing a user cleanly with `kicked` event.

---

## ☁️ Deployment Guide (Render)

This repository includes a `render.yaml` blueprint configured for single-service deployment:

1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New** > **Blueprint**.
3. Connect your repository. Render will automatically detect `render.yaml`:
   - **Environment**: Node
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
   - **Health Check**: `/api/health`
4. Once deployed, copy your Render live URL and paste it at the top of this `README.md`.

---

## 💡 Code Walkthrough & Design Decisions

### 1. How WebSockets Enable Real-Time Sync
Unlike HTTP polling, WebSockets provide persistent full-duplex TCP channels. In our implementation:
- The server maintains the **authoritative clock**.
- When `playState === 'playing'`, the server calculates live playback time using `currentTime + (now - lastUpdatedAt) / 1000`.
- Late joiners or re-syncing clients receive the exact calculated timestamp without needing to query other peers.

### 2. Anti-Echo Loop Protection & Drift Compensation
A common pitfall with the YouTube IFrame API is infinite event bouncing:
`sync_state -> player.playVideo() -> onStateChange(PLAYING) -> socket.emit('play') -> sync_state`.
We solved this with a two-tier mechanism:
- **`isProgrammaticUpdateRef`**: Flagged before programmatic calls (`playVideo`, `pauseVideo`, `seekTo`) and reset after 600ms debounce. `onStateChange` discards programmatic triggers.
- **Drift Compensation**: Clients only invoke `player.seekTo()` when local time differs from server time by more than `1.2` seconds.

### 3. Server-Side RBAC Enforcement
Client UI buttons are conditionally disabled for convenience, but the **server is the single source of truth**:
Every handler in `WebSocketHandler.js` evaluates `participant.canControlPlayback()` or `participant.canManageRoom()` before modifying state. If a malicious client manually emits a `play` or `change_video` packet, the backend immediately emits `permission_denied` and discards the payload.

### 4. Trade-Offs & Scalability Path
- **In-Memory vs Database**: For this assignment, room state and participant rosters are stored in memory (`Map<string, Room>`), providing microsecond lookup times without database latency.
- **Horizontal Scaling (Bonus)**: For distributed instances (1,000+ users across multiple servers), `socket.io-redis-adapter` can be plugged into `createServer()` with a Redis Pub/Sub cluster, enabling cross-instance room broadcasting without changing event contracts.
