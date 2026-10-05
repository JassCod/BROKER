import { lazy, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Counter, Magnetic, Reveal, SplitText, Tilt } from '../components/fx.jsx';
import { CityField, Scene } from '../components/ui.jsx';
import { EQUIPMENT, aud, cityByName, estimateRate } from '../lib/au.js';
import { useStore } from '../lib/store.jsx';

const AustraliaScene = lazy(() => import('../three/AustraliaScene.jsx'));
const TruckScene = lazy(() => import('../three/TruckScene.jsx'));

const LANES = ['Sydney → Melbourne', 'Brisbane → Cairns', 'Adelaide → Perth', 'Darwin → Alice Springs', 'Melbourne → Hobart', 'Perth → Port Hedland', 'Brisbane → Sydney', 'Townsville → Mount Isa', 'Wagga Wagga → Port Kembla'];

const FEATURES = [
  { icon: '⚡', title: 'Instant lane rates', body: 'AUD per-km pricing for every Australian combination, from rigid to Type 2 road train. Ferry and GST are shown up front.' },
  { icon: '🎯', title: 'Choose your carriers', body: 'Post to the open board, or send a load as invite-only to the carriers you hand-pick. Your network, your rules.' },
  { icon: '🛡️', title: 'Verified Australian operators', body: 'Every member is ABN-checked. NHVAS accreditation, insurance cover and Chain of Responsibility status are on each profile.' },
  { icon: '🛰️', title: 'Live tracking', body: 'Follow each load across the continent with milestone updates from pickup to proof of delivery.' },
  { icon: '↩️', title: 'Backhaul finder', body: 'Carriers enter where their truck sits empty, and we rank loads by deadhead kilometres so fewer trucks run empty.' },
  { icon: '💸', title: 'Quick pay', body: 'Carriers get paid in 2 business days after e-POD, not 60. Shippers keep their usual 30-day terms.' },
];

function QuickQuote() {
  const [from, setFrom] = useState('Sydney');
  const [to, setTo] = useState('Melbourne');
  const [eq, setEq] = useState('semi-taut');
  const navigate = useNavigate();
  const est = estimateRate({ origin: cityByName(from), destination: cityByName(to), equipmentId: eq, weightT: 16 });
  return (
    <motion.div className="glass quote-widget border-glow" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }}>
      <div className="fields">
        <CityField label="Pickup" value={from} onChange={setFrom} />
        <CityField label="Delivery" value={to} onChange={setTo} />
        <div className="field">
          <label htmlFor="qq-eq">Equipment</label>
          <select id="qq-eq" className="select" value={eq} onChange={(e) => setEq(e.target.value)}>
            {EQUIPMENT.map((e) => (
              <option key={e.id} value={e.id}>
                {e.short}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(`/post?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&eq=${eq}`)}>
          Post it →
        </button>
      </div>
      {est && from !== to && (
        <div className="quote-result">
          <div>
            <span className="small muted">Market rate</span>
            <br />
            <strong className="gradient-text">{aud(est.mid)}</strong>
          </div>
          <div>
            <span className="small muted">Range</span>
            <br />
            <b>
              {aud(est.low)} – {aud(est.high)}
            </b>
          </div>
          <div>
            <span className="small muted">Distance</span>
            <br />
            <b>{est.km.toLocaleString('en-AU')} km</b>
          </div>
          <div>
            <span className="small muted">Transit</span>
            <br />
            <b>
              ~{est.days} day{est.days > 1 ? 's' : ''}
            </b>
          </div>
          {est.ferry && <span className="badge private">Bass Strait ferry included</span>}
        </div>
      )}
    </motion.div>
  );
}

function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const { state } = useStore();
  const openLoads = state.loads.filter((l) => l.status === 'open').length;
  return (
    <section className="hero" ref={ref}>
      <motion.div className="hero-canvas" style={{ y }}>
        <Scene>
          <AustraliaScene />
        </Scene>
      </motion.div>
      <motion.div className="container hero-content" style={{ opacity }}>
        <motion.span className="hero-chip" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <b>LIVE</b> {openLoads} loads open across 8 states and territories
        </motion.span>
        <h1 className="display" style={{ marginTop: 22, maxWidth: 820 }}>
          <SplitText text="Australia’s freight," delay={0.1} />
          <br />
          <span className="gradient-text">
            <SplitText text="matched in minutes." delay={0.35} />
          </span>
        </h1>
        <motion.p className="lead" style={{ marginTop: 22 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          The digital load board and broker built for Australian roads. Shippers post a load and pick the carriers they want.
          Verified trucking companies quote, book and deliver, from Darwin to Hobart.
        </motion.p>
        <div className="hero-ctas">
          <Magnetic>
            <Link to="/post" className="btn btn-primary">
              Ship a load
            </Link>
          </Magnetic>
          <Magnetic>
            <Link to="/loads" className="btn">
              Find loads to haul
            </Link>
          </Magnetic>
        </div>
        <QuickQuote />
      </motion.div>
      <div className="scroll-cue" aria-hidden />
    </section>
  );
}

export default function Home() {
  const { state } = useStore();
  return (
    <>
      <Hero />

      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[...LANES, ...LANES].map((l, i) => (
            <span key={i}>
              <i />
              {l}
            </span>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="grid grid-4">
            {[
              { n: state.carriers.length * 140 + 12, s: '', l: 'Verified Australian carriers' },
              { n: 18.4, s: 'M', l: 'Kilometres matched this year' },
              { n: 31, s: '%', l: 'Fewer empty backhaul km' },
              { n: 2, s: ' days', l: 'Carrier quick-pay after e-POD' },
            ].map((k, i) => (
              <Reveal key={k.l} delay={i * 0.08}>
                <Tilt className="kpi">
                  <strong className="gradient-text">
                    <Counter to={k.n} suffix={k.s} />
                  </strong>
                  <span className="muted small">{k.l}</span>
                </Tilt>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">One exchange, two sides</span>
            <h2 className="h2">
              The load board that works the way <span className="gradient-text">US and Canadian freight</span> does, built for Australia.
            </h2>
          </Reveal>
          <div className="grid grid-2">
            <Reveal>
              <Tilt className="card" style={{ minHeight: 360 }}>
                <div className="lift stack" style={{ gap: 16 }}>
                  <span className="badge private">For shippers</span>
                  <h3 className="h2" style={{ fontSize: '2rem' }}>Post once. Pick your carriers.</h3>
                  <p className="muted">
                    Get an instant market rate, then publish to every verified carrier or invite only the operators you trust.
                    Compare quotes side by side, book in one click and follow it live.
                  </p>
                  <ul className="muted" style={{ paddingLeft: 18, margin: 0 }}>
                    <li>Instant AUD lane pricing with GST shown</li>
                    <li>Invite-only loads for your private network</li>
                    <li>Live tracking and digital proof of delivery</li>
                  </ul>
                  <Link to="/post" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                    Post a load
                  </Link>
                </div>
              </Tilt>
            </Reveal>
            <Reveal delay={0.12}>
              <Tilt className="card" style={{ minHeight: 360 }}>
                <div className="lift stack" style={{ gap: 16 }}>
                  <span className="badge open">For trucking companies</span>
                  <h3 className="h2" style={{ fontSize: '2rem' }}>Fill every kilometre.</h3>
                  <p className="muted">
                    Search loads by state, equipment and rate per km. Quote or book instantly, find backhauls near where you
                    unload, and get paid in two days.
                  </p>
                  <ul className="muted" style={{ paddingLeft: 18, margin: 0 }}>
                    <li>Backhaul finder ranked by deadhead km</li>
                    <li>Direct invitations from shippers</li>
                    <li>No lock-in, no per-load listing fees</li>
                  </ul>
                  <Link to="/loads" className="btn btn-cyan" style={{ alignSelf: 'flex-start' }}>
                    Open the load board
                  </Link>
                </div>
              </Tilt>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">How it works</span>
            <h2 className="h2">From quote to proof of delivery in four moves.</h2>
            <Link to="/guide#shippers" className="small" style={{ color: 'var(--cyan)' }}>Read the detailed step-by-step guide →</Link>
          </Reveal>
          <div className="grid grid-4 stack3d">
            {[
              ['Price', 'Enter pickup, delivery and equipment. See the live market band for the lane.'],
              ['Publish', 'Go public on the board or send it invite-only to carriers you select.'],
              ['Book', 'Compare quotes, ratings and compliance, then accept with one click.'],
              ['Track', 'Watch the truck cross the map. The e-POD arrives at delivery.'],
            ].map(([t, b], i) => (
              <Reveal key={t} delay={i * 0.1}>
                <Tilt className="card" style={{ height: '100%' }}>
                  <div className="lift">
                    <div className="step-num">0{i + 1}</div>
                    <h3 className="h3" style={{ margin: '14px 0 8px' }}>{t}</h3>
                    <p className="muted small" style={{ margin: 0 }}>{b}</p>
                  </div>
                </Tilt>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Platform</span>
            <h2 className="h2">Everything a modern freight exchange does, tuned for the Hume, the Bruce and the Stuart.</h2>
          </Reveal>
          <div className="grid grid-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.08}>
                <Tilt className="card" style={{ height: '100%' }}>
                  <div className="lift">
                    <div className="icon-badge">{f.icon}</div>
                    <h3 className="h3">{f.title}</h3>
                    <p className="muted small" style={{ marginBottom: 0 }}>{f.body}</p>
                  </div>
                </Tilt>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-2" style={{ alignItems: 'center', gap: 48 }}>
          <Reveal>
            <div className="truck-stage">
              <Scene>
                <TruckScene />
              </Scene>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="stack" style={{ gap: 18 }}>
              <span className="eyebrow">Built for Australian combinations</span>
              <h2 className="h2">From a rigid in Parramatta to a triple on the Stuart Highway.</h2>
              <p className="lead">
                Loads carry Australian equipment types, payloads under NHVR general mass limits and road-train network checks.
                You get a warning before a B-double gets booked into a street it can’t legally drive.
              </p>
              <div className="row">
                <Link to="/join?role=carrier" className="btn btn-primary">
                  Register your fleet
                </Link>
                <Link to="/carriers" className="btn">
                  Browse carriers
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Equipment</span>
            <h2 className="h2">Hover a card to flip it.</h2>
          </Reveal>
          <div className="grid grid-3">
            {EQUIPMENT.map((e, i) => (
              <Reveal key={e.id} delay={(i % 3) * 0.06}>
                <div className="flip" tabIndex={0}>
                  <div className="flip-inner">
                    <div className="glass flip-face flip-front">
                      <span className="eyebrow">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <div className="big">{e.name}</div>
                        <p className="muted small" style={{ margin: '6px 0 0' }}>{e.desc}</p>
                      </div>
                    </div>
                    <div className="glass flip-face flip-back">
                      <div className="big" style={{ fontFamily: 'var(--display)', fontWeight: 700 }}>{e.short}</div>
                      <div>
                        <div className="kv"><span className="muted">Max payload</span><b>~{e.payload} t</b></div>
                        <div className="kv"><span className="muted">Pallet spaces</span><b>{e.pallets || 'Bulk'}</b></div>
                        <div className="kv"><span className="muted">Indicative rate</span><b>${e.rate.toFixed(2)}/km</b></div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <div className="glass cta-band border-glow">
              <span className="eyebrow">Australia only · ABN required</span>
              <h2 className="h2" style={{ maxWidth: 760 }}>
                Every shipper and carrier on Roadtrain is an <span className="gradient-text">Australian business</span>.
              </h2>
              <p className="lead">Sign up with a valid ABN and an Australian address. Verification takes minutes, not days.</p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Magnetic>
                  <Link to="/join" className="btn btn-primary">
                    Create your account
                  </Link>
                </Magnetic>
                <Link to="/guide" className="btn">
                  Read the full guide
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
