import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { SEED_CARRIERS, SEED_LOADS, SEED_QUOTES, SEED_SHIPPERS } from './seed.js';

const KEY = 'roadtrain-exchange-v1';
// Demo tracking runs on compressed time so a trip finishes in a few minutes.
export const DEMO_TRANSIT_MS = 4 * 60_000;

const initial = () => ({
  session: { role: 'shipper', id: 'shp-1' },
  shippers: SEED_SHIPPERS,
  carriers: SEED_CARRIERS,
  loads: SEED_LOADS,
  quotes: SEED_QUOTES,
  toasts: [],
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...JSON.parse(raw), toasts: [] };
  } catch {
    /* storage unavailable */
  }
  return initial();
}

const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function reducer(state, action) {
  switch (action.type) {
    case 'session':
      return { ...state, session: action.session };
    case 'register': {
      const key = action.role === 'carrier' ? 'carriers' : 'shippers';
      return {
        ...state,
        [key]: [action.company, ...state[key]],
        session: { role: action.role, id: action.company.id },
      };
    }
    case 'postLoad':
      return { ...state, loads: [action.load, ...state.loads] };
    case 'invite':
      return {
        ...state,
        loads: state.loads.map((l) =>
          l.id === action.loadId
            ? { ...l, invitedCarrierIds: [...new Set([...l.invitedCarrierIds, ...action.carrierIds])] }
            : l,
        ),
      };
    case 'quote': {
      const others = state.quotes.filter(
        (q) => !(q.loadId === action.quote.loadId && q.carrierId === action.quote.carrierId && q.status === 'pending'),
      );
      return { ...state, quotes: [action.quote, ...others] };
    }
    case 'acceptQuote': {
      const q = state.quotes.find((x) => x.id === action.quoteId);
      if (!q) return state;
      return {
        ...state,
        quotes: state.quotes.map((x) =>
          x.loadId === q.loadId ? { ...x, status: x.id === q.id ? 'accepted' : 'declined' } : x,
        ),
        loads: state.loads.map((l) =>
          l.id === q.loadId ? { ...l, status: 'booked', bookedCarrierId: q.carrierId, agreedRate: q.amount } : l,
        ),
      };
    }
    case 'declineQuote':
      return { ...state, quotes: state.quotes.map((x) => (x.id === action.quoteId ? { ...x, status: 'declined' } : x)) };
    case 'pickup':
      return {
        ...state,
        loads: state.loads.map((l) => (l.id === action.loadId ? { ...l, status: 'in_transit', pickedUpAt: Date.now() } : l)),
      };
    case 'deliver':
      return {
        ...state,
        loads: state.loads.map((l) =>
          l.id === action.loadId ? { ...l, status: 'delivered', deliveredAt: Date.now(), pod: action.pod } : l,
        ),
      };
    case 'cancel':
      return { ...state, loads: state.loads.map((l) => (l.id === action.loadId ? { ...l, status: 'cancelled' } : l)) };
    case 'toast':
      return { ...state, toasts: [...state.toasts, action.toast] };
    case 'dismissToast':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    case 'reset':
      return initial();
    default:
      return state;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      const { toasts, ...persist } = state;
      localStorage.setItem(KEY, JSON.stringify(persist));
    } catch {
      /* storage unavailable */
    }
  }, [state]);

  const toast = useCallback((message, tone = 'ok') => {
    const id = uid('t');
    dispatch({ type: 'toast', toast: { id, message, tone } });
    setTimeout(() => dispatch({ type: 'dismissToast', id }), 3800);
  }, []);

  const api = useMemo(() => {
    const me =
      state.session.role === 'carrier'
        ? state.carriers.find((c) => c.id === state.session.id)
        : state.shippers.find((s) => s.id === state.session.id);
    return {
      state,
      me,
      role: state.session.role,
      toast,
      carrier: (id) => state.carriers.find((c) => c.id === id),
      shipper: (id) => state.shippers.find((s) => s.id === id),
      loadById: (id) => state.loads.find((l) => l.id === id),
      quotesFor: (loadId) => state.quotes.filter((q) => q.loadId === loadId),
      setSession: (role, id) => dispatch({ type: 'session', session: { role, id } }),
      register: (role, data) => {
        const company = { ...data, id: uid(role === 'carrier' ? 'car' : 'shp'), verified: false };
        if (role === 'carrier') Object.assign(company, { rating: 0, reviews: 0, onTime: 0, hue: Math.floor(Math.random() * 360), lanes: [] });
        dispatch({ type: 'register', role, company });
        return company;
      },
      postLoad: (data) => {
        const l = {
          ...data,
          id: uid('ld'),
          ref: `RT-${Math.floor(30000 + Math.random() * 60000)}`,
          shipperId: state.session.id,
          status: 'open',
          bookedCarrierId: null,
          createdAt: Date.now(),
          pickedUpAt: null,
          deliveredAt: null,
          pod: null,
        };
        dispatch({ type: 'postLoad', load: l });
        return l;
      },
      invite: (loadId, carrierIds) => dispatch({ type: 'invite', loadId, carrierIds }),
      submitQuote: (loadId, amount, message, etaDays) =>
        dispatch({
          type: 'quote',
          quote: { id: uid('q'), loadId, carrierId: state.session.id, amount: Number(amount), message, etaDays: Number(etaDays), status: 'pending', createdAt: Date.now() },
        }),
      // Instant book: the carrier takes the load at the shipper's posted rate.
      bookNow: (load) => {
        const id = uid('q');
        dispatch({
          type: 'quote',
          quote: { id, loadId: load.id, carrierId: state.session.id, amount: load.targetRate, message: 'Booked instantly at posted rate.', etaDays: 0, status: 'pending', createdAt: Date.now() },
        });
        dispatch({ type: 'acceptQuote', quoteId: id });
      },
      acceptQuote: (quoteId) => dispatch({ type: 'acceptQuote', quoteId }),
      declineQuote: (quoteId) => dispatch({ type: 'declineQuote', quoteId }),
      pickup: (loadId) => dispatch({ type: 'pickup', loadId }),
      deliver: (loadId, pod) => dispatch({ type: 'deliver', loadId, pod }),
      cancel: (loadId) => dispatch({ type: 'cancel', loadId }),
      dismissToast: (id) => dispatch({ type: 'dismissToast', id }),
      reset: () => dispatch({ type: 'reset' }),
    };
  }, [state, toast]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

export function transitProgress(load, now = Date.now()) {
  if (load.status === 'delivered') return 1;
  if (load.status !== 'in_transit' || !load.pickedUpAt) return 0;
  return Math.min(0.97, (now - load.pickedUpAt) / DEMO_TRANSIT_MS);
}
