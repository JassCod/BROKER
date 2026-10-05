import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../lib/store.jsx';
import { EQUIPMENT, STATES, aud, cityByName, roadDistanceKm } from '../lib/au.js';
import { CityField, LoadCard } from '../components/ui.jsx';
import { Reveal } from '../components/fx.jsx';
import QuoteModal from '../components/QuoteModal.jsx';

export default function LoadBoard() {
  const { state, role, me, bookNow, toast } = useStore();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [fromState, setFromState] = useState('');
  const [toState, setToState] = useState('');
  const [equip, setEquip] = useState([]);
  const [minPerKm, setMinPerKm] = useState(0);
  const [sort, setSort] = useState('new');
  const [emptyAt, setEmptyAt] = useState(params.get('backhaul') && role === 'carrier' ? me?.city || '' : '');
  const [quoting, setQuoting] = useState(null);

  const toggleEq = (id) => setEquip((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const rows = useMemo(() => {
    const here = cityByName(emptyAt);
    return state.loads
      .filter((l) => l.status === 'open')
      // Invite-only loads are visible to the invited carriers and to their own shipper.
      .filter((l) =>
        l.visibility === 'public' ||
        (role === 'carrier' && l.invitedCarrierIds.includes(me?.id)) ||
        (role === 'shipper' && l.shipperId === me?.id),
      )
      .map((l) => {
        const o = cityByName(l.origin);
        const d = cityByName(l.destination);
        const km = roadDistanceKm(o, d);
        return { load: l, o, d, km, perKm: km ? l.targetRate / km : 0, deadhead: here && o ? roadDistanceKm(here, o) : null };
      })
      .filter(({ load, o, d, perKm }) => {
        const text = `${load.origin} ${load.destination} ${load.commodity} ${load.ref}`.toLowerCase();
        return (
          (!q || text.includes(q.toLowerCase())) &&
          (!fromState || o?.state === fromState) &&
          (!toState || d?.state === toState) &&
          (!equip.length || equip.includes(load.equipment)) &&
          perKm >= minPerKm
        );
      })
      .sort((a, b) => {
        if (here) return a.deadhead - b.deadhead;
        if (sort === 'rate') return b.load.targetRate - a.load.targetRate;
        if (sort === 'perkm') return b.perKm - a.perKm;
        if (sort === 'pickup') return a.load.pickupDate.localeCompare(b.load.pickupDate);
        return b.load.createdAt - a.load.createdAt;
      });
  }, [state.loads, role, me, q, fromState, toState, equip, minPerKm, sort, emptyAt]);

  const mine = (l) => role === 'shipper' && l.shipperId === me?.id;

  return (
    <div className="page">
      <div className="container">
        <Reveal className="section-head" style={{ marginBottom: 32 }}>
          <span className="eyebrow">Load board</span>
          <h1 className="h2">
            {rows.length} open loads <span className="gradient-text">across Australia</span>
          </h1>
          <p className="lead">
            Filter by lane, equipment and rate per km. {role === 'carrier' ? 'Quote, or book instantly at the posted rate.' : 'Switch to a carrier in the menu to quote or book.'}
          </p>
        </Reveal>

        <div className="board-layout">
          <aside className="glass filters">
            <div className="field">
              <label htmlFor="f-q">Search</label>
              <input id="f-q" className="input" placeholder="City, commodity, ref…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="grid grid-2" style={{ gap: 10 }}>
              <div className="field">
                <label htmlFor="f-from">From state</label>
                <select id="f-from" className="select" value={fromState} onChange={(e) => setFromState(e.target.value)}>
                  <option value="">Any</option>
                  {STATES.map((s) => (
                    <option key={s.code}>{s.code}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="f-to">To state</label>
                <select id="f-to" className="select" value={toState} onChange={(e) => setToState(e.target.value)}>
                  <option value="">Any</option>
                  {STATES.map((s) => (
                    <option key={s.code}>{s.code}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Equipment</label>
              <div className="chips">
                {EQUIPMENT.map((e) => (
                  <button key={e.id} type="button" className={`chip ${equip.includes(e.id) ? 'on' : ''}`} onClick={() => toggleEq(e.id)}>
                    {e.short}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="f-km">Min rate: ${minPerKm.toFixed(2)}/km</label>
              <input id="f-km" type="range" min="0" max="6" step="0.25" value={minPerKm} onChange={(e) => setMinPerKm(Number(e.target.value))} style={{ accentColor: 'var(--orange)' }} />
            </div>
            <div className="field">
              <label htmlFor="f-sort">Sort by</label>
              <select id="f-sort" className="select" value={sort} onChange={(e) => setSort(e.target.value)} disabled={!!emptyAt}>
                <option value="new">Newest</option>
                <option value="rate">Highest rate</option>
                <option value="perkm">Best $/km</option>
                <option value="pickup">Soonest pickup</option>
              </select>
            </div>
            <div className="glass" style={{ padding: 14, borderColor: 'rgba(255,122,24,.3)' }}>
              <CityField label="↩ Backhaul: my truck is empty at" value={emptyAt} onChange={setEmptyAt} />
              <p className="small muted" style={{ margin: '8px 0 0' }}>
                {emptyAt ? 'Sorted by deadhead km to pickup.' : 'Pick a city to rank loads by the empty run to pickup.'}
              </p>
            </div>
          </aside>

          <div className="stack" style={{ gap: 16 }}>
            <AnimatePresence mode="popLayout">
              {rows.map(({ load, km, deadhead }) => (
                <motion.div key={load.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                  <LoadCard load={load} km={km} invited={role === 'carrier' && load.invitedCarrierIds.includes(me?.id)}>
                    {deadhead !== null && (
                      <span className="badge private" title="Empty kilometres from your truck to pickup">
                        {deadhead.toLocaleString('en-AU')} km deadhead
                      </span>
                    )}
                    {role === 'carrier' ? (
                      <>
                        <button className="btn btn-sm" onClick={() => setQuoting(load)}>
                          Quote
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            bookNow(load);
                            toast(`Booked ${load.ref} at ${aud(load.targetRate)}. See your dashboard.`);
                          }}
                        >
                          Book now
                        </button>
                      </>
                    ) : mine(load) ? (
                      <Link to="/dashboard" className="btn btn-sm">
                        View quotes
                      </Link>
                    ) : null}
                  </LoadCard>
                </motion.div>
              ))}
            </AnimatePresence>
            {!rows.length && (
              <div className="glass empty">
                No loads match these filters. <Link to="/post" style={{ color: 'var(--orange)' }}>Post one</Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <QuoteModal load={quoting} onClose={() => setQuoting(null)} />
    </div>
  );
}
