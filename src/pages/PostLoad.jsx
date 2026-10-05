import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../lib/store.jsx';
import { EQUIPMENT, GST_RATE, aud, cityByName, equipmentById, estimateRate, routeWarnings } from '../lib/au.js';
import { CarrierAvatar, CityField, Lane } from '../components/ui.jsx';
import { Reveal, Stars, Tilt } from '../components/fx.jsx';

const STEPS = ['Route', 'Freight', 'Carriers', 'Review'];
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (d, n) => new Date(new Date(d).getTime() + n * 86400000).toISOString().slice(0, 10);

export default function PostLoad() {
  const { state, role, me, setSession, postLoad, toast } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState(() => ({
    origin: params.get('from') || '',
    destination: params.get('to') || '',
    pickupDate: plusDays(today(), 1),
    deliveryDate: plusDays(today(), 3),
    equipment: params.get('eq') || 'semi-taut',
    weightT: 12,
    pallets: 16,
    commodity: '',
    notes: '',
    visibility: params.get('invite') ? 'private' : 'public',
    invitedCarrierIds: params.get('invite') ? params.get('invite').split(',').filter(Boolean) : [],
    targetRate: '',
  }));
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v?.target ? v.target.value : v }));

  const o = cityByName(f.origin);
  const d = cityByName(f.destination);
  const est = estimateRate({ origin: o, destination: d, equipmentId: f.equipment, weightT: f.weightT });
  const warnings = routeWarnings({ origin: o, destination: d, equipmentId: f.equipment, weightT: f.weightT });
  const rate = Number(f.targetRate || est?.mid || 0);

  const errors = useMemo(() => {
    const e = {};
    if (!o) e.origin = 'Choose an Australian pickup city';
    if (!d) e.destination = 'Choose an Australian delivery city';
    if (o && d && o.name === d.name) e.destination = 'Delivery must differ from pickup';
    if (!f.pickupDate || f.pickupDate < today()) e.pickupDate = 'Pickup cannot be in the past';
    if (f.deliveryDate < f.pickupDate) e.deliveryDate = 'Delivery must be after pickup';
    if (!(Number(f.weightT) > 0)) e.weightT = 'Enter a weight in tonnes';
    if (!f.commodity.trim()) e.commodity = 'Describe the freight';
    if (f.visibility === 'private' && !f.invitedCarrierIds.length) e.invited = 'Select at least one carrier';
    if (rate < 100) e.targetRate = 'Enter a target rate';
    return e;
  }, [o, d, f, rate]);

  const stepFields = [['origin', 'destination', 'pickupDate', 'deliveryDate'], ['weightT', 'commodity'], ['invited', 'targetRate'], []];
  const stepValid = (i) => !stepFields[i].some((k) => errors[k]);
  const [touched, setTouched] = useState(false);

  const matches = useMemo(
    () =>
      state.carriers
        .map((c) => ({ c, score: (c.equipment.includes(f.equipment) ? 3 : 0) + (o && c.state === o.state ? 2 : 0) + (d && c.state === d.state ? 1 : 0) + c.rating / 5 }))
        .sort((a, b) => b.score - a.score),
    [state.carriers, f.equipment, o, d],
  );
  const toggleCarrier = (id) =>
    setF((s) => ({ ...s, invitedCarrierIds: s.invitedCarrierIds.includes(id) ? s.invitedCarrierIds.filter((x) => x !== id) : [...s.invitedCarrierIds, id] }));

  if (role !== 'shipper') {
    return (
      <div className="page container">
        <div className="glass empty stack" style={{ alignItems: 'center' }}>
          <h2 className="h3">Posting loads is for shippers</h2>
          <p>You’re signed in as a carrier. Switch to a shipper account to post freight.</p>
          <button className="btn btn-primary" onClick={() => setSession('shipper', state.shippers[0].id)}>
            Switch to {state.shippers[0].name}
          </button>
        </div>
      </div>
    );
  }

  const next = () => {
    setTouched(true);
    if (stepValid(step)) {
      setTouched(false);
      setStep((s) => Math.min(3, s + 1));
    }
  };
  const submit = () => {
    if (Object.keys(errors).length) return;
    const l = postLoad({
      origin: o.name,
      destination: d.name,
      pickupDate: f.pickupDate,
      deliveryDate: f.deliveryDate,
      equipment: f.equipment,
      weightT: Number(f.weightT),
      pallets: equipmentById(f.equipment).pallets ? Number(f.pallets) || null : null,
      commodity: f.commodity.trim(),
      notes: f.notes.trim(),
      visibility: f.visibility,
      invitedCarrierIds: f.visibility === 'private' ? f.invitedCarrierIds : [],
      targetRate: rate,
    });
    toast(f.visibility === 'private' ? `${l.ref} sent to ${f.invitedCarrierIds.length} selected carrier(s)` : `${l.ref} is live on the load board`);
    navigate('/dashboard');
  };
  const err = (k) => touched && errors[k];

  return (
    <div className="page">
      <div className="container">
        <Reveal className="section-head" style={{ marginBottom: 28 }}>
          <span className="eyebrow">Post a load · {me?.name}</span>
          <h1 className="h2">
            Tell us what’s moving. <span className="gradient-text">We’ll price it live.</span>
          </h1>
        </Reveal>

        <div className="board-layout post-layout">
          <div className="glass card">
            <div className="stepper" aria-label={`Step ${step + 1} of 4`}>
              {STEPS.map((s, i) => (
                <div key={s} className={i <= step ? 'done' : ''} />
              ))}
            </div>
            <div className="row" style={{ marginBottom: 22, gap: 18 }}>
              {STEPS.map((s, i) => (
                <button key={s} className={`btn btn-sm ${i === step ? 'btn-primary' : 'btn-ghost'}`} onClick={() => (i < step || stepValid(step)) && setStep(i)} disabled={i > step && !stepValid(step)}>
                  {i + 1}. {s}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 40, rotateY: -8 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} exit={{ opacity: 0, x: -40, rotateY: 8 }} transition={{ duration: 0.35 }} className="stack" style={{ gap: 18 }}>
                {step === 0 && (
                  <>
                    <div className="grid grid-2">
                      <CityField label="Pickup city" value={f.origin} onChange={set('origin')} error={err('origin')} />
                      <CityField label="Delivery city" value={f.destination} onChange={set('destination')} error={err('destination')} />
                    </div>
                    <div className="grid grid-2">
                      <div className="field">
                        <label htmlFor="p-pick">Pickup date</label>
                        <input id="p-pick" type="date" min={today()} className="input" value={f.pickupDate} onChange={set('pickupDate')} />
                        {err('pickupDate') && <span className="err">{errors.pickupDate}</span>}
                      </div>
                      <div className="field">
                        <label htmlFor="p-del">Deliver by</label>
                        <input id="p-del" type="date" min={f.pickupDate} className="input" value={f.deliveryDate} onChange={set('deliveryDate')} />
                        {err('deliveryDate') && <span className="err">{errors.deliveryDate}</span>}
                      </div>
                    </div>
                    <p className="small dim" style={{ margin: 0 }}>Pickup and delivery must both be in Australia. Interstate Tasmania freight is routed via the Spirit of Tasmania.</p>
                  </>
                )}

                {step === 1 && (
                  <>
                    <div className="field">
                      <label>Equipment</label>
                      <div className="grid grid-3" style={{ gap: 10 }}>
                        {EQUIPMENT.map((e) => (
                          <button key={e.id} type="button" className={`glass card ${f.equipment === e.id ? 'select-ring' : ''}`} style={{ padding: 14, textAlign: 'left', cursor: 'pointer' }} onClick={() => set('equipment')(e.id)}>
                            <b>{e.short}</b>
                            <div className="small muted">
                              ≤{e.payload} t{e.pallets ? ` · ${e.pallets} plt` : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-2">
                      <div className="field">
                        <label htmlFor="p-w">Weight (tonnes)</label>
                        <input id="p-w" type="number" min="0.1" step="0.1" className={`input ${err('weightT') ? 'invalid' : ''}`} value={f.weightT} onChange={set('weightT')} />
                        {err('weightT') && <span className="err">{errors.weightT}</span>}
                      </div>
                      {equipmentById(f.equipment).pallets > 0 && (
                        <div className="field">
                          <label htmlFor="p-p">Pallets (Australian standard 1165 × 1165)</label>
                          <input id="p-p" type="number" min="0" max={equipmentById(f.equipment).pallets} className="input" value={f.pallets} onChange={set('pallets')} />
                        </div>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="p-c">Commodity</label>
                      <input id="p-c" className={`input ${err('commodity') ? 'invalid' : ''}`} placeholder="e.g. Palletised beverages, structural steel" value={f.commodity} onChange={set('commodity')} />
                      {err('commodity') && <span className="err">{errors.commodity}</span>}
                    </div>
                    <div className="field">
                      <label htmlFor="p-n">Notes for carriers</label>
                      <textarea id="p-n" className="textarea" placeholder="Forklift on site, booking times, dangerous goods class…" value={f.notes} onChange={set('notes')} />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="seg" role="tablist">
                      <button className={f.visibility === 'public' ? 'on' : ''} onClick={() => set('visibility')('public')}>
                        Public load board
                      </button>
                      <button className={f.visibility === 'private' ? 'on' : ''} onClick={() => set('visibility')('private')}>
                        Selected carriers only
                      </button>
                    </div>
                    <p className="muted small" style={{ margin: 0 }}>
                      {f.visibility === 'public'
                        ? 'Every verified Australian carrier can see and quote this load.'
                        : 'Only the carriers you tick below will see this load and can quote.'}
                    </p>
                    {f.visibility === 'private' && (
                      <div className="stack" style={{ gap: 10 }}>
                        {matches.map(({ c, score }) => {
                          const on = f.invitedCarrierIds.includes(c.id);
                          return (
                            <label key={c.id} className={`glass row ${on ? 'select-ring' : ''}`} style={{ padding: 12, cursor: 'pointer' }}>
                              <input type="checkbox" checked={on} onChange={() => toggleCarrier(c.id)} style={{ accentColor: 'var(--orange)' }} />
                              <CarrierAvatar carrier={c} />
                              <div style={{ flex: 1, minWidth: 160 }}>
                                <b>{c.name}</b>
                                <div className="small muted">
                                  {c.city}, {c.state} · {c.reviews ? <Stars value={c.rating} /> : 'New'}
                                </div>
                              </div>
                              {score >= 5 && <span className="badge ok">Best match</span>}
                              {!c.equipment.includes(f.equipment) && <span className="badge pending">No {equipmentById(f.equipment).short}</span>}
                            </label>
                          );
                        })}
                        {err('invited') && <span className="err">{errors.invited}</span>}
                      </div>
                    )}
                    <div className="field">
                      <label htmlFor="p-r">Target rate (AUD, ex GST)</label>
                      <input id="p-r" type="number" min="100" step="10" className={`input ${err('targetRate') ? 'invalid' : ''}`} placeholder={est ? String(est.mid) : ''} value={f.targetRate} onChange={set('targetRate')} />
                      <span className="small muted">Leave blank to use the market rate {est ? aud(est.mid) : ''}. Carriers can book instantly at this price or counter-quote.</span>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <div className="stack" style={{ gap: 16 }}>
                    <Lane from={f.origin} to={f.destination} km={est?.km} />
                    <div className="kv"><span className="muted">Dates</span><b>{f.pickupDate} → {f.deliveryDate}</b></div>
                    <div className="kv"><span className="muted">Equipment</span><b>{equipmentById(f.equipment).name}</b></div>
                    <div className="kv"><span className="muted">Freight</span><b>{f.commodity} · {f.weightT} t</b></div>
                    <div className="kv"><span className="muted">Audience</span><b>{f.visibility === 'public' ? 'Public load board' : `${f.invitedCarrierIds.length} selected carrier(s)`}</b></div>
                    <div className="kv"><span className="muted">Target rate</span><b>{aud(rate)} + GST {aud(rate * GST_RATE)}</b></div>
                    {Object.keys(errors).length > 0 && <div className="warn-box">Go back and fix: {Object.values(errors).join(' · ')}</div>}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="row between" style={{ marginTop: 28 }}>
              <button className="btn btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                ← Back
              </button>
              {step < 3 ? (
                <button className="btn btn-primary" onClick={next}>
                  Continue →
                </button>
              ) : (
                <button className="btn btn-primary" onClick={submit} disabled={Object.keys(errors).length > 0}>
                  {f.visibility === 'private' ? 'Send to selected carriers' : 'Publish load'}
                </button>
              )}
            </div>
          </div>

          <aside className="stack post-aside" style={{ gap: 16 }}>
            <Tilt className="card border-glow">
              <div className="lift stack" style={{ gap: 10 }}>
                <span className="eyebrow">Live market rate</span>
                {est ? (
                  <>
                    <div className="price gradient-text" style={{ fontSize: '2.4rem' }}>{aud(est.mid)}</div>
                    <span className="muted small">
                      Band {aud(est.low)} – {aud(est.high)} · ${est.perKm}/km
                    </span>
                    <div className="kv"><span className="muted">Road distance</span><b>{est.km.toLocaleString('en-AU')} km</b></div>
                    <div className="kv"><span className="muted">Typical transit</span><b>{est.days} day{est.days > 1 ? 's' : ''}</b></div>
                    <div className="kv"><span className="muted">GST (10%)</span><b>{aud(est.gst)}</b></div>
                    {est.ferry && <div className="kv"><span className="muted">Bass Strait ferry</span><b>Included</b></div>}
                  </>
                ) : (
                  <span className="muted">Pick a pickup and delivery city to see pricing.</span>
                )}
              </div>
            </Tilt>
            {warnings.length > 0 && (
              <div className="warn-box">
                {warnings.map((w) => (
                  <span key={w}>⚠ {w}</span>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
