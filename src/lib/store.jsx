import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
    case 'serverState': {
      const { me, shippers, carriers, loads, quotes } = action.data;
      return {
        ...state,
        ready: true,
        session: me ? { role: me.role, id: me.company.id } : { role: null, id: null },
        shippers,
        carriers,
        loads,
        quotes,
      };
    }
    default:
      return state;
  }
}

const Ctx = createContext(null);

// Live mode talks to the Roadtrain API; without VITE_API_URL the site runs as a self-contained demo.
export const API_URL = import.meta.env?.VITE_API_URL || '';
export const LIVE = !!API_URL;
const TOKEN_KEY = 'roadtrain-token';
const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
};
const writeToken = (t) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

async function request(path, { body, token } = {}) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Can’t reach Roadtrain right now. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const liveInitial = () => ({ session: { role: null, id: null }, shippers: [], carriers: [], loads: [], quotes: [], toasts: [], ready: false });

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, LIVE ? liveInitial : load);
  const tokenRef = useRef(LIVE ? readToken() : '');

  useEffect(() => {
    if (LIVE) return;
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

  const refresh = useCallback(async () => {
    try {
      const data = await request('/state', { token: tokenRef.current });
      if (!data.me && tokenRef.current) {
        tokenRef.current = '';
        writeToken('');
      }
      dispatch({ type: 'serverState', data });
    } catch (e) {
      dispatch({ type: 'serverState', data: { me: null, shippers: [], carriers: [], loads: [], quotes: [] } });
      toast(e.message, 'warn');
    }
  }, [toast]);

  // Pull fresh state every 15 seconds, on page changes and when the tab regains focus,
  // so new quotes, bookings and pickups show up without a reload.
  const { pathname } = useLocation();
  useEffect(() => {
    if (LIVE) refresh();
  }, [refresh, pathname]);
  useEffect(() => {
    if (!LIVE) return undefined;
    const t = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  const api = useMemo(() => {
    const me =
      state.session.role === 'carrier'
        ? state.carriers.find((c) => c.id === state.session.id)
        : state.shippers.find((s) => s.id === state.session.id);

    // Runs a server call, refreshes state, and reports errors as a toast. Resolves to null on failure.
    const remote = async (path, body) => {
      try {
        const out = await request(path, { body: body || {}, token: tokenRef.current });
        await refresh();
        return out;
      } catch (e) {
        toast(e.message, 'warn');
        return null;
      }
    };
    const local = (action, value = true) => {
      dispatch(action);
      return value;
    };

    const common = {
      state,
      me,
      role: state.session.role,
      live: LIVE,
      toast,
      carrier: (id) => state.carriers.find((c) => c.id === id),
      shipper: (id) => state.shippers.find((s) => s.id === id),
      loadById: (id) => state.loads.find((l) => l.id === id),
      quotesFor: (loadId) => state.quotes.filter((q) => q.loadId === loadId),
      quoteCount: (l) => l.quoteCount ?? state.quotes.filter((q) => q.loadId === l.id).length,
      dismissToast: (id) => dispatch({ type: 'dismissToast', id }),
    };

    if (LIVE) {
      return {
        ...common,
        login: async (email, password) => {
          try {
            const out = await request('/auth/login', { body: { email, password } });
            tokenRef.current = out.token;
            writeToken(out.token);
            await refresh();
            return out.company;
          } catch (e) {
            toast(e.message, 'warn');
            return null;
          }
        },
        logout: async () => {
          tokenRef.current = '';
          writeToken('');
          await refresh();
        },
        register: async (role, data) => {
          const out = await remote('/auth/register', { ...data, role });
          if (!out) return null;
          tokenRef.current = out.token;
          writeToken(out.token);
          await refresh();
          return out.company;
        },
        postLoad: async (data) => (await remote('/loads', data))?.load ?? null,
        invite: (loadId, carrierIds) => remote(`/loads/${loadId}/invite`, { carrierIds }),
        submitQuote: (loadId, amount, message, etaDays) => remote(`/loads/${loadId}/quotes`, { amount, message, etaDays }),
        bookNow: (l) => remote(`/loads/${l.id}/book`),
        acceptQuote: (quoteId) => remote(`/quotes/${quoteId}/accept`),
        declineQuote: (quoteId) => remote(`/quotes/${quoteId}/decline`),
        pickup: (loadId) => remote(`/loads/${loadId}/pickup`),
        deliver: (loadId, pod) => remote(`/loads/${loadId}/deliver`, pod),
        cancel: (loadId) => remote(`/loads/${loadId}/cancel`),
        setSession: () => {},
        reset: () => {},
      };
    }

    return {
      ...common,
      setSession: (role, id) => dispatch({ type: 'session', session: { role, id } }),
      register: (role, data) => {
        const company = { ...data, id: uid(role === 'carrier' ? 'car' : 'shp'), verified: false };
        delete company.password;
        delete company.confirm;
        if (role === 'carrier') Object.assign(company, { rating: 0, reviews: 0, onTime: 0, hue: Math.floor(Math.random() * 360), lanes: [], about: `${data.city}-based carrier.` });
        return local({ type: 'register', role, company }, company);
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
        return local({ type: 'postLoad', load: l }, l);
      },
      invite: (loadId, carrierIds) => local({ type: 'invite', loadId, carrierIds }),
      submitQuote: (loadId, amount, message, etaDays) =>
        local({
          type: 'quote',
          quote: { id: uid('q'), loadId, carrierId: state.session.id, amount: Number(amount), message, etaDays: Number(etaDays), status: 'pending', createdAt: Date.now() },
        }),
      // Instant book: the carrier takes the load at the shipper's posted rate.
      bookNow: (l) => {
        const id = uid('q');
        dispatch({
          type: 'quote',
          quote: { id, loadId: l.id, carrierId: state.session.id, amount: l.targetRate, message: 'Booked instantly at posted rate.', etaDays: 0, status: 'pending', createdAt: Date.now() },
        });
        return local({ type: 'acceptQuote', quoteId: id });
      },
      acceptQuote: (quoteId) => local({ type: 'acceptQuote', quoteId }),
      declineQuote: (quoteId) => local({ type: 'declineQuote', quoteId }),
      pickup: (loadId) => local({ type: 'pickup', loadId }),
      deliver: (loadId, pod) => local({ type: 'deliver', loadId, pod }),
      cancel: (loadId) => local({ type: 'cancel', loadId }),
      reset: () => local({ type: 'reset' }),
    };
  }, [state, toast, refresh]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

export function transitProgress(load, now = Date.now()) {
  if (load.status === 'delivered') return 1;
  if (load.status !== 'in_transit' || !load.pickedUpAt) return 0;
  return Math.min(0.97, (now - load.pickedUpAt) / DEMO_TRANSIT_MS);
}
