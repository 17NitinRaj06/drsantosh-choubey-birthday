# Santosh Choubey — 71st Birthday Tribute

A ceremonial, editorial-print-design-inspired birthday tribute website for Santosh Choubey, Founder and Chairman of AISECT Group and Chancellor of the university network he built.

> "एक दीप से अनेक दीप" — From one lamp, many lamps.

---

## Architecture

```
santosh-choubey-birthday-site/
├── frontend/                  Next.js 16 static site (App Router, TypeScript, Tailwind v4)
│   ├── src/app/               Pages: /, /send, /display, /admin
│   ├── src/components/        17 UI components (Cover, ChatStream, Gallery, etc.)
│   ├── src/lib/               Config, content data, WebSocket client, API client
│   ├── public/images/         WebP photographs from santoshchoubey.com
│   └── scripts/               Prebuild image verification & recovery
│
├── realtime-service/          Fastify + WebSocket + MongoDB service
│   ├── src/                   TypeScript source (db, ws, admin, profanity filter)
│   └── dist/                  Compiled JavaScript
│
├── content.json               Verified facts, timeline, awards, image manifest
├── render.yaml                Render deployment blueprint
└── .env.example               Environment variable template
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (static export), React 19, TypeScript, Tailwind CSS v4 |
| Realtime | Fastify 5, ws (WebSocket), MongoDB 6 |
| Database | MongoDB Atlas (free M0 tier) |
| Deployment | Render (Static Site + Web Service) |
| Fonts | EB Garamond, Inter, Noto Serif/Sans Devanagari (self-hosted via `next/font`) |
| Virtualization | `@tanstack/react-virtual` for large wish lists |

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free M0 cluster)

### 1. Realtime Service

```bash
cd realtime-service
cp .env.example .env
# Edit .env — set MONGODB_URI to your Atlas connection string
npm install
npm run build
npm start
# → http://localhost:3001
```

Verify:
```bash
curl http://localhost:3001/healthz
npm run db:check
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Set NEXT_PUBLIC_WS_URL=ws://localhost:3001
# Set NEXT_PUBLIC_URL=http://localhost:3000
npm install
npm run dev
# → http://localhost:3000
```

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Main tribute — 10-chapter editorial layout, live wishes, gallery |
| `/send` | Mobile-optimized form to submit birthday wishes |
| `/display` | Stage/projector view — high contrast, large type, 10m legibility |
| `/admin` | Admin panel — moderate wishes, toggle live stream, export data |

## Key Features

- **Editorial Design** — Swiss grid meets Indian print heritage: large serif type, quiet margins, thin rules, measured ornament
- **Live Wishes** — Real-time WebSocket stream with YouTube Live chat-style overlay and sidebar rail
- **Virtualized List** — `@tanstack/react-virtual` renders thousands of wishes without jank
- **QR Code** — Scan-to-send wishes from any phone (via `api.qrserver.com`)
- **Bilingual** — English/Hindi toggle throughout (Devanagari + Latin scripts)
- **Accessibility** — WCAG AA contrast, keyboard navigation, ARIA labels, `prefers-reduced-motion` support
- **Grain Texture** — SVG-based paper grain overlay for print aesthetic
- **Scroll Reveal** — IntersectionObserver-based section animations (GPU-accelerated `transform` + `opacity`)
- **Admin Panel** — Password-protected wish moderation with live toggle and JSON/CSV export

## Environment Variables

### Frontend (Static Site)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_WS_URL` | Yes | WebSocket URL (`wss://`) of realtime service |
| `NEXT_PUBLIC_API_URL` | No | HTTP API URL (derived from `WS_URL` if unset) |
| `NEXT_PUBLIC_URL` | Yes | Public URL of the static site |

### Realtime Service (Web Service)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `MONGODB_DB` | No | Database name (default: `wishes`) |
| `ADMIN_PASSWORD` | Yes | Password for `/admin` panel (routes disabled if empty) |
| `ALLOWED_ORIGIN` | Yes | Comma-separated CORS origins (must include static site URL) |
| `PORT` | No | Server port (default: `3001`) |

## Deployment (Render)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → **Blueprint**
3. Select the repo — `render.yaml` auto-configures both services
4. Set environment variables in the Render dashboard
5. Deploy

### Post-Deploy Checklist

- [ ] Set `NEXT_PUBLIC_WS_URL` to your realtime service's `wss://` URL
- [ ] Set `NEXT_PUBLIC_URL` to your static site's URL
- [ ] Set `ADMIN_PASSWORD` for the admin panel
- [ ] Set `ALLOWED_ORIGIN` to your static site's URL
- [ ] Test WebSocket connection from `/send` page
- [ ] Test QR code on a real phone
- [ ] Verify `/display` works on a projector
- [ ] Test admin login at `/admin`

### Free-Tier Stay-Awake Strategy

- Open pages send WebSocket pings every 4 minutes
- External uptime monitor hits `/healthz` every 5 minutes
- Calm "Connecting..." state with exponential backoff for cold starts (~1 min)

## MongoDB Atlas Setup

1. Create a free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user with `readWrite` access to the `wishes` database
3. Under Network Access, add `0.0.0.0/0` (Render uses dynamic IPs)
4. Get the connection string: Database → Connect → Drivers → Connection string
5. Set `MONGODB_URI` in Render dashboard (never commit real credentials)

### DB Size Guard

The realtime service monitors MongoDB storage automatically:

- **400MB threshold** — exports oldest 30% of messages to `backups/` (JSON + CSV), then deletes them
- **450MB threshold** — critical alert logged
- **Hourly check** — runs on startup + periodic interval
- **Health endpoint** — `GET /healthz` includes current DB size stats

### Exporting Wishes

```bash
# JSON
curl -H "Authorization: Bearer <token>" https://your-service.onrender.com/api/admin/export > wishes.json

# CSV
curl -H "Authorization: Bearer <token>" "https://your-service.onrender.com/api/admin/export?format=csv" > wishes.csv
```

### Rotating the Admin Password

1. Generate a new strong password
2. Update `ADMIN_PASSWORD` in Render dashboard
3. All existing sessions are invalidated immediately (tokens are in-memory only)

## Design Tokens

| Token | Value | Use |
|-------|-------|-----|
| Paper | `#F6F0E4` | Primary background |
| Stone | `#EFE6D4` | Secondary surfaces |
| Fog | `#E8DCC5` | Chapter backgrounds |
| Sage | `#E3E2D6` | Chapter backgrounds |
| Ink | `#1F1A17` | Primary text |
| Night | `#221915` | Dark chapter backgrounds |
| Ivory | `#F3EBDD` | Text on dark backgrounds |
| Madder | `#9E3B25` | Accent, LIVE dot, buttons |
| Lamp | `#C99A3E` | Decorative accent |

## Content & Data

All facts, dates, quotes, and numbers are sourced from [santoshchoubey.com](https://santoshchoubey.com/).

- `content.json` — verified dataset (also checked by prebuild script)
- `content.ts` — runtime content consumed by React components

### Image Management

| Script | Purpose |
|--------|---------|
| `scripts/prebuild-images.cjs` | Runs before `next build`; fails build if any referenced image is missing |
| `scripts/recover-images.cjs` | Crawls santoshchoubey.com to re-download missing images |

```bash
cd frontend
node scripts/recover-images.cjs --download     # Re-download all images
node scripts/recover-images.cjs --verify-only  # Check without downloading
```

### Image Credits

All photographs: santoshchoubey.com (used with permission from site owner)

## Build & Performance

### Output

| Metric | Value |
|--------|-------|
| Total output | ~9 MB (169 files) |
| JS bundles | ~587 KB (compressed) |
| CSS | ~42 KB |
| Fonts | ~590 KB (20 woff2 files, unicode-range subsetted) |
| Images | ~7.5 MB (WebP + JPEG) |

### Optimizations Applied

- **Self-hosted fonts** via `next/font/google` with `font-display: swap` and unicode-range subsetting
- **Reduced font weights** — EB Garamond (400, 600), Inter (variable), Noto Serif Devanagari (400), Noto Sans Devanagari (400)
- **Hero image** — WebP format (25KB vs 66KB JPEG), `fetchPriority="high"`, `decoding="async"`
- **Lazy loading** — below-fold images use `loading="lazy"` + `decoding="async"`
- **GPU-accelerated animations** — all scroll reveals and transitions use `transform` + `opacity` only
- **Reduced motion** — `prefers-reduced-motion: reduce` disables all animations
- **Grain texture** — inline SVG data URI (no network request)
- **Prebuild image verification** — catches missing images before deployment

## Project Structure

```
frontend/src/
├── app/
│   ├── page.tsx              Main tribute page
│   ├── layout.tsx            Root layout (fonts, metadata)
│   ├── globals.css           Design tokens, utilities, animations
│   ├── send/page.tsx         Wish submission form
│   ├── display/page.tsx      Stage/projector view
│   └── admin/page.tsx        Admin moderation panel
├── components/
│   ├── Cover.tsx             Hero section with portrait
│   ├── ChapterSection.tsx    Editorial chapter layout
│   ├── ChatStream.tsx        Live wish stream overlay
│   ├── WishesWall.tsx        Virtualized wish list
│   ├── GallerySection.tsx    Photo grid with lightbox
│   ├── InstitutionsSection.tsx  University network
│   ├── LiteratureAwards.tsx  Awards & recognition
│   ├── ImpactSection.tsx     Statistics with count-up
│   ├── WordsOfAppreciation.tsx  Quotes from dignitaries
│   ├── IntroAnimation.tsx    Opening diya animation
│   ├── ScrollReveal.tsx      IntersectionObserver wrapper
│   ├── CountUp.tsx           Animated number counter
│   ├── ContentsPill.tsx      Chapter navigation
│   ├── LanguageToggle.tsx    EN/HI toggle
│   ├── QRCode.tsx            QR code generator
│   ├── StreamLanes.tsx       Chat lane layout
│   └── Footer.tsx            Page footer
└── lib/
    ├── config.ts             Environment variable reads
    ├── content.ts            All content data (chapters, awards, quotes, etc.)
    ├── api.ts                REST API client
    ├── websocket.ts          WebSocket client
    ├── RealtimeContext.ts    React context for live messages
    └── RealtimeProvider.tsx  WebSocket provider with dedup & reconnect

realtime-service/src/
├── index.ts                  Fastify server, routes, DB size guard
├── db.ts                     MongoDB operations, backup/export
├── ws.ts                     WebSocket handler, broadcast, message ordering
├── admin.ts                  Admin auth & moderation endpoints
├── profanity.ts              Word filter
└── scripts/                  DB check utilities
```

## License

Tribute website for Santosh Choubey. Content &copy; santoshchoubey.com. Photographs: santoshchoubey.com.
