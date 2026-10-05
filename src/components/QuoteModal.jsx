import { useEffect, useState } from 'react';
import { Modal } from './ui.jsx';
import { useStore } from '../lib/store.jsx';
import { GST_RATE, aud, cityByName, estimateRate } from '../lib/au.js';

export default function QuoteModal({ load, onClose }) {
  const { submitQuote, toast } = useStore();
  const [amount, setAmount] = useState('');
  const [eta, setEta] = useState('');
  const [message, setMessage] = useState('');
  const est = load
    ? estimateRate({ origin: cityByName(load.origin), destination: cityByName(load.destination), equipmentId: load.equipment, weightT: load.weightT })
    : null;

  useEffect(() => {
    if (load) {
      setAmount(String(load.targetRate));
      setEta(String(est?.days || 1));
      setMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load?.id]);

  const n = Number(amount);
  const valid = n >= 100 && Number(eta) >= 1;
  return (
    <Modal open={!!load} onClose={onClose} title={load ? `Quote ${load.ref} · ${load.origin} → ${load.destination}` : ''}>
      {load && (
        <form
          className="stack"
          style={{ gap: 16 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            submitQuote(load.id, n, message, eta);
            toast(`Quote of ${aud(n)} sent to shipper`);
            onClose();
          }}
        >
          {est && (
            <div className="info-box">
              Market band for this lane: <b>{aud(est.low)}</b> to <b>{aud(est.high)}</b> ({est.km.toLocaleString('en-AU')} km, about ${est.perKm}/km).
              Shipper target: <b>{aud(load.targetRate)}</b>.
            </div>
          )}
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="q-amt">Your rate (AUD, ex GST)</label>
              <input id="q-amt" className={`input ${!valid && amount ? 'invalid' : ''}`} type="number" min="100" step="10" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <span className="small muted">+ GST {aud(n * GST_RATE)} = {aud(n * (1 + GST_RATE))}</span>
            </div>
            <div className="field">
              <label htmlFor="q-eta">Transit (days)</label>
              <input id="q-eta" className="input" type="number" min="1" max="14" value={eta} onChange={(e) => setEta(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="q-msg">Note to shipper</label>
            <textarea id="q-msg" className="textarea" placeholder="Truck availability, pickup window, depot…" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={!valid}>
            Send quote
          </button>
        </form>
      )}
    </Modal>
  );
}
