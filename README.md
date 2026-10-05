# Roadtrain: Australia's freight exchange

A next-generation freight broker and load board for **Australia only**, modelled on how US and Canadian digital freight marketplaces work. Shippers post loads and choose the trucking companies they want. Verified Australian carriers quote, book, deliver and get paid.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # domain logic tests (ABN, postcodes, pricing, routing)
npm run build
```

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

## Demo notes
All companies, ABNs and statistics are fictitious demo data, stored in the browser's `localStorage` (reset from the footer). For production you'd add a backend (auth, Australian-hosted DB), ABR/NHVR lookups, real routing (e.g. a maps API), telematics tracking and payments.
