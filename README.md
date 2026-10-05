# Roadtrain: Australia's freight exchange

A next-generation freight broker and load board for **Australia only**, modelled on how US and Canadian digital freight marketplaces work. Shippers post loads and choose the trucking companies they want. Verified Australian carriers quote, book, deliver and get paid.

## Two modes

| Mode | What it is | Data |
| --- | --- | --- |
| **Demo** (default) | Static website with an "Acting as" switcher | Each visitor's browser (`localStorage`) |
| **Live** (`VITE_API_URL` set) | Real accounts, log in / log out, everyone shares the same marketplace | SQLite database on the API server |

## Run it locally

```bash
npm install
npm test              # domain + API tests

# Demo mode
npm run dev           # http://localhost:5173

# Live mode (two terminals)
npm run dev:api       # API on http://localhost:8080 (seeds sample companies)
npm run dev:live      # website on http://localhost:5173, /api proxied to the API
```

Sample logins (password `roadtrain-demo`): `freight@coastalproduce.example` (shipper), `ops@harbourcitylogistics.example`, `ops@coldchaincouriers.example` (carriers).

## Deploy

**Live site + API in one container (recommended).** The `Dockerfile` builds the website in live mode and serves it from the API server, so there's one domain and no CORS.

- **Render:** New → Blueprint → pick this repo. `render.yaml` creates the service, a persistent disk for the database and a random `JWT_SECRET`. The region is Singapore, the closest to Australia.
- **Fly.io / Railway / any Docker host:** deploy the `Dockerfile`, mount a volume at `/data`, and set `JWT_SECRET` (e.g. `openssl rand -hex 32`).

**Static demo only.** These need no server:
- **Netlify:** import the repo (it uses `netlify.toml`).
- **Vercel:** import the repo (it uses `vercel.json`).
- **GitHub Pages:** go to Settings → Pages → Source: GitHub Actions, then push to `main` (`.github/workflows/pages.yml`).

To point a static host at a separately deployed API, set `VITE_API_URL=https://your-api.example/api` at build time and `CORS_ORIGIN=https://your-site.example` on the API.

Environment variables are listed in `.env.example`. CI (`.github/workflows/ci.yml`) runs tests and both builds on every push.

## API

All endpoints are under `/api`. Mutations need `Authorization: Bearer <token>` from login or register.

| Method | Path | Who |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | anyone (rate-limited) |
| GET | `/state` | anyone. Returns only what the caller may see |
| POST | `/loads` | shipper |
| POST | `/loads/:id/invite`, `/loads/:id/cancel` | owning shipper, open loads |
| POST | `/quotes/:id/accept`, `/quotes/:id/decline` | owning shipper |
| POST | `/loads/:id/quotes`, `/loads/:id/book` | carrier who can see the load |
| POST | `/loads/:id/pickup`, `/loads/:id/deliver` | booked carrier |

The server re-checks every rule. Invite-only loads stay hidden from carriers who weren't invited, contact details stay private, pickup and delivery must be Australian, and ABNs, postcodes and phone numbers are validated. Passwords are hashed with scrypt.

## What's inside

| Page | What it does |
| --- | --- |
| `/` Home | 3D WebGL Australia (extruded continent, pulsing dot-matrix surface, glowing freight arcs, bloom), instant quote widget, holographic 3D B-double, flip cards, tilt/glare cards, magnetic buttons, scroll reveals |
| `/loads` Load board | Filter by state, equipment and $/km. Backhaul finder ranks loads by deadhead km. Carriers can **Book now** or quote |
| `/loads/:id` Load detail | Cost breakdown (linehaul, fuel levy, Bass Strait, GST), unit economics, market-band position, route legs, per-load compliance checklist, documents, quotes |
| `/carriers` Directory | Filter by state, equipment, ABN-verified or NHVAS. **Select carriers** and send them an invite-only load |
| `/carriers/:id` Profile | Fleet, on-time %, insurance, compliance, lanes, reviews |
| `/post` Post a load | 4-step wizard with live AUD pricing, NHVR mass and road-train warnings, public vs selected-carriers audience |
| `/dashboard` | Shipper: quote inbox, accept/decline, loads. Carrier: invitations, quotes, jobs, pickup, e-POD |
| `/track` | Live 3D route tracking with milestones (compressed demo time) |
| `/join` | Sign-up limited to Australia: ABN checksum, postcode-to-state match, AU phone format |
| `/guide` | Knowledge hub: workflows, load lifecycle, pricing formula, payments and GST, verification, HVNL/CoR/fatigue/load restraint/DG, equipment specs, corridors, seasons, glossary, FAQ |

Use the **"Acting as"** switcher in the nav to swap between shipper and carrier accounts and walk the full flow.

## Australia-specific rules built in
- ABN validation (ATO weighted checksum), postcode ranges per state/territory, Australian phone formats
- Australian combinations (rigid, tautliner, reefer, B-double, road train, side-loader…) with payload limits
- Road-train network warnings, overweight warnings, Bass Strait routing via Geelong–Devonport with surcharge
- AUD pricing ex GST, with GST (10%) shown separately

## Still to do before a commercial launch
- ABR (ABN Lookup) and NHVR checks to turn accounts "verified" automatically
- Real road routing and distances from a maps API
- Truck GPS or telematics for tracking. Demo tracking uses compressed time
- Payments (e.g. Stripe AU / direct debit) and tax invoices
- Email verification and password reset
- Managed Postgres instead of SQLite once traffic grows
- Placeholder marketing stats on the home page need replacing

All sample companies, ABNs and statistics are fictitious.
