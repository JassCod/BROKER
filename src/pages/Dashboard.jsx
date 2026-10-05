import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { aud, auDate, cityByName, equipmentById, roadDistanceKm } from '../lib/au.js';
import { CarrierAvatar, LoadCard, Modal, StatusBadge } from '../components/ui.jsx';
import { Counter, Reveal, Stars, Tilt } from '../components/fx.jsx';
import QuoteModal from '../components/QuoteModal.jsx';

const kmFor = (l) => roadDistanceKm(cityByName(l.origin), cityByName(l.destination));

function Kpis({ items }) {
  return (
    <div className="grid grid-4" style={{ marginBottom: 28 }}>
      {items.map(([label, n, money], i) => (
        <Reveal key={label} delay={i * 0.06}>
          <Tilt className="kpi">
            <strong className="gradient-text">{money ? <Counter to={n} prefix="$" /> : <Counter to={n} />}</strong>
            <span className="muted small">{label}</span>
          </Tilt>
        </Reveal>
      ))}
    </div>
  );
}

function Tabs({ tabs, tab, setTab }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([id, label, count]) => (
        <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
          {label}
          {count ? <span className="count">{count}</span> : null}
        </button>
      ))}
    </div>
  );
}

function LoadsTable({ loads, actions }) {
  const { carrier } = useStore();
  if (!loads.length) return <div className="glass empty">Nothing here yet.</div>;
  return (
    <div className="glass table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Ref</th>
            <th>Lane</th>
            <th>Equipment</th>
            <th>Pickup</th>
            <th>Rate</th>
            <th>Carrier</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {loads.map((l) => (
            <tr key={l.id}>
              <td className="mono small">{l.ref}</td>
              <td>
                <b>{l.origin}</b> → <b>{l.destination}</b>
                <div className="small dim">{kmFor(l).toLocaleString('en-AU')} km</div>
              </td>
              <td>{equipmentById(l.equipment)?.short}</td>
              <td>{auDate(l.pickupDate)}</td>
              <td>{aud(l.agreedRate || l.targetRate)}</td>
              <td>{l.bookedCarrierId ? carrier(l.bookedCarrierId)?.name : <span className="dim">{l.visibility === 'private' ? `${l.invitedCarrierIds.length} invited` : 'Open board'}</span>}</td>
              <td>
                <StatusBadge status={l.status} />
              </td>
              <td>
                <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                  {actions(l)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShipperDash() {
  const { state, me, carrier, quotesFor, acceptQuote, declineQuote, cancel, toast } = useStore();
  const [tab, setTab] = useState('quotes');
  const mine = state.loads.filter((l) => l.shipperId === me.id);
  const open = mine.filter((l) => l.status === 'open');
  const withQuotes = open.filter((l) => quotesFor(l.id).length);
  const pendingQuotes = open.flatMap((l) => quotesFor(l.id).filter((q) => q.status === 'pending'));
  const active = mine.filter((l) => l.status === 'booked' || l.status === 'in_transit');
  const spend = mine.filter((l) => ['booked', 'in_transit', 'delivered'].includes(l.status)).reduce((s, l) => s + (l.agreedRate || l.targetRate), 0);

  return (
    <>
      <Kpis items={[['Open loads', open.length], ['Quotes to review', pendingQuotes.length], ['Booked / in transit', active.length], ['Committed spend (AUD)', spend, true]]} />
      <Tabs
        tab={tab}
        setTab={setTab}
        tabs={[
          ['quotes', 'Quote inbox', pendingQuotes.length],
          ['loads', 'All my loads', 0],
          ['active', 'Active shipments', active.length],
        ]}
      />
      {tab === 'quotes' && (
        <div className="stack" style={{ gap: 18 }}>
          {!withQuotes.length && (
            <div className="glass empty">
              No quotes yet. <Link to="/carriers" style={{ color: 'var(--orange)' }}>Invite carriers</Link> to speed things up.
            </div>
          )}
          {withQuotes.map((l) => {
            const quotes = quotesFor(l.id).sort((a, b) => a.amount - b.amount);
            return (
              <div key={l.id} className="stack" style={{ gap: 12 }}>
                <LoadCard load={l} km={kmFor(l)} />
                <div className="grid grid-2">
                  {quotes.map((q, qi) => {
                    const c = carrier(q.carrierId);
                    return (
                      <Tilt key={q.id} className="card" max={5}>
                        <div className="lift stack" style={{ gap: 12 }}>
                          <div className="row between">
                            <div className="row">
                              <CarrierAvatar carrier={c} />
                              <div>
                                <Link to={`/carriers/${c.id}`}>
                                  <b>{c.name}</b>
                                </Link>
                                <div className="small muted">
                                  {c.reviews ? <Stars value={c.rating} /> : 'New'} · {c.onTime || '—'}% on-time
                                </div>
                              </div>
                            </div>
                            <StatusBadge status={q.status} />
                          </div>
                          <div className="row between">
                            <div className="price">{aud(q.amount)}</div>
                            <div className="small muted">
                              {q.etaDays ? `${q.etaDays} day transit` : ''} {qi === 0 && quotes.length > 1 ? '· Lowest' : ''}
                            </div>
                          </div>
                          {q.message && <p className="small muted" style={{ margin: 0 }}>“{q.message}”</p>}
                          {q.status === 'pending' && (
                            <div className="row">
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => {
                                  acceptQuote(q.id);
                                  toast(`Booked ${c.name} for ${l.ref} at ${aud(q.amount)}`);
                                }}
                              >
                                Accept & book
                              </button>
                              <button className="btn btn-sm btn-ghost" onClick={() => declineQuote(q.id)}>
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </Tilt>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'loads' && (
        <LoadsTable
          loads={mine}
          actions={(l) => (
            <>
              {(l.status === 'booked' || l.status === 'in_transit' || l.status === 'delivered') && (
                <Link to={`/track?load=${l.id}`} className="btn btn-sm">
                  Track
                </Link>
              )}
              {l.status === 'open' && (
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    cancel(l.id);
                    toast(`${l.ref} cancelled`, 'warn');
                  }}
                >
                  Cancel
                </button>
              )}
            </>
          )}
        />
      )}
      {tab === 'active' && (
        <LoadsTable
          loads={active}
          actions={(l) => (
            <Link to={`/track?load=${l.id}`} className="btn btn-sm btn-primary">
              Track live
            </Link>
          )}
        />
      )}
    </>
  );
}

function CarrierDash() {
  const { state, me, shipper, pickup, deliver, toast } = useStore();
  const [tab, setTab] = useState('invites');
  const [quoting, setQuoting] = useState(null);
  const [podFor, setPodFor] = useState(null);
  const [podName, setPodName] = useState('');
  const invites = state.loads.filter((l) => l.status === 'open' && l.invitedCarrierIds.includes(me.id));
  const myQuotes = state.quotes.filter((q) => q.carrierId === me.id);
  const jobs = state.loads.filter((l) => l.bookedCarrierId === me.id);
  const active = jobs.filter((l) => l.status === 'booked' || l.status === 'in_transit');
  const done = jobs.filter((l) => l.status === 'delivered');
  const revenue = jobs.reduce((s, l) => s + (l.agreedRate || l.targetRate), 0);

  return (
    <>
      <Kpis items={[['Direct invitations', invites.length], ['Quotes pending', myQuotes.filter((q) => q.status === 'pending').length], ['Active jobs', active.length], ['Booked revenue (AUD)', revenue, true]]} />
      <Tabs
        tab={tab}
        setTab={setTab}
        tabs={[
          ['invites', 'Invitations', invites.length],
          ['quotes', 'My quotes', 0],
          ['jobs', 'Active jobs', active.length],
          ['done', 'Completed', 0],
        ]}
      />
      {tab === 'invites' && (
        <div className="stack" style={{ gap: 16 }}>
          {!invites.length && (
            <div className="glass empty">
              No direct invitations right now. <Link to="/loads?backhaul=1" style={{ color: 'var(--orange)' }}>Find a backhaul</Link> on the board.
            </div>
          )}
          {invites.map((l) => (
            <LoadCard key={l.id} load={l} km={kmFor(l)} invited>
              <button className="btn btn-sm btn-primary" onClick={() => setQuoting(l)}>
                Quote
              </button>
            </LoadCard>
          ))}
        </div>
      )}
      {tab === 'quotes' &&
        (myQuotes.length ? (
          <div className="glass table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Load</th>
                  <th>Lane</th>
                  <th>Shipper</th>
                  <th>Your quote</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myQuotes.map((q) => {
                  const l = state.loads.find((x) => x.id === q.loadId);
                  if (!l) return null;
                  return (
                    <tr key={q.id}>
                      <td className="mono small">{l.ref}</td>
                      <td>
                        {l.origin} → {l.destination}
                      </td>
                      <td>{shipper(l.shipperId)?.name}</td>
                      <td>{aud(q.amount)}</td>
                      <td>
                        <StatusBadge status={q.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="glass empty">
            You haven’t quoted yet. <Link to="/loads" style={{ color: 'var(--orange)' }}>Open the load board</Link>
          </div>
        ))}
      {tab === 'jobs' && (
        <LoadsTable
          loads={active}
          actions={(l) =>
            l.status === 'booked' ? (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => {
                  pickup(l.id);
                  toast(`${l.ref} picked up. Tracking is live.`);
                }}
              >
                Confirm pickup
              </button>
            ) : (
              <>
                <Link to={`/track?load=${l.id}`} className="btn btn-sm">
                  Track
                </Link>
                <button className="btn btn-sm btn-cyan" onClick={() => setPodFor(l)}>
                  Deliver + e-POD
                </button>
              </>
            )
          }
        />
      )}
      {tab === 'done' && <LoadsTable loads={done} actions={(l) => <span className="small muted">POD: {l.pod?.receivedBy}</span>} />}

      <QuoteModal load={quoting} onClose={() => setQuoting(null)} />
      <Modal open={!!podFor} onClose={() => setPodFor(null)} title={`Proof of delivery · ${podFor?.ref || ''}`}>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!podName.trim()) return;
            deliver(podFor.id, { receivedBy: podName.trim(), at: Date.now() });
            toast(`${podFor.ref} delivered. Quick-pay is queued for 2 business days.`);
            setPodFor(null);
            setPodName('');
          }}
        >
          <div className="field">
            <label htmlFor="pod">Received by (consignee name)</label>
            <input id="pod" className="input" value={podName} onChange={(e) => setPodName(e.target.value)} placeholder="e.g. J. Smith, Receiving dock 3" autoFocus />
          </div>
          <p className="small muted" style={{ margin: 0 }}>The shipper sees the e-POD immediately and quick-pay is triggered.</p>
          <button className="btn btn-primary" disabled={!podName.trim()}>
            Confirm delivery
          </button>
        </form>
      </Modal>
    </>
  );
}

export default function Dashboard() {
  const { role, me } = useStore();
  if (!me) return null;
  return (
    <div className="page">
      <div className="container">
        <Reveal className="section-head" style={{ marginBottom: 28 }}>
          <span className="eyebrow">{role === 'carrier' ? 'Carrier dashboard' : 'Shipper dashboard'}</span>
          <h1 className="h2">
            G’day, <span className="gradient-text">{me.name}</span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            ABN {me.abn} · {me.city}, {me.state} {me.verified ? '· ✓ Verified' : '· Verification pending'}
          </p>
        </Reveal>
        {role === 'carrier' ? <CarrierDash /> : <ShipperDash />}
      </div>
    </div>
  );
}
