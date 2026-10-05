import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Reveal, Tilt } from '../components/fx.jsx';
import { EQUIPMENT, FERRY_SURCHARGE, FUEL_LEVY, MIN_CHARGE } from '../lib/au.js';

const SECTIONS = [
  ['overview', 'Overview'],
  ['shippers', 'For shippers'],
  ['carriers', 'For carriers'],
  ['lifecycle', 'Load lifecycle'],
  ['pricing', 'How pricing works'],
  ['payments', 'Payments & GST'],
  ['verification', 'Verification'],
  ['compliance', 'Compliance & law'],
  ['equipment', 'Equipment specs'],
  ['corridors', 'Freight corridors'],
  ['seasonal', 'Seasons & conditions'],
  ['glossary', 'Glossary'],
  ['faq', 'FAQ'],
];

// Indicative Australian combination limits (general access, GML). Always confirm with the NHVR or state agency.
const SPECS = {
  rigid: ['Up to 12.5 m', '22.5 t GVM (3-axle)', 'General access'],
  'semi-taut': ['19 m', '42.5 t GCM (6-axle)', 'General access'],
  'semi-reefer': ['19 m', '42.5 t GCM (6-axle)', 'General access'],
  'flat-top': ['19 m (wider loads need permits)', '42.5 t GCM', 'General access / OSOM permit'],
  'b-double': ['Up to 26 m', '62.5 t GML · 68 t HML (9-axle)', 'B-double network'],
  'road-train': ['36.5 m (Type 1) · 53.5 m (Type 2)', '~79 t (A-double) to ~115 t+', 'Road-train network only'],
  tipper: ['19 m (truck & dog)', '42.5–50.5 t GCM', 'General / PBS access'],
  tanker: ['19–26 m', '42.5–68 t (semi to B-double)', 'Plus DG rules if applicable'],
  'side-loader': ['19 m', '42.5 t GCM', 'General access; container weight declaration'],
};

const CORRIDORS = [
  ['Hume Highway', 'Sydney ↔ Melbourne', '~880 km', 'The busiest freight corridor in the country. Overnight linehaul, heavy B-double use, tolls at both ends.'],
  ['Pacific & Newell Highways', 'Sydney / Melbourne ↔ Brisbane', '~920–1,700 km', 'The Pacific runs along the coast. The inland Newell (via Dubbo and Goondiwindi) is preferred by B-doubles for Melbourne–Brisbane.'],
  ['Bruce Highway', 'Brisbane ↔ Cairns', '~1,700 km', 'North Queensland supply line. Wet-season flooding closes sections, so build buffer days from December to April.'],
  ['Stuart Highway', 'Port Augusta ↔ Darwin', '~2,700 km', 'The spine of the Territory. Road trains run north of Port Augusta, and long stretches have no services.'],
  ['Eyre & Great Eastern Highways', 'Adelaide ↔ Perth', '~2,700 km', 'Crosses the Nullarbor. Rail competes strongly, and road wins on time-critical and smaller consignments.'],
  ['Great Northern Highway', 'Perth ↔ Port Hedland', '~1,640 km', 'Resources haulage to the Pilbara. Road trains, oversize mining equipment and fuel tankers.'],
  ['Bass Strait', 'Geelong ↔ Devonport', 'Overnight sea', 'All interstate Tasmanian road freight crosses by sea: Spirit of Tasmania for trucks and trailers, or dedicated freight vessels from Melbourne.'],
];

const GLOSSARY = [
  ['ABN', 'Australian Business Number. An 11-digit identifier issued by the Australian Business Register. Required for every account.'],
  ['Backhaul', 'A load taken on the return trip so the truck doesn’t run home empty.'],
  ['BFM / AFM', 'Basic and Advanced Fatigue Management. NHVAS fatigue modules that allow longer work hours than standard hours under audited controls.'],
  ['B-double', 'A prime mover towing two semi-trailers joined by a fifth wheel on the lead trailer. Usually up to 26 m.'],
  ['CoR', 'Chain of Responsibility. Under the HVNL, everyone in the supply chain (consignors, loaders, schedulers, receivers) shares legal responsibility for safety.'],
  ['Con note', 'Consignment note. The transport document describing the freight, parties and instructions.'],
  ['Deadhead', 'Kilometres driven empty, for example from the last drop to the next pickup.'],
  ['Detention', 'Paid waiting time when loading or unloading runs past the agreed free time.'],
  ['e-POD', 'Electronic proof of delivery, signed by the receiver at drop-off.'],
  ['FTL / LTL', 'Full truckload and less-than-truckload (part load, shared with other freight).'],
  ['GML / CML / HML', 'General, Concessional and Higher Mass Limits. Each step allows more mass with accreditation or on approved routes.'],
  ['GCM / GVM', 'Gross Combination Mass and Gross Vehicle Mass. The total loaded weight of the combination or single vehicle.'],
  ['HVNL', 'Heavy Vehicle National Law. Applies in all states and territories except WA and NT.'],
  ['Linehaul', 'The long-distance trunk movement between cities or depots.'],
  ['NHVAS', 'National Heavy Vehicle Accreditation Scheme, with modules for mass, maintenance, BFM and AFM.'],
  ['NHVR', 'National Heavy Vehicle Regulator. Administers the HVNL, access permits and accreditation.'],
  ['OSOM', 'Oversize and over-mass. Loads that exceed standard dimension or mass limits and need permits or notices.'],
  ['PBS', 'Performance-Based Standards. A scheme that approves innovative, higher-productivity vehicle designs.'],
  ['Tautliner', 'A curtain-sided trailer that loads from the side or rear. The standard Australian general-freight trailer.'],
];

const FAQ = [
  ['Can a business outside Australia join?', 'No. Roadtrain is limited to Australian businesses. Every account needs a valid ABN, an Australian address with a matching state and postcode, and an Australian phone number. Loads must start and finish inside Australia.'],
  ['How do I send a load only to the carriers I choose?', 'When posting, set the audience to “Selected carriers only” and tick the carriers. Or go to the Carrier directory, select carriers, and post or invite from the tray at the bottom. Invite-only loads are hidden from everyone else.'],
  ['What is the difference between “Book now” and a quote?', 'Book now accepts the shipper’s posted target rate and books the load immediately. A quote is a counter-offer at a different price or with conditions, and the shipper decides whether to accept it.'],
  ['How is the market rate calculated?', 'Distance × an equipment base rate per km, adjusted for haul length and payload use, plus the Bass Strait crossing where needed, with a minimum charge. You see a low–mid–high band. See “How pricing works” for the exact steps.'],
  ['Are prices shown with or without GST?', 'Rates on the board are ex GST. Detail pages and invoices show the 10% GST and the GST-inclusive total separately.'],
  ['When do carriers get paid?', 'Quick-pay releases payment 2 business days after the e-POD is signed. Shippers are invoiced on their account terms (typically 30 days).'],
  ['Who is responsible under Chain of Responsibility?', 'Everyone who influences the transport task. As a shipper (consignor) you must declare accurate weights and dimensions and must not set schedules that need speeding or breaching fatigue limits. Carriers are responsible for the vehicle, the driver and load restraint.'],
  ['Can I move freight to and from Tasmania?', 'Yes. The platform routes it via Bass Strait (Geelong–Devonport), adds the crossing to the price, and shows the sea leg in the route plan.'],
  ['What happens if a road train is booked into a city?', 'You get a warning when posting. Road trains are limited to the gazetted network, so freight is usually split at a break-down yard (e.g. Port Augusta, Dubbo or Perth outskirts) and finished by semi or B-double.'],
  ['Is my data stored anywhere?', 'In this demo, everything lives in your browser’s local storage. Use “Reset demo data” in the footer to start again. A production build would use an Australian-hosted database.'],
];

function Section({ id, eyebrow, title, children }) {
  return (
    <section id={id} style={{ scrollMarginTop: 110, paddingBottom: 64 }}>
      <Reveal className="stack" style={{ gap: 18 }}>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="h2" style={{ fontSize: 'clamp(1.7rem,3.4vw,2.4rem)' }}>{title}</h2>
        {children}
      </Reveal>
    </section>
  );
}

function Steps({ items }) {
  return (
    <div className="timeline">
      {items.map(([t, body], i) => (
        <div key={t} className="done">
          <span className="node" style={{ display: 'grid', placeItems: 'center', fontSize: '.7rem', color: '#04120c', fontWeight: 700 }}>{i + 1}</span>
          <div>
            <b>{t}</b>
            <p className="muted small" style={{ margin: '4px 0 0' }}>{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="stack" style={{ gap: 10 }}>
      {FAQ.map(([q, a], i) => (
        <div key={q} className="glass" style={{ overflow: 'hidden' }}>
          <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, padding: '18px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: 600 }}>
            {q}
            <motion.span animate={{ rotate: open === i ? 45 : 0 }} style={{ color: 'var(--orange)', fontSize: '1.3rem', lineHeight: 1 }}>+</motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <p className="muted" style={{ margin: 0, padding: '0 20px 18px' }}>{a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function Guide() {
  const [active, setActive] = useState('overview');
  const { hash } = useLocation();
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-30% 0px -60% 0px' },
    );
    SECTIONS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="page">
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">Knowledge hub</span>
          <h1 className="h2">
            The complete guide to <span className="gradient-text">freight on Roadtrain</span>
          </h1>
          <p className="lead">
            How the exchange works end to end, how rates are built, who is responsible for what under Australian heavy-vehicle
            law, and the equipment and corridors that move the country.
          </p>
        </Reveal>

        <div className="guide-layout">
          <nav className="glass guide-toc" aria-label="Guide sections">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }}>
                {label}
              </a>
            ))}
          </nav>

          <div>
            <Section id="overview" eyebrow="01 · Overview" title="A freight exchange in the style of US and Canadian load boards, built for Australia">
              <p className="muted">
                In North America, digital freight marketplaces connect shippers with millions of trucks: load boards, instant
                pricing, carrier vetting, tracking and fast payment. Roadtrain brings that model to Australia and adapts it to
                local conditions: ABN-based identity, AUD pricing with GST, Australian vehicle combinations (B-doubles and road
                trains), the Heavy Vehicle National Law, and the Bass Strait.
              </p>
              <div className="grid grid-3">
                {[
                  ['Shippers', 'Manufacturers, growers, retailers and 3PLs that need freight moved. They post loads and choose carriers.'],
                  ['Carriers', 'Australian trucking companies, from owner-drivers to national fleets. They quote, book and deliver.'],
                  ['Roadtrain', 'Runs the marketplace: matching, pricing, verification, tracking, documents and payment.'],
                ].map(([t, b]) => (
                  <Tilt key={t} className="card"><div className="lift"><h3 className="h3">{t}</h3><p className="muted small" style={{ marginBottom: 0 }}>{b}</p></div></Tilt>
                ))}
              </div>
            </Section>

            <Section id="shippers" eyebrow="02 · For shippers" title="Posting and booking freight, step by step">
              <Steps
                items={[
                  ['Create a verified account', 'Register with your ABN, Australian address and contact details. The ABN is checked straight away, and the account is marked verified after an Australian Business Register lookup.'],
                  ['Get an instant market rate', 'Enter pickup and delivery cities and the equipment type. You see the road distance, typical transit days and a low/mid/high price band, plus any Bass Strait crossing.'],
                  ['Describe the freight', 'Weight in tonnes, Australian-standard pallets (1165 × 1165 mm), commodity and site notes such as forklift availability, booking windows or DG class. If the weight exceeds the combination’s payload, you get a warning.'],
                  ['Choose the audience', 'Publish to the open board so every verified carrier can quote, or make it invite-only and pick specific carriers. Invite-only loads are invisible to everyone else.'],
                  ['Set a target rate', 'Use the market midpoint or set your own. Carriers can book instantly at your rate or send a counter-quote with transit time and notes.'],
                  ['Compare and accept', 'Your quote inbox ranks offers by price and shows each carrier’s rating, on-time %, NHVAS status and insurance. Accepting one books the load and automatically declines the others.'],
                  ['Track and receive', 'Follow the truck live on the 3D map. At delivery the receiver signs an e-POD and the tax invoice is issued.'],
                ]}
              />
            </Section>

            <Section id="carriers" eyebrow="03 · For carriers" title="Finding loads, quoting and getting paid">
              <Steps
                items={[
                  ['Register your fleet', 'Add your ABN, base, fleet size, equipment, insurance cover and NHVAS modules. These all show on your public profile and help shippers pick you.'],
                  ['Search the load board', 'Filter by origin and destination state, equipment and a minimum $/km, then sort by newest, highest rate, best $/km or soonest pickup.'],
                  ['Use the backhaul finder', 'Tell the board where your truck will be empty. Loads are re-ranked by deadhead kilometres to pickup, so you can fill the return leg.'],
                  ['Answer direct invitations', 'Shippers can invite you to private loads. These appear in your dashboard’s Invitations tab and aren’t visible to competitors.'],
                  ['Book now or quote', 'Take the load at the posted rate in one click, or counter-quote. The quote form shows the market band so you can price with confidence.'],
                  ['Run the job', 'Confirm pickup to start live tracking. At delivery, capture the receiver’s name for the e-POD.'],
                  ['Quick-pay', 'Payment is released 2 business days after the e-POD, instead of waiting 30 to 60 days.'],
                ]}
              />
            </Section>

            <Section id="lifecycle" eyebrow="04 · Load lifecycle" title="Every status a load moves through">
              <div className="glass table-wrap">
                <table className="table">
                  <thead><tr><th>Status</th><th>What it means</th><th>Who acts next</th></tr></thead>
                  <tbody>
                    <tr><td><span className="badge open">Open</span></td><td>Posted to the board or to invited carriers, collecting quotes.</td><td>Carriers quote or book. The shipper can invite more or cancel.</td></tr>
                    <tr><td><span className="badge booked">Booked</span></td><td>A rate is agreed with one carrier. The consignment note and rate confirmation are issued.</td><td>The carrier confirms pickup.</td></tr>
                    <tr><td><span className="badge in_transit">In transit</span></td><td>Freight is on board and tracking is live with milestone updates.</td><td>The carrier delivers and captures the e-POD.</td></tr>
                    <tr><td><span className="badge delivered">Delivered</span></td><td>The e-POD is signed. The invoice is issued and quick-pay is queued.</td><td>Both parties rate each other.</td></tr>
                    <tr><td><span className="badge cancelled">Cancelled</span></td><td>Withdrawn by the shipper before booking.</td><td>—</td></tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="pricing" eyebrow="05 · How pricing works" title="The market-rate formula, fully transparent">
              <div className="grid grid-2">
                <div className="glass card stack">
                  <h3 className="h3">Calculation</h3>
                  <div className="kv"><span className="muted">1. Road distance</span><b>Great-circle × 1.22 road factor</b></div>
                  <div className="kv"><span className="muted">2. Base rate</span><b>Distance × equipment $/km</b></div>
                  <div className="kv"><span className="muted">3. Haul length</span><b>&lt;300 km ×1.35 · &lt;1,000 ×1.08 · &gt;2,500 ×0.92</b></div>
                  <div className="kv"><span className="muted">4. Payload use</span><b>×0.92 (empty) to ×1.08 (full)</b></div>
                  <div className="kv"><span className="muted">5. Bass Strait</span><b>+ ${FERRY_SURCHARGE.toLocaleString('en-AU')} where crossed</b></div>
                  <div className="kv"><span className="muted">6. Minimum charge</span><b>${MIN_CHARGE}</b></div>
                  <div className="kv"><span className="muted">7. Band</span><b>Low −12% · High +15%</b></div>
                  <div className="kv"><span className="muted">Fuel levy share</span><b>{Math.round(FUEL_LEVY * 100)}% of the road component</b></div>
                </div>
                <div className="glass card stack">
                  <h3 className="h3">Why rates move</h3>
                  <p className="muted small" style={{ margin: 0 }}>
                    <b>Lane balance.</b> More freight runs north out of Melbourne and Sydney than comes back, so southbound backhauls are cheaper.<br /><br />
                    <b>Diesel.</b> Fuel is the largest variable cost, which is why Australian carriers apply a fuel levy that moves with the diesel price.<br /><br />
                    <b>Seasonality.</b> Harvest (October to January) tightens tipper and B-double capacity. The pre-Christmas retail peak tightens tautliners.<br /><br />
                    <b>Access.</b> Remote and road-train-only areas cost more per km because of long empty returns.<br /><br />
                    <b>Service.</b> Two-up drivers, tail-lifts, timeslot bookings and refrigeration all add cost.
                  </p>
                </div>
              </div>
              <div className="glass table-wrap">
                <table className="table">
                  <thead><tr><th>Equipment</th><th>Base $/km</th><th>Max payload</th><th>Pallets</th></tr></thead>
                  <tbody>
                    {EQUIPMENT.map((e) => (
                      <tr key={e.id}><td><b>{e.name}</b></td><td>${e.rate.toFixed(2)}</td><td>~{e.payload} t</td><td>{e.pallets || 'Bulk'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="payments" eyebrow="06 · Payments & GST" title="Money flow, invoices and tax">
              <div className="grid grid-3">
                {[
                  ['Shipper invoicing', 'Invoiced in AUD after the e-POD, on account terms (typically 30 days). Each tax invoice shows the amount ex GST, the GST and the total inc GST.'],
                  ['Carrier quick-pay', 'Released 2 business days after the e-POD by EFT to an Australian bank account (BSB and account number) held in the carrier’s business name.'],
                  ['GST', 'Domestic freight is a taxable supply, so GST of 10% applies. Rates on the board are shown ex GST so they’re easy to compare. Registered businesses can generally claim the GST back as an input tax credit.'],
                  ['Accessorials', 'Waiting time (detention) beyond the agreed free time, tail-lift, hand-unload, tolls and re-delivery are agreed up front and added to the invoice.'],
                  ['Disputes', 'Shortages or damage must be noted on the e-POD at delivery. Claims are handled against the carrier’s freight insurance.'],
                  ['Cancellations', 'Free before booking. After booking, a cancellation fee may apply if the truck has already been dispatched.'],
                ].map(([t, b]) => (
                  <Tilt key={t} className="card"><div className="lift"><h3 className="h3" style={{ fontSize: '1.1rem' }}>{t}</h3><p className="muted small" style={{ marginBottom: 0 }}>{b}</p></div></Tilt>
                ))}
              </div>
            </Section>

            <Section id="verification" eyebrow="07 · Verification" title="How we keep the marketplace Australian and trustworthy">
              <div className="glass table-wrap">
                <table className="table">
                  <thead><tr><th>Check</th><th>Shippers</th><th>Carriers</th><th>How</th></tr></thead>
                  <tbody>
                    <tr><td>ABN valid & active</td><td>✓</td><td>✓</td><td>Checksum on entry, then an Australian Business Register (ABR) lookup</td></tr>
                    <tr><td>Australian address</td><td>✓</td><td>✓</td><td>State and postcode must match. Pickup and delivery are limited to Australian locations</td></tr>
                    <tr><td>Australian phone</td><td>✓</td><td>✓</td><td>04 mobile, 02/03/07/08 landline, or 1300/1800</td></tr>
                    <tr><td>Insurance certificate</td><td>—</td><td>✓</td><td>Public liability and goods-in-transit cover, with the expiry date monitored</td></tr>
                    <tr><td>NHVAS accreditation</td><td>—</td><td>Optional</td><td>Module numbers shown on the profile (mass, maintenance, BFM, AFM)</td></tr>
                    <tr><td>Chain of Responsibility policy</td><td>Recommended</td><td>✓</td><td>CoR policy and safety management system on file</td></tr>
                    <tr><td>Performance</td><td>Rating</td><td>Rating, on-time %</td><td>Built from completed loads and two-way reviews</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="small dim">Demo build: the ABN checksum, postcode and phone checks run live. ABR, NHVR and insurer lookups are shown as the intended production flow.</p>
            </Section>

            <Section id="compliance" eyebrow="08 · Compliance & law" title="Australian heavy-vehicle rules every party should know">
              <div className="grid grid-2">
                {[
                  ['Heavy Vehicle National Law (HVNL)', 'Covers vehicles over 4.5 t GVM in NSW, VIC, QLD, SA, TAS and the ACT, administered by the NHVR. WA and NT run their own heavy-vehicle laws, through Main Roads WA and the NT Government.'],
                  ['Chain of Responsibility (CoR)', 'Every party in the chain has a primary duty to ensure safety “so far as is reasonably practicable”: consignors, consignees, loaders, schedulers and operators. Shippers must not ask for schedules that need speeding or breaching fatigue limits, and must declare accurate mass.'],
                  ['Mass & dimension limits', 'General Mass Limits apply by default. Concessional and Higher Mass Limits need NHVAS mass accreditation or approved routes. Over-length, over-width or over-mass loads need an NHVR permit or notice and sometimes pilot vehicles.'],
                  ['Fatigue management', 'Fatigue-regulated vehicles (over 12 t GVM) follow standard hours, BFM or AFM. Drivers working more than 100 km from base keep a National Heavy Vehicle Work Diary, written or electronic.'],
                  ['Load restraint', 'Loads must be restrained to the performance standards in the NTC Load Restraint Guide 2018: 0.8 g forward, 0.5 g sideways and rearward, and 0.2 g vertically.'],
                  ['Dangerous goods', 'Transported under the Australian Dangerous Goods (ADG) Code, with placarding, DG licences for drivers and vehicles above placard loads, transport documents, segregation and an emergency information holder.'],
                  ['Container weight declarations', 'Under the HVNL, freight containers need a container weight declaration before road transport.'],
                  ['Biosecurity', 'WA, Tasmania and South Australia restrict entry of some plant products (e.g. fruit fly hosts). Interstate produce may need plant health or assurance certificates.'],
                ].map(([t, b]) => (
                  <Tilt key={t} className="card"><div className="lift"><h3 className="h3" style={{ fontSize: '1.08rem' }}>{t}</h3><p className="muted small" style={{ marginBottom: 0 }}>{b}</p></div></Tilt>
                ))}
              </div>
              <p className="small dim">General information only, not legal advice. Check current requirements with the NHVR, your state road agency and the relevant regulator.</p>
            </Section>

            <Section id="equipment" eyebrow="09 · Equipment specs" title="Australian combinations at a glance">
              <div className="glass table-wrap">
                <table className="table">
                  <thead><tr><th>Equipment</th><th>Typical length</th><th>Mass limit (indicative)</th><th>Payload</th><th>Access</th><th>Best for</th></tr></thead>
                  <tbody>
                    {EQUIPMENT.map((e) => (
                      <tr key={e.id}>
                        <td><b>{e.name}</b></td>
                        <td>{SPECS[e.id][0]}</td>
                        <td>{SPECS[e.id][1]}</td>
                        <td>~{e.payload} t{e.pallets ? ` · ${e.pallets} plt` : ''}</td>
                        <td>{SPECS[e.id][2]}</td>
                        <td className="muted small">{e.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="small dim">Limits vary by axle configuration, tyre fitment, accreditation and route. Confirm with the NHVR or the state agency.</p>
            </Section>

            <Section id="corridors" eyebrow="10 · Freight corridors" title="The highways that carry the country">
              <div className="grid grid-2">
                {CORRIDORS.map(([name, lane, km, body]) => (
                  <Tilt key={name} className="card">
                    <div className="lift stack" style={{ gap: 8 }}>
                      <div className="row between"><h3 className="h3" style={{ fontSize: '1.1rem' }}>{name}</h3><span className="badge open">{km}</span></div>
                      <span className="small" style={{ color: 'var(--orange)' }}>{lane}</span>
                      <p className="muted small" style={{ margin: 0 }}>{body}</p>
                    </div>
                  </Tilt>
                ))}
              </div>
            </Section>

            <Section id="seasonal" eyebrow="11 · Seasons & conditions" title="Plan around Australian weather and demand cycles">
              <div className="glass table-wrap">
                <table className="table">
                  <thead><tr><th>When</th><th>Where</th><th>What happens</th><th>What to do</th></tr></thead>
                  <tbody>
                    <tr><td>Dec – Apr</td><td>NT, North QLD, Kimberley</td><td>Wet season. Floods close the Stuart, Barkly and Bruce highways</td><td>Add buffer days and check road reports before dispatch</td></tr>
                    <tr><td>Oct – Jan</td><td>NSW, VIC, SA, WA wheatbelts</td><td>Grain harvest. Tippers and B-doubles are tight</td><td>Book early and expect higher rates</td></tr>
                    <tr><td>Nov – Dec</td><td>National, east coast</td><td>Retail peak before Christmas</td><td>Lock in capacity on the Hume and Pacific</td></tr>
                    <tr><td>Nov – Mar</td><td>Inland and rural</td><td>Bushfire season. Sudden road closures</td><td>Monitor state emergency apps and allow for re-routing</td></tr>
                    <tr><td>Summer</td><td>National</td><td>Extreme heat stresses perishables</td><td>Use reefers and confirm pre-cooling and temperature logs</td></tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="glossary" eyebrow="12 · Glossary" title="Freight terms, decoded">
              <div className="grid grid-2">
                {GLOSSARY.map(([t, b]) => (
                  <div key={t} className="glass" style={{ padding: 16 }}>
                    <b style={{ color: 'var(--amber)' }}>{t}</b>
                    <p className="muted small" style={{ margin: '4px 0 0' }}>{b}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="faq" eyebrow="13 · FAQ" title="Frequently asked questions">
              <Faq />
              <div className="row" style={{ marginTop: 12 }}>
                <Link to="/post" className="btn btn-primary">Post a load</Link>
                <Link to="/loads" className="btn">Browse the load board</Link>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
