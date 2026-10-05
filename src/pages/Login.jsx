import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { Reveal, Tilt } from '../components/fx.jsx';

const DEMO = [
  ['Shipper · Coastal Produce Co', 'freight@coastalproduce.example'],
  ['Carrier · Harbour City Logistics', 'ops@harbourcitylogistics.example'],
  ['Carrier · Cold Chain Couriers', 'ops@coldchaincouriers.example'],
];

export default function Login() {
  const { login, live, me, logout } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e, creds = { email, password }) => {
    e?.preventDefault();
    setBusy(true);
    const company = await login(creds.email, creds.password);
    setBusy(false);
    if (company) navigate(company.role === 'carrier' ? '/loads' : '/dashboard');
  };

  if (!live) {
    return (
      <div className="page container">
        <div className="glass empty">
          This is the demo build. Use the “Acting as” menu to switch between shipper and carrier accounts.
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 520 }}>
        <Reveal className="section-head" style={{ marginBottom: 24 }}>
          <span className="eyebrow">Welcome back</span>
          <h1 className="h2">Log in to <span className="gradient-text">Roadtrain</span></h1>
        </Reveal>
        <Tilt className="card" max={2}>
          {me ? (
            <div className="stack">
              <p style={{ margin: 0 }}>You’re logged in as <b>{me.name}</b>.</p>
              <div className="row">
                <Link to="/dashboard" className="btn btn-primary">Go to dashboard</Link>
                <button className="btn" onClick={logout}>Log out</button>
              </div>
            </div>
          ) : (
            <form className="stack" style={{ gap: 16 }} onSubmit={submit}>
              <div className="field">
                <label htmlFor="l-email">Email</label>
                <input id="l-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="l-pw">Password</label>
                <input id="l-pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button className="btn btn-primary" disabled={busy || !email || !password}>{busy ? 'Logging in…' : 'Log in'}</button>
              <p className="small muted" style={{ margin: 0 }}>
                New to Roadtrain? <Link to="/join" style={{ color: 'var(--orange)' }}>Create an account</Link>
              </p>
            </form>
          )}
        </Tilt>
        {!me && (
          <div className="glass card stack" style={{ marginTop: 20 }}>
            <b>Try a demo account</b>
            <span className="small muted">These sample companies come with the starter data (password <span className="mono">roadtrain-demo</span>).</span>
            {DEMO.map(([label, demoEmail]) => (
              <button key={demoEmail} className="btn btn-sm" style={{ justifyContent: 'space-between' }} disabled={busy} onClick={(e) => submit(e, { email: demoEmail, password: 'roadtrain-demo' })}>
                {label}
                <span className="small dim">{demoEmail}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
