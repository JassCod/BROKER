import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../lib/store.jsx';
import { EQUIPMENT, STATES, equipmentById } from '../lib/au.js';
import { CarrierAvatar, CarrierCard, Modal } from '../components/ui.jsx';
import { Counter, Reveal, Stars, Tilt } from '../components/fx.jsx';

export function Carriers() {
  const { state, role, me, invite, toast } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [st, setSt] = useState('');
  const [eq, setEq] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [nhvas, setNhvas] = useState(false);
  const [selected, setSelected] = useState([]);
  const [picking, setPicking] = useState(false);

  const list = useMemo(
    () =>
      state.carriers
        .filter((c) => {
          const text = `${c.name} ${c.city} ${(c.lanes || []).join(' ')}`.toLowerCase();
          return (
            (!q || text.includes(q.toLowerCase())) &&
            (!st || c.state === st) &&
            (!eq || c.equipment.includes(eq)) &&
            (!verifiedOnly || c.verified) &&
            (!nhvas || c.nhvas)
          );
        })
        .sort((a, b) => b.rating - a.rating),
    [state.carriers, q, st, eq, verifiedOnly, nhvas],
  );

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const myOpenLoads = state.loads.filter((l) => l.shipperId === me?.id && l.status === 'open');

  return (
    <div className="page">
      <div className="container">
        <Reveal className="section-head" style={{ marginBottom: 32 }}>
          <span className="eyebrow">Carrier directory</span>
          <h1 className="h2">
            Pick the trucking companies <span className="gradient-text">you want to work with</span>.
          </h1>
          <p className="lead">
            Every carrier is an Australian business with an ABN. Select one or more and send them a load directly. Only
            they will see it.
          </p>
        </Reveal>

        <div className="glass" style={{ padding: 16, marginBottom: 24 }}>
          <div className="row" style={{ gap: 12 }}>
            <input className="input" style={{ flex: '2 1 220px' }} placeholder="Search name, base or lane (e.g. Darwin–Adelaide)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search carriers" />
            <select className="select" style={{ flex: '1 1 140px' }} value={st} onChange={(e) => setSt(e.target.value)} aria-label="State">
              <option value="">All states</option>
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <select className="select" style={{ flex: '1 1 160px' }} value={eq} onChange={(e) => setEq(e.target.value)} aria-label="Equipment">
              <option value="">Any equipment</option>
              {EQUIPMENT.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <label className="check">
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> ABN verified
            </label>
            <label className="check">
              <input type="checkbox" checked={nhvas} onChange={(e) => setNhvas(e.target.checked)} /> NHVAS
            </label>
          </div>
        </div>

        <div className="grid grid-3">
          {list.map((c, i) => (
            <Reveal key={c.id} delay={(i % 3) * 0.06}>
              <CarrierCard carrier={c} selected={selected.includes(c.id)} onToggle={role === 'shipper' ? toggle : undefined} />
            </Reveal>
          ))}
        </div>
        {!list.length && <div className="glass empty">No carriers match those filters.</div>}
      </div>

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div className="glass tray" initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}>
            <span>
              <b>{selected.length}</b> carrier{selected.length > 1 ? 's' : ''} selected
            </span>
            <div className="row">
              <button className="btn btn-sm btn-ghost" onClick={() => setSelected([])}>
                Clear
              </button>
              {myOpenLoads.length > 0 && (
                <button className="btn btn-sm" onClick={() => setPicking(true)}>
                  Invite to an existing load
                </button>
              )}
              <button className="btn btn-sm btn-primary" onClick={() => navigate(`/post?invite=${selected.join(',')}`)}>
                Post a load to them →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={picking} onClose={() => setPicking(false)} title="Invite to which load?">
        <div className="stack">
          {myOpenLoads.map((l) => (
            <button
              key={l.id}
              className="btn"
              style={{ justifyContent: 'space-between' }}
              onClick={async () => {
                if (!(await invite(l.id, selected))) return;
                toast(`${selected.length} carrier${selected.length > 1 ? 's' : ''} invited to ${l.ref}`);
                setSelected([]);
                setPicking(false);
              }}
            >
              <span>
                {l.origin} → {l.destination}
              </span>
              <span className="mono small dim">{l.ref}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

const REVIEWS = [
  ['Logistics manager, FMCG', 'Driver called ahead, on the dock 20 minutes early. Paperwork was perfect.'],
  ['Operations lead, building supplies', 'Handled an awkward over-width load without fuss. They’ll get our next one.'],
  ['Supply chain, agribusiness', 'Great comms throughout harvest. Live tracking matched the driver updates.'],
];

export function CarrierProfile() {
  const { id } = useParams();
  const { carrier, role, state } = useStore();
  const c = carrier(id);
  if (!c) {
    return (
      <div className="page container">
        <div className="glass empty">
          Carrier not found. <Link to="/carriers">Back to directory</Link>
        </div>
      </div>
    );
  }
  const jobs = state.loads.filter((l) => l.bookedCarrierId === c.id);
  return (
    <div className="page">
      <div className="container stack" style={{ gap: 24 }}>
        <Link to="/carriers" className="small muted">
          ← All carriers
        </Link>
        <Reveal>
          <Tilt className="card border-glow" max={3}>
            <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>
              <CarrierAvatar carrier={c} lg />
              <div className="stack" style={{ flex: 1, minWidth: 240, gap: 8 }}>
                <h1 className="h2">{c.name}</h1>
                <span className="muted">
                  {c.city}, {c.state} · ABN {c.abn} {c.founded ? `· Since ${c.founded}` : ''}
                </span>
                <div className="row small">
                  {c.reviews ? (
                    <>
                      <Stars value={c.rating} /> <b>{c.rating}</b> <span className="muted">from {c.reviews} reviews</span>
                    </>
                  ) : (
                    <span className="muted">No reviews yet</span>
                  )}
                </div>
                <p className="muted" style={{ maxWidth: 640 }}>{c.about}</p>
              </div>
              {role === 'shipper' && (
                <Link to={`/post?invite=${c.id}`} className="btn btn-primary">
                  Request a quote
                </Link>
              )}
            </div>
          </Tilt>
        </Reveal>

        <div className="grid grid-4">
          {[
            ['Fleet size', c.fleet, ''],
            ['On-time', c.onTime, '%'],
            ['Insurance', c.insuredM, 'M'],
            ['Jobs on Roadtrain', jobs.length + (c.reviews || 0), ''],
          ].map(([l, n, s]) => (
            <Tilt key={l} className="kpi">
              <strong className="gradient-text">
                {l === 'Insurance' ? '$' : ''}
                <Counter to={Number(n) || 0} suffix={s} />
              </strong>
              <span className="muted small">{l}</span>
            </Tilt>
          ))}
        </div>

        <div className="grid grid-3">
          <div className="glass card stack">
            <h3 className="h3">Equipment</h3>
            {c.equipment.map((e) => {
              const x = equipmentById(e);
              return (
                <div key={e} className="kv">
                  <span>{x.name}</span>
                  <span className="muted">{x.payload} t</span>
                </div>
              );
            })}
          </div>
          <div className="glass card stack">
            <h3 className="h3">Compliance</h3>
            <div className="kv"><span>ABN</span><span className={c.verified ? 'ok-text' : 'muted'}>{c.verified ? '✓ Verified' : 'Pending'}</span></div>
            <div className="kv"><span>NHVAS mass & maintenance</span><span className={c.nhvas ? 'ok-text' : 'muted'}>{c.nhvas ? '✓ Accredited' : 'Not listed'}</span></div>
            <div className="kv"><span>Public liability / CMR</span><span>{c.insuredM ? `$${c.insuredM}M` : '—'}</span></div>
            <div className="kv"><span>Chain of Responsibility policy</span><span className="ok-text">✓ On file</span></div>
            <div className="kv"><span>Fatigue management</span><span className="muted">{c.nhvas ? 'BFM' : 'Standard hours'}</span></div>
          </div>
          <div className="glass card stack">
            <h3 className="h3">Preferred lanes</h3>
            {(c.lanes || []).length ? c.lanes.map((l) => <span key={l} className="badge open" style={{ alignSelf: 'flex-start' }}>{l}</span>) : <span className="muted small">None listed yet.</span>}
          </div>
        </div>

        {c.reviews > 0 && (
          <div className="grid grid-3">
            {REVIEWS.map(([who, text], i) => (
              <Reveal key={who} delay={i * 0.08}>
                <Tilt className="card">
                  <Stars value={5 - (i === 2 ? 1 : 0)} />
                  <p style={{ margin: '12px 0' }}>“{text}”</p>
                  <span className="small muted">{who}</span>
                </Tilt>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
