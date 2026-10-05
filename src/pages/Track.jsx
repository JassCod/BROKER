import { lazy, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DEMO_TRANSIT_MS, transitProgress, useStore } from '../lib/store.jsx';
import { aud, cityByName, equipmentById, roadDistanceKm } from '../lib/au.js';
import { Scene, StatusBadge } from '../components/ui.jsx';
import { Reveal } from '../components/fx.jsx';

const AustraliaScene = lazy(() => import('../three/AustraliaScene.jsx'));

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export default function Track() {
  const { state, role, me, carrier, shipper } = useStore();
  const [params, setParams] = useSearchParams();
  const now = useNow();
  const [ref, setRef] = useState('');
  const [notFound, setNotFound] = useState(false);

  const trackable = state.loads.filter((l) => ['booked', 'in_transit', 'delivered'].includes(l.status));
  const mine = trackable.filter((l) => (role === 'carrier' ? l.bookedCarrierId === me?.id : l.shipperId === me?.id));
  const list = mine.length ? mine : trackable;
  const selected = state.loads.find((l) => l.id === params.get('load')) || list.find((l) => l.status === 'in_transit') || list[0];

  if (!selected) {
    return (
      <div className="page container">
        <div className="glass empty">
          No shipments to track yet. <Link to="/post" style={{ color: 'var(--orange)' }}>Post a load</Link> and book a carrier.
        </div>
      </div>
    );
  }

  const progress = transitProgress(selected, now);
  const o = cityByName(selected.origin);
  const d = cityByName(selected.destination);
  const km = roadDistanceKm(o, d);
  const c = carrier(selected.bookedCarrierId);
  const remainingKm = Math.round(km * (1 - progress));
  const remainingMin = selected.status === 'in_transit' ? Math.max(0, Math.ceil(((1 - progress) * DEMO_TRANSIT_MS) / 60000)) : null;

  const steps = [
    ['Booked', `${c?.name || 'Carrier'} accepted at ${aud(selected.agreedRate || selected.targetRate)}`, true],
    ['Picked up', selected.pickedUpAt ? new Date(selected.pickedUpAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : 'Waiting for the carrier to confirm', !!selected.pickedUpAt],
    ['In transit', selected.status === 'in_transit' ? `${remainingKm.toLocaleString('en-AU')} km to go` : selected.status === 'delivered' ? 'Completed' : '—', selected.status === 'delivered'],
    ['Delivered', selected.pod ? `e-POD signed by ${selected.pod.receivedBy}` : 'Pending', selected.status === 'delivered'],
  ];
  const nowIdx = steps.findIndex((s) => !s[2]);

  return (
    <div className="page">
      <div className="container stack" style={{ gap: 24 }}>
        <Reveal className="section-head" style={{ marginBottom: 0 }}>
          <span className="eyebrow">Live tracking</span>
          <h1 className="h2">
            {selected.origin} <span className="gradient-text">→</span> {selected.destination}
          </h1>
        </Reveal>

        <div className="row">
          <select className="select" style={{ maxWidth: 380 }} value={selected.id} onChange={(e) => setParams({ load: e.target.value })} aria-label="Shipment">
            {list.map((l) => (
              <option key={l.id} value={l.id}>
                {l.ref} · {l.origin} → {l.destination} ({l.status.replace('_', ' ')})
              </option>
            ))}
          </select>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              const hit = state.loads.find((l) => l.ref.toLowerCase() === ref.trim().toLowerCase());
              setNotFound(!hit);
              if (hit) setParams({ load: hit.id });
            }}
          >
            <input className="input" style={{ width: 180 }} placeholder="Track by ref, e.g. RT-24370" value={ref} onChange={(e) => setRef(e.target.value)} aria-label="Load reference" />
            <button className="btn btn-sm">Find</button>
            {notFound && <span className="err">No load with that reference</span>}
          </form>
        </div>

        <div className="track-stage">
          <Scene>
            <AustraliaScene key={selected.id} mode="track" track={{ from: selected.origin, to: selected.destination, progress }} />
          </Scene>
          <div className="glass track-hud">
            <div className="row between">
              <div className="row">
                <span className="mono small dim">{selected.ref}</span>
                <StatusBadge status={selected.status} />
                <span className="small muted">{equipmentById(selected.equipment)?.name} · {selected.weightT} t</span>
              </div>
              <b>{Math.round(progress * 100)}%</b>
            </div>
            <div className="progress">
              <div style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="row between small muted">
              <span>{o?.name}, {o?.state}</span>
              <span>
                {selected.status === 'in_transit' ? `${remainingKm.toLocaleString('en-AU')} km remaining · demo ETA ${remainingMin} min` : selected.status === 'booked' ? 'Awaiting pickup' : 'Delivered'}
              </span>
              <span>{d?.name}, {d?.state}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="glass card">
            <h3 className="h3" style={{ marginBottom: 20 }}>Milestones</h3>
            <div className="timeline">
              {steps.map(([t, sub, done], i) => (
                <div key={t} className={done ? 'done' : i === nowIdx ? 'now' : ''}>
                  <span className="node" />
                  <div>
                    <b>{t}</b>
                    <div className="small muted">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass card stack">
            <h3 className="h3">Shipment</h3>
            <div className="kv"><span className="muted">Shipper</span><b>{shipper(selected.shipperId)?.name}</b></div>
            <div className="kv"><span className="muted">Carrier</span><b>{c ? <Link to={`/carriers/${c.id}`}>{c.name}</Link> : '—'}</b></div>
            <div className="kv"><span className="muted">Commodity</span><b>{selected.commodity}</b></div>
            <div className="kv"><span className="muted">Distance</span><b>{km.toLocaleString('en-AU')} km</b></div>
            <div className="kv"><span className="muted">Agreed rate</span><b>{aud(selected.agreedRate || selected.targetRate)} + GST</b></div>
            {selected.status === 'booked' && role === 'carrier' && selected.bookedCarrierId === me?.id && (
              <Link to="/dashboard" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
                Confirm pickup in dashboard
              </Link>
            )}
            <p className="small dim" style={{ margin: 0 }}>
              Demo: the trip runs on compressed time ({DEMO_TRANSIT_MS / 60000} minutes end to end). In production, positions come from the carrier’s telematics or driver app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
