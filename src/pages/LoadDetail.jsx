import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import {
  FUEL_LEVY, aud, auDate, cityByName, equipmentById, estimateRate, rateBreakdown, routeLegs, routeWarnings,
} from '../lib/au.js';
import { CarrierAvatar, Lane, StatusBadge } from '../components/ui.jsx';
import { Reveal, Stars, Tilt } from '../components/fx.jsx';
import QuoteModal from '../components/QuoteModal.jsx';

// Compliance items that apply to this specific load, with the rule behind each.
function complianceFor(load, o, d) {
  const eq = equipmentById(load.equipment);
  const text = `${load.commodity} ${load.notes}`.toLowerCase();
  const items = [
    ['Mass declaration', `The consignor declares ${load.weightT} t. Under Chain of Responsibility, shippers are liable for accurate weights. The ${eq.short} limit is about ${eq.payload} t of payload.`],
    ['Load restraint', 'Restrain the freight to the NTC Load Restraint Guide 2018 (0.8 g forward, 0.5 g sideways and rearward).'],
    ['Fatigue management', 'Fatigue-regulated heavy vehicle. The driver keeps a National Heavy Vehicle Work Diary when working beyond 100 km of base, under standard hours, BFM or AFM.'],
  ];
  if (['WA', 'NT'].includes(o?.state) || ['WA', 'NT'].includes(d?.state)) {
    items.push(['WA / NT rules', 'The Heavy Vehicle National Law does not apply in WA or NT. Main Roads WA and NT Government heavy-vehicle rules, permits and fatigue schemes apply on those legs.']);
  }
  if (load.equipment === 'road-train') items.push(['Road-train network', 'The combination may only run on gazetted road-train routes. Plan break-down yards (e.g. Port Augusta, Dubbo, Perth outskirts) before entering restricted areas.']);
  if (load.equipment === 'side-loader') items.push(['Container weight declaration', 'Before transport, the HVNL requires a container weight declaration (gross weight) for freight containers.']);
  if (load.equipment === 'semi-reefer') items.push(['Cold chain', 'Pre-cool the trailer, record set point and probe temperatures for the whole trip, and hand over the temperature log with the POD.']);
  if (load.equipment === 'tanker' || /dangerous|dg |class \d|fuel|chemical/.test(text)) items.push(['Dangerous goods', 'If DG is carried: ADG Code placarding, a DG-licensed driver and vehicle, transport documents and an emergency information holder.']);
  if (/over-width|oversize|over-mass|osom|pilot/.test(text)) items.push(['Oversize / over-mass', 'An NHVR access permit or notice is needed, plus pilot or escort vehicles as the permit conditions require.']);
  if (/fruit|produce|mango|vegetable|plant|grain|wheat|nursery/.test(text) && ['WA', 'TAS', 'SA'].includes(d?.state) && d?.state !== o?.state) {
    items.push(['Interstate biosecurity', `${d.state} restricts entry of plant products (e.g. fruit fly host produce). A plant health certificate or assurance certificate may be required.`]);
  }
  return items;
}

export default function LoadDetail() {
  const { id } = useParams();
  const { loadById, shipper, carrier, quotesFor, role, me, bookNow, toast } = useStore();
  const [quoting, setQuoting] = useState(null);
  const load = loadById(id);
  if (!load) {
    return (
      <div className="page container">
        <div className="glass empty">
          Load not found. <Link to="/loads">Back to the board</Link>
        </div>
      </div>
    );
  }
  const o = cityByName(load.origin);
  const d = cityByName(load.destination);
  const eq = equipmentById(load.equipment);
  const est = estimateRate({ origin: o, destination: d, equipmentId: load.equipment, weightT: load.weightT });
  const price = load.agreedRate || load.targetRate;
  const br = rateBreakdown(est, price);
  const legs = routeLegs(o, d);
  const warnings = routeWarnings({ origin: o, destination: d, equipmentId: load.equipment, weightT: load.weightT });
  const s = shipper(load.shipperId);
  const booked = carrier(load.bookedCarrierId);
  const quotes = quotesFor(load.id).sort((a, b) => a.amount - b.amount);
  const isOwner = role === 'shipper' && load.shipperId === me?.id;
  const canSee = load.visibility === 'public' || isOwner || (role === 'carrier' && load.invitedCarrierIds.includes(me?.id));
  const position = est ? Math.min(100, Math.max(0, ((price - est.low) / (est.high - est.low)) * 100)) : 50;
  const util = eq.payload ? Math.round((load.weightT / eq.payload) * 100) : 0;

  if (!canSee) {
    return (
      <div className="page container">
        <div className="glass empty">This load is invite-only. Only the shipper and the carriers it invited can view it.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container stack" style={{ gap: 24 }}>
        <Link to="/loads" className="small muted">← Load board</Link>
        <Reveal>
          <Tilt className="card border-glow" max={2}>
            <div className="stack" style={{ gap: 18 }}>
              <div className="row between">
                <div className="row">
                  <span className="mono dim">{load.ref}</span>
                  <StatusBadge status={load.status} />
                  {load.visibility === 'private' && <span className="badge private">Invite only · {load.invitedCarrierIds.length} carrier{load.invitedCarrierIds.length === 1 ? '' : 's'}</span>}
                </div>
                <div className="price" style={{ fontSize: '2rem' }}>
                  {aud(price)} <span className="small muted" style={{ fontWeight: 400 }}>ex GST</span>
                </div>
              </div>
              <Lane from={load.origin} to={load.destination} km={est?.km} />
              <div className="meta">
                <span>Commodity <b>{load.commodity}</b></span>
                <span>Equipment <b>{eq.name}</b></span>
                <span>Weight <b>{load.weightT} t</b></span>
                {load.pallets ? <span>Pallets <b>{load.pallets} / {eq.pallets}</b></span> : null}
                <span>Pickup <b>{auDate(load.pickupDate)}</b></span>
                <span>Deliver by <b>{auDate(load.deliveryDate)}</b></span>
              </div>
              {load.status === 'open' && role === 'carrier' && (
                <div className="row">
                  <button className="btn btn-primary" onClick={() => { bookNow(load); toast(`Booked ${load.ref} at ${aud(load.targetRate)}`); }}>Book now at {aud(load.targetRate)}</button>
                  <button className="btn" onClick={() => setQuoting(load)}>Counter-quote</button>
                </div>
              )}
              {['booked', 'in_transit', 'delivered'].includes(load.status) && (
                <Link to={`/track?load=${load.id}`} className="btn btn-cyan" style={{ alignSelf: 'flex-start' }}>Track this load</Link>
              )}
            </div>
          </Tilt>
        </Reveal>

        <div className="grid grid-3">
          <div className="glass card stack">
            <h3 className="h3">Cost breakdown</h3>
            {br && (
              <>
                <div className="kv"><span className="muted">Linehaul</span><b>{aud(br.linehaul)}</b></div>
                <div className="kv"><span className="muted">Fuel levy ({Math.round(FUEL_LEVY * 100)}%)</span><b>{aud(br.fuel)}</b></div>
                {br.ferry > 0 && <div className="kv"><span className="muted">Bass Strait crossing</span><b>{aud(br.ferry)}</b></div>}
                <div className="kv"><span className="muted">Subtotal ex GST</span><b>{aud(br.exGst)}</b></div>
                <div className="kv"><span className="muted">GST 10%</span><b>{aud(br.gst)}</b></div>
                <div className="kv"><span>Total inc GST</span><b className="gradient-text" style={{ fontSize: '1.2rem' }}>{aud(br.incGst)}</b></div>
              </>
            )}
            <p className="small dim" style={{ margin: 0 }}>The split is indicative. Tolls, waiting time (detention) and tail-lift fees are agreed with the carrier.</p>
          </div>

          <div className="glass card stack">
            <h3 className="h3">Unit economics</h3>
            {est && (
              <>
                <div className="kv"><span className="muted">Per km</span><b>${(price / est.km).toFixed(2)}</b></div>
                <div className="kv"><span className="muted">Per tonne</span><b>{aud(price / load.weightT)}</b></div>
                {load.pallets ? <div className="kv"><span className="muted">Per pallet</span><b>{aud(price / load.pallets)}</b></div> : null}
                <div className="kv"><span className="muted">Per tonne-km</span><b>{((price / (load.weightT * est.km)) * 100).toFixed(1)}¢</b></div>
                <div className="kv"><span className="muted">Payload utilisation</span><b>{util}%</b></div>
                <div style={{ marginTop: 8 }}>
                  <div className="row between small muted"><span>{aud(est.low)}</span><span>Market band</span><span>{aud(est.high)}</span></div>
                  <div className="progress" style={{ position: 'relative', overflow: 'visible', marginTop: 6 }}>
                    <div style={{ width: '100%', opacity: 0.35 }} />
                    <span style={{ position: 'absolute', top: -5, left: `calc(${position}% - 9px)`, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 0 14px var(--orange)' }} />
                  </div>
                  <p className="small muted" style={{ marginBottom: 0 }}>
                    This rate is {price < est.mid ? 'below' : price > est.mid ? 'above' : 'at'} the market midpoint of {aud(est.mid)}.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="glass card stack">
            <h3 className="h3">Route plan</h3>
            {legs.map((l, i) => (
              <div key={i} className="kv">
                <span className="muted">{l.mode === 'sea' ? '⛴' : '🚛'} {l.from} → {l.to}</span>
                <b>{l.mode === 'sea' ? 'Overnight sailing' : `${l.km.toLocaleString('en-AU')} km`}</b>
              </div>
            ))}
            {est && (
              <>
                <div className="kv"><span className="muted">Estimated drive time</span><b>~{Math.round(est.km / 80)} h at 80 km/h avg</b></div>
                <div className="kv"><span className="muted">Typical transit</span><b>{est.days} day{est.days > 1 ? 's' : ''}{est.km > 900 ? ' (two-up or relay faster)' : ''}</b></div>
              </>
            )}
            {warnings.map((w) => <div key={w} className="warn-box">⚠ {w}</div>)}
          </div>
        </div>

        <div className="grid grid-2">
          <div className="glass card stack">
            <h3 className="h3">Compliance checklist for this load</h3>
            {complianceFor(load, o, d).map(([t, body]) => (
              <div key={t} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <span className="badge ok" style={{ marginTop: 2 }}>✓</span>
                <div>
                  <b>{t}</b>
                  <div className="small muted">{body}</div>
                </div>
              </div>
            ))}
            <Link to="/guide#compliance" className="small" style={{ color: 'var(--cyan)' }}>Read the full compliance guide →</Link>
          </div>

          <div className="stack" style={{ gap: 20 }}>
            <div className="glass card stack">
              <h3 className="h3">Shipper</h3>
              <div className="kv"><span className="muted">Business</span><b>{s?.name}</b></div>
              <div className="kv"><span className="muted">ABN</span><b className="mono">{s?.abn}</b></div>
              <div className="kv"><span className="muted">Location</span><b>{s?.city}, {s?.state}</b></div>
              <div className="kv"><span className="muted">Verification</span><b className={s?.verified ? 'ok-text' : ''}>{s?.verified ? '✓ ABN verified' : 'Pending'}</b></div>
              <div className="kv"><span className="muted">Payment terms</span><b>30 days to Roadtrain · carrier quick-pay in 2 days</b></div>
              {load.notes && <div className="info-box">Shipper notes: {load.notes}</div>}
            </div>
            <div className="glass card stack">
              <h3 className="h3">Documents</h3>
              <div className="kv"><span className="muted">Consignment note</span><b>{load.status === 'open' ? 'Issued on booking' : `CN-${load.ref.slice(3)}`}</b></div>
              <div className="kv"><span className="muted">Rate confirmation</span><b>{booked ? 'Signed by both parties' : '—'}</b></div>
              <div className="kv"><span className="muted">Proof of delivery</span><b>{load.pod ? `Signed by ${load.pod.receivedBy}` : 'On delivery'}</b></div>
              <div className="kv"><span className="muted">Tax invoice</span><b>{load.status === 'delivered' ? 'Issued (inc GST)' : 'After POD'}</b></div>
            </div>
          </div>
        </div>

        {(isOwner || booked) && (
          <div className="glass card stack">
            <h3 className="h3">{booked ? 'Booked carrier' : `Quotes (${quotes.length})`}</h3>
            {booked ? (
              <div className="row">
                <CarrierAvatar carrier={booked} />
                <div>
                  <Link to={`/carriers/${booked.id}`}><b>{booked.name}</b></Link>
                  <div className="small muted">{booked.reviews ? <Stars value={booked.rating} /> : 'New'} · {booked.city}, {booked.state} · ABN {booked.abn}</div>
                </div>
              </div>
            ) : quotes.length ? (
              quotes.map((q) => {
                const c = carrier(q.carrierId);
                return (
                  <div key={q.id} className="kv">
                    <span>{c?.name} <span className="muted small">· {q.message}</span></span>
                    <b>{aud(q.amount)} <StatusBadge status={q.status} /></b>
                  </div>
                );
              })
            ) : (
              <span className="muted">No quotes yet. <Link to="/carriers" style={{ color: 'var(--orange)' }}>Invite carriers</Link></span>
            )}
            {isOwner && !booked && quotes.length > 0 && <Link to="/dashboard" className="btn btn-sm btn-primary" style={{ alignSelf: 'flex-start' }}>Compare & accept in dashboard</Link>}
          </div>
        )}
      </div>
      <QuoteModal load={quoting} onClose={() => setQuoting(null)} />
    </div>
  );
}
