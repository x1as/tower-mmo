# Tower Defense MMO — Isometric TD + RPG Loot System

**Hybrid Tower Defense + Action RPG** with procedural island map, 8 unique towers, 9 enemy types with resistances, and a deep augment/loot system (32 combinations × 4 rarities).

## 🎮 Live Demo
- **Client (GitHub Pages)**: `https://<your-username>.github.io/tower-mmo/`
- **Server (separate hosting)**: Deploy to Railway/Render/Fly.io

## 🏗 Architecture (Monorepo)

```
tower-mmo/
├── packages/shared          # Shared types, constants, loot math, wave config
├── apps/client              # React 19 + Phaser 3.90 + Vite 7 + Tailwind + Zustand + Socket.io-client
└── apps/server              # NestJS 10 + GraphQL (Apollo) + Socket.io + TypeORM + PostgreSQL
```

### Client (Phaser + React)
- **Isometric 2:1 projection** (128×64 tiles, integer-pixel snapping)
- **Procedural island map**: 14×14 core + chunky extensions with wavy edges
- **3-band depth sorting**: Ground (0-302) → Enemies (400-700) → Structures (800-1102) → UI (1200+)
- **8 Towers**: Cannon, Frost, Beam, Sniper, Tesla, Flame, Poison, Missile — each with unique attack logic
- **9 Enemies**: Each with specific resistances (dodge, armor regen, chain immune, fire immune, DOT cleanse)
- **Augment System**: 8 kinds × 4 rarities = 32 combinations, up to 10 slots per tower
- **Procedural sprite compositing** in BootScene (tower parts → single sprites, spritesheet animations)

### Server (NestJS)
- **GraphQL + Socket.io** for real-time MMO sync
- **PostgreSQL + TypeORM** for persistence
- **JWT Auth** with Passport
- **Game sessions, wave sync, tower placement, loot drops** via Socket.io events

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 22+
- pnpm 10.30.3 (`corepack enable pnpm && pnpm install -g pnpm@10.30.3`)
- Docker (for PostgreSQL)

### Install & Run
```bash
# Clone and install
git clone https://github.com/<your-username>/tower-mmo.git
cd tower-mmo
pnpm install

# Start PostgreSQL
docker-compose up -d

# Build shared package (required first)
pnpm build:shared

# Run both client + server concurrently
pnpm dev:all

# Or separately:
pnpm dev          # Client only → http://localhost:5173
pnpm dev:server   # Server only → http://localhost:3000 (GraphQL playground)
```

### Environment Variables
Create `apps/server/.env`:
```env
DATABASE_URL=postgresql://tower:tower@localhost:5433/tower
JWT_SECRET=your-super-secret-key
PORT=3000
```

## 📦 Build for Production

```bash
# Build everything
pnpm build

# Client output: apps/client/dist/
# Server output: apps/server/dist/
```

## 🌐 GitHub Pages Deployment (Client Only)

The client auto-deploys to GitHub Pages on push to `main`/`master` via GitHub Actions.

### Setup (one-time)
1. **Enable GitHub Pages** in repo Settings → Pages:
   - Source: "GitHub Actions"
2. **Add secret** (optional): `VITE_API_URL` = your deployed server URL
3. **Push to main** → workflow builds and deploys automatically

### Vite Config for GitHub Pages
```typescript
// apps/client/vite.config.ts
const repoName = 'tower-mmo'
export default defineConfig({
  base: `/${repoName}/`,  // Critical for subpath deployment
  // ...
})
```

**Your live URL**: `https://<username>.github.io/tower-mmo/`

## 🖥 Server Deployment (Separate)

The server **cannot** run on GitHub Pages (static hosting only). Deploy to:

| Platform | Command |
|----------|---------|
| **Railway** | `railway up` (auto-detects NestJS) |
| **Render** | Connect repo, build: `pnpm build:server`, start: `node apps/server/dist/main.js` |
| **Fly.io** | `fly launch` (Dockerfile included) |
| **VPS** | `pnpm build:server && node apps/server/dist/main.js` |

Set `VITE_API_URL` in GitHub Actions secret to point to your server.

## 🎨 Assets

- **Isometric tiles/trees/stones**: `apps/client/public/iso/`
- **Tower parts (4 colors × 4 parts)**: Composited at runtime in `BootScene`
- **Procedural sprites**: Generated in `BootScene.create()` via `SpriteGenerator`
- **Spritesheet animations**: Loot orbs (4 rarities × 6 frames), augment particles (8 types × 6 frames)
- **Custom art**: Your Aseprite exports in `public/sprites/` (auto-loaded if present, fallback to procedural)

## 🎯 Gameplay Highlights

| System | Details |
|--------|---------|
| **Waves** | 10 waves/stage, boss every 5th, exponential HP/speed scaling |
| **Loot** | Weighted drops by game stage (common 80% → legendary 1.8%), boss guarantees epic+ |
| **Augments** | Power Crystal, Swift Gem, Far Sight Lens, Chain Link, Frost Shard, Ember Core, Void Stone, Lucky Coin |
| **Economy** | Gold from kills, chest purchases, crafting (5C→1R, 4R→1E, 3E→1L) |
| **Tower Cost** | Duplicate penalty: ×100 per same-type tower |

## 🛠 Tech Stack

| Category | Tech |
|----------|------|
| **Language** | TypeScript 5.9 (strict) |
| **Client** | React 19, Phaser 3.90, Vite 7, Tailwind 3, Zustand, Socket.io-client |
| **Server** | NestJS 10, GraphQL (Apollo), Socket.io, TypeORM, PostgreSQL, JWT |
| **Build** | pnpm workspaces, TypeScript Project References |
| **Deploy** | GitHub Actions → GitHub Pages (client), Railway/Render (server) |

## 📁 Key Files

```
apps/client/src/game/scenes/
├── BootScene.ts      # Asset loading, procedural sprite generation, compositing
├── GameScene.ts      # Core gameplay (1300+ lines): towers, enemies, waves, loot, augments
└── UIScene.ts        # Phaser-based UI (top bar, bottom tower bar, HP, gold, wave controls)

packages/shared/src/
├── constants.ts      # All game balance: towers, enemies, augments, loot table, wave config
├── types.ts          # Shared TypeScript interfaces + Socket.io event types
└── loot-roll.ts      # Weighted loot rolling, boss loot logic
```

## 🤝 Contributing

1. Fork → feature branch → PR
2. Run `pnpm lint` and `pnpm typecheck` before committing
3. Follow conventional commits

## 📄 License

ISC — free for personal/portfolio use.