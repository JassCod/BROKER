import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { CITIES, EQUIPMENT, STATES, cityByName, formatABN, isValidABN, isValidAUPhone, isValidPostcode } from '../lib/au.js';
import { Reveal, Tilt } from '../components/fx.jsx';

export default function Join() {
  const [params] = useSearchParams();
  const { register, toast, live } = useStore();
  const navigate = useNavigate();
  const [role, setRole] = useState(params.get('role') === 'carrier' ? 'carrier' : 'shipper');
  const [f, setF] = useState({ name: '', abn: '', state: 'NSW', city: '', postcode: '', contact: '', phone: '', email: '', password: '', fleet: 5, equipment: [], nhvas: false, insuredM: 10, confirm: false });
  const [touched, setTouched] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const errors = {};
  if (f.name.trim().length < 2) errors.name = 'Enter your registered business name';
  if (!isValidABN(f.abn)) errors.abn = 'Enter a valid 11-digit Australian Business Number';
  if (!cityByName(f.city) || cityByName(f.city).state !== f.state) errors.city = `Choose a city in ${f.state}`;
  if (!isValidPostcode(f.postcode, f.state)) errors.postcode = `That postcode isn’t in ${f.state}`;
  if (f.contact.trim().length < 2) errors.contact = 'Enter a contact name';
  if (!isValidAUPhone(f.phone)) errors.phone = 'Use an Australian number, e.g. 0412 345 678 or 02 9876 5432';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) errors.email = 'Enter a valid email';
  if (live && f.password.length < 8) errors.password = 'Use at least 8 characters';
  if (role === 'carrier' && !f.equipment.length) errors.equipment = 'Select at least one equipment type';
  if (role === 'carrier' && !(Number(f.fleet) >= 1)) errors.fleet = 'Fleet size must be at least 1';
  if (!f.confirm) errors.confirm = 'Roadtrain is only for Australian businesses';

  const show = (k) => touched && errors[k];
  const input = (k, label, props = {}) => (
    <div className="field">
      <label htmlFor={`j-${k}`}>{label}</label>
      <input id={`j-${k}`} className={`input ${show(k) ? 'invalid' : ''}`} value={f[k]} onChange={set(k)} {...props} />
      {show(k) && <span className="err">{errors[k]}</span>}
    </div>
  );

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    const base = { name: f.name.trim(), abn: formatABN(f.abn), state: f.state, city: f.city, postcode: f.postcode, contact: f.contact.trim(), phone: f.phone.trim(), email: f.email.trim(), password: f.password, confirm: f.confirm };
    const company =
      role === 'carrier'
        ? await register('carrier', { ...base, fleet: Number(f.fleet), equipment: f.equipment, nhvas: f.nhvas, insuredM: Number(f.insuredM), about: `${f.city}-based carrier.` })
        : await register('shipper', base);
    if (!company) return;
    toast(`Welcome aboard, ${company.name}! Your ABN passed the checksum. Registry verification is pending.`);
    navigate(role === 'carrier' ? '/loads' : '/post');
  };

  const abnOk = isValidABN(f.abn);
  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 880 }}>
        <Reveal className="section-head" style={{ marginBottom: 28 }}>
          <span className="eyebrow">Join Roadtrain · Australia only</span>
          <h1 className="h2">
            Create your <span className="gradient-text">{role === 'carrier' ? 'carrier' : 'shipper'}</span> account
          </h1>
          <p className="lead">Open to businesses registered in Australia with an active ABN. Overseas companies can’t sign up.</p>
        </Reveal>

        <Tilt className="card" max={2}>
          <form className="stack" style={{ gap: 18 }} onSubmit={submit} noValidate>
            <div className="seg">
              <button type="button" className={role === 'shipper' ? 'on' : ''} onClick={() => setRole('shipper')}>
                I ship freight
              </button>
              <button type="button" className={role === 'carrier' ? 'on' : ''} onClick={() => setRole('carrier')}>
                I run trucks
              </button>
            </div>

            <div className="grid grid-2">
              {input('name', 'Registered business name', { placeholder: 'e.g. Southern Freight Pty Ltd' })}
              <div className="field">
                <label htmlFor="j-abn">ABN</label>
                <input id="j-abn" className={`input mono ${show('abn') ? 'invalid' : ''}`} inputMode="numeric" placeholder="51 824 753 556" value={f.abn} onChange={set('abn')} onBlur={() => abnOk && setF((s) => ({ ...s, abn: formatABN(s.abn) }))} />
                {abnOk ? <span className="ok-text">✓ ABN checksum valid</span> : show('abn') && <span className="err">{errors.abn}</span>}
              </div>
            </div>

            <div className="grid grid-3">
              <div className="field">
                <label htmlFor="j-country">Country</label>
                <input id="j-country" className="input" value="Australia" disabled />
              </div>
              <div className="field">
                <label htmlFor="j-state">State / territory</label>
                <select id="j-state" className="select" value={f.state} onChange={(e) => setF((s) => ({ ...s, state: e.target.value, city: '' }))}>
                  {STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="j-city">Base city</label>
                <select
                  id="j-city"
                  className={`select ${show('city') ? 'invalid' : ''}`}
                  value={f.city}
                  onChange={(e) => {
                    const c = cityByName(e.target.value);
                    setF((s) => ({ ...s, city: e.target.value, postcode: c ? c.postcode : s.postcode }));
                  }}
                >
                  <option value="">Select…</option>
                  {CITIES.filter((c) => c.state === f.state).map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </select>
                {show('city') && <span className="err">{errors.city}</span>}
              </div>
            </div>

            <div className="grid grid-2">
              {input('postcode', 'Postcode', { inputMode: 'numeric', maxLength: 4, placeholder: '2000' })}
              {input('contact', 'Contact name')}
            </div>
            <div className="grid grid-2">
              {input('phone', 'Phone (Australian)', { type: 'tel', placeholder: '0412 345 678' })}
              {input('email', 'Work email', { type: 'email', autoComplete: 'email' })}
            </div>
            {live && (
              <div className="grid grid-2">
                {input('password', 'Password (8+ characters)', { type: 'password', autoComplete: 'new-password' })}
              </div>
            )}

            {role === 'carrier' && (
              <>
                <div className="field">
                  <label>Equipment you operate</label>
                  <div className="chips">
                    {EQUIPMENT.map((e) => (
                      <button
                        type="button"
                        key={e.id}
                        className={`chip ${f.equipment.includes(e.id) ? 'on' : ''}`}
                        onClick={() => setF((s) => ({ ...s, equipment: s.equipment.includes(e.id) ? s.equipment.filter((x) => x !== e.id) : [...s.equipment, e.id] }))}
                      >
                        {e.name}
                      </button>
                    ))}
                  </div>
                  {show('equipment') && <span className="err">{errors.equipment}</span>}
                </div>
                <div className="grid grid-2">
                  {input('fleet', 'Fleet size (prime movers / rigids)', { type: 'number', min: 1 })}
                  <div className="field">
                    <label htmlFor="j-ins">Public liability / freight cover</label>
                    <select id="j-ins" className="select" value={f.insuredM} onChange={set('insuredM')}>
                      {[5, 10, 20].map((n) => (
                        <option key={n} value={n}>
                          ${n} million
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="check">
                  <input type="checkbox" checked={f.nhvas} onChange={set('nhvas')} />
                  We hold NHVAS accreditation (mass, maintenance and/or BFM)
                </label>
              </>
            )}

            <label className="check">
              <input type="checkbox" checked={f.confirm} onChange={set('confirm')} />
              <span>
                I confirm this business is registered in Australia, operates in Australia
                {role === 'carrier' ? ' and complies with the Heavy Vehicle National Law and Chain of Responsibility obligations' : ''}.
              </span>
            </label>
            {show('confirm') && <span className="err">{errors.confirm}</span>}

            <div className="info-box">
              Checks on this form: ABN checksum, postcode against state, Australian phone format. A production build would
              also query the Australian Business Register (ABR) and the NHVR.
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              Create account →
            </button>
          </form>
        </Tilt>
      </div>
    </div>
  );
}
