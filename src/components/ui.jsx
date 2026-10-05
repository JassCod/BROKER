import { Component, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../lib/store.jsx';
import { CITIES, STATES, aud, auDate, cityByName, equipmentById } from '../lib/au.js';
import { Stars, Tilt } from './fx.jsx';

export function Nav() {
  const { state, role, setSession } = useStore();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  const value = `${role}:${state.session.id}`;
  return (
    <nav className={`nav ${open ? 'open' : ''}`}>
      <Link to="/" className="brand">
        <span className="brand-mark" />
        Roadtrain<small>AU</small>
      </Link>
      <button className="nav-burger" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? 'Close' : 'Menu'}
      </button>
      <div className="nav-links">
        <NavLink to="/loads" end>Load board</NavLink>
        <NavLink to="/carriers">Carriers</NavLink>
        <NavLink to="/post">Post a load</NavLink>
        <NavLink to="/track">Track</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/guide">Guide</NavLink>
      </div>
      <div className="role-switch">
        <select
          aria-label="Acting as"
          value={value}
          onChange={(e) => {
            const [r, id] = e.target.value.split(':');
            setSession(r, id);
          }}
        >
          <optgroup label="Shippers">
            {state.shippers.map((s) => (
              <option key={s.id} value={`shipper:${s.id}`}>
                Shipper · {s.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Carriers">
            {state.carriers.map((c) => (
              <option key={c.id} value={`carrier:${c.id}`}>
                Carrier · {c.name}
              </option>
            ))}
          </optgroup>
        </select>
        <Link to="/join" className="btn btn-primary btn-sm">
          Join free
        </Link>
      </div>
    </nav>
  );
}

export function Footer() {
  const { reset, toast } = useStore();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="stack">
            <div className="brand">
              <span className="brand-mark" />
              Roadtrain<small>AU</small>
            </div>
            <p style={{ maxWidth: 340 }}>
              Australia’s digital freight exchange. Australian shippers, Australian carriers, ABN-verified and NHVR-aware.
            </p>
            <p className="dim small">
              Prices in AUD. GST is shown separately. Demo build: every company and figure is fictitious.
            </p>
          </div>
          <div>
            <h4>Shippers</h4>
            <Link to="/post">Post a load</Link>
            <Link to="/carriers">Find carriers</Link>
            <Link to="/track">Track freight</Link>
          </div>
          <div>
            <h4>Carriers</h4>
            <Link to="/loads">Load board</Link>
            <Link to="/loads?backhaul=1">Backhaul finder</Link>
            <Link to="/join?role=carrier">Get verified</Link>
          </div>
          <div>
            <h4>Demo</h4>
            <Link to="/guide">Knowledge hub</Link>
            <Link to="/guide#compliance">Compliance guide</Link>
            <Link to="/guide#faq">FAQ</Link>
            <Link to="/dashboard">Dashboard</Link>
            <a
              href="#reset"
              onClick={(e) => {
                e.preventDefault();
                reset();
                toast('Demo data reset');
              }}
            >
              Reset demo data
            </a>
          </div>
        </div>
        <div className="row between" style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <span className="small">© {new Date().getFullYear()} Roadtrain Exchange. Built for Australian roads.</span>
          <span className="small dim">NSW · VIC · QLD · SA · WA · TAS · NT · ACT</span>
        </div>
      </div>
    </footer>
  );
}

export function Toasts() {
  const { state, dismissToast } = useStore();
  return (
    <div className="toasts" role="status">
      <AnimatePresence>
        {state.toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast ${t.tone}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            onClick={() => dismissToast(t.id)}
          >
            <span className={`dot ${t.tone === 'ok' ? 'live' : ''}`} style={{ color: t.tone === 'ok' ? 'var(--green)' : 'var(--amber)' }} />
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="glass modal"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 40, rotateX: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row between" style={{ marginBottom: 18 }}>
              <h3 className="h3">{title}</h3>
              <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const STATUS_LABEL = { open: 'Open', booked: 'Booked', in_transit: 'In transit', delivered: 'Delivered', cancelled: 'Cancelled', pending: 'Pending', accepted: 'Accepted', declined: 'Declined' };
export const StatusBadge = ({ status }) => (
  <span className={`badge ${status}`}>
    <span className={`dot ${status === 'in_transit' ? 'live' : ''}`} />
    {STATUS_LABEL[status] || status}
  </span>
);

export function CityField({ label, value, onChange, error }) {
  const id = `city-${label.replace(/\W/g, '')}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className={`select ${error ? 'invalid' : ''}`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select a city…</option>
        {STATES.map((s) => (
          <optgroup key={s.code} label={s.name}>
            {CITIES.filter((c) => c.state === s.code).map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}, {c.state} {c.postcode}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {error && <span className="err">{error}</span>}
    </div>
  );
}

export function Lane({ from, to, km }) {
  const a = cityByName(from);
  const b = cityByName(to);
  return (
    <div className="lane">
      <div className="city">
        {from}
        <small>{a ? `${a.state} ${a.postcode}` : ''}</small>
      </div>
      <div className="lane-line">{km ? <span>{km.toLocaleString('en-AU')} km</span> : null}</div>
      <div className="city to">
        {to}
        <small>{b ? `${b.state} ${b.postcode}` : ''}</small>
      </div>
    </div>
  );
}

export function LoadCard({ load, km, children, invited }) {
  const { shipper, quotesFor } = useStore();
  const eq = equipmentById(load.equipment);
  const s = shipper(load.shipperId);
  const bids = quotesFor(load.id).length;
  return (
    <Tilt className="load-card" max={4}>
      <div className="row between">
        <div className="row">
          <Link to={`/loads/${load.id}`} className="mono small dim" title="Full load details">{load.ref} ↗</Link>
          <StatusBadge status={load.status} />
          {load.visibility === 'private' && <span className="badge private">Invite only</span>}
          {invited && <span className="badge ok">You’re invited</span>}
        </div>
        <div className="price">
          {aud(load.agreedRate || load.targetRate)}
          <span className="small muted" style={{ fontWeight: 400 }}> ex GST</span>
        </div>
      </div>
      <Lane from={load.origin} to={load.destination} km={km} />
      <div className="meta">
        <span>
          Equipment <b>{eq?.short}</b>
        </span>
        <span>
          Weight <b>{load.weightT} t</b>
        </span>
        {load.pallets ? (
          <span>
            Pallets <b>{load.pallets}</b>
          </span>
        ) : null}
        <span>
          Pickup <b>{auDate(load.pickupDate)}</b>
        </span>
        <span>
          Deliver by <b>{auDate(load.deliveryDate)}</b>
        </span>
        {km ? (
          <span>
            Rate <b>${((load.agreedRate || load.targetRate) / km).toFixed(2)}/km</b>
          </span>
        ) : null}
      </div>
      <div className="row between">
        <span className="small muted">
          {load.commodity} · {s?.name || 'Shipper'} · {bids} {bids === 1 ? 'quote' : 'quotes'}
        </span>
        <div className="row">
          {children}
          <Link to={`/loads/${load.id}`} className="btn btn-sm btn-ghost">Details →</Link>
        </div>
      </div>
    </Tilt>
  );
}

export function CarrierAvatar({ carrier, lg }) {
  const initials = carrier.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (
    <div className={`avatar ${lg ? 'lg' : ''}`} style={{ '--h': carrier.hue ?? 200 }}>
      {initials}
    </div>
  );
}

export function CarrierCard({ carrier, selected, onToggle }) {
  return (
    <Tilt className={`card ${selected ? 'select-ring' : ''}`} max={8}>
      <div className="stack lift" style={{ gap: 14 }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <CarrierAvatar carrier={carrier} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link to={`/carriers/${carrier.id}`} className="h3" style={{ fontSize: '1.08rem', display: 'block' }}>
              {carrier.name}
            </Link>
            <span className="small muted">
              {carrier.city}, {carrier.state} · ABN {carrier.abn}
            </span>
          </div>
        </div>
        <div className="row small">
          {carrier.reviews ? (
            <>
              <Stars value={carrier.rating} /> <b>{carrier.rating}</b> <span className="muted">({carrier.reviews})</span>
            </>
          ) : (
            <span className="muted">New carrier, no reviews yet</span>
          )}
        </div>
        <div className="chips">
          {carrier.equipment.map((e) => (
            <span key={e} className="badge">
              {equipmentById(e)?.short}
            </span>
          ))}
        </div>
        <div className="row small" style={{ gap: 8 }}>
          {carrier.verified && <span className="badge ok">✓ ABN verified</span>}
          {carrier.nhvas && <span className="badge open">NHVAS accredited</span>}
          {carrier.insuredM ? <span className="badge">${carrier.insuredM}M cover</span> : null}
        </div>
        <div className="row between small">
          <span className="muted">
            Fleet <b style={{ color: 'var(--text)' }}>{carrier.fleet}</b> · On-time <b style={{ color: 'var(--text)' }}>{carrier.onTime || '—'}%</b>
          </span>
          {onToggle && (
            <button className={`btn btn-sm ${selected ? 'btn-primary' : ''}`} onClick={() => onToggle(carrier.id)}>
              {selected ? '✓ Selected' : '+ Select'}
            </button>
          )}
        </div>
      </div>
    </Tilt>
  );
}

// WebGL scenes are lazy-loaded; this keeps the page usable if WebGL fails.
class SceneErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <div className="canvas-fallback">3D view unavailable on this device</div> : this.props.children;
  }
}

export const Scene = ({ children }) => (
  <SceneErrorBoundary>
    <Suspense fallback={<div className="canvas-fallback">Loading 3D…</div>}>{children}</Suspense>
  </SceneErrorBoundary>
);
