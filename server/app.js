import express from 'express';
import { signToken, verifyPassword, verifyToken } from './auth.js';
import {
  CITIES, EQUIPMENT, STATES, cityByName, equipmentById, formatABN, isValidABN, isValidAUPhone, isValidPostcode,
} from '../src/lib/au.js';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const need = (cond, status, message) => cond || fail(status, message);

const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const today = () => new Date().toISOString().slice(0, 10);
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

// Fixed-window limiter for login and sign-up, keyed by client IP.
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, _res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) hits.set(key, { start: now, n: 1 });
    else if (++entry.n > max) return next(new HttpError(429, 'Too many attempts. Wait a few minutes and try again.'));
    next();
  };
}

// What other companies may see about a company.
const publicCompany = (c) => {
  const { email, phone, contact, ...rest } = c;
  return rest;
};

export function createApp({ repo, secret, corsOrigin, authLimit = { windowMs: 15 * 60_000, max: 30 } }) {
  need(secret, 500, 'JWT secret missing');
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '50kb' }));

  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY' });
    if (corsOrigin) {
      res.set({ 'Access-Control-Allow-Origin': corsOrigin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin' });
      if (req.method === 'OPTIONS') return res.sendStatus(204);
    }
    next();
  });

  // Attach req.me = { userId, companyId, role } when a valid token is sent.
  app.use((req, _res, next) => {
    const token = (req.get('authorization') || '').replace(/^Bearer /, '');
    const p = token && verifyToken(token, secret);
    if (p && repo.user(p.sub)) req.me = { userId: p.sub, companyId: p.cid, role: p.role };
    next();
  });
  const requireRole = (role) => (req, _res, next) => {
    if (!req.me) return next(new HttpError(401, 'Log in to continue.'));
    if (role && req.me.role !== role) return next(new HttpError(403, `Only ${role}s can do this.`));
    next();
  };
  const route = (fn) => (req, res, next) => {
    try {
      const out = fn(req, res);
      if (!res.headersSent) res.json(out ?? { ok: true });
    } catch (e) {
      next(e);
    }
  };

  const canSee = (l, me) => {
    if (l.visibility === 'public' && l.status === 'open') return true;
    if (!me) return false;
    if (me.role === 'shipper') return l.shipperId === me.companyId;
    return l.bookedCarrierId === me.companyId || (l.status === 'open' && l.invitedCarrierIds.includes(me.companyId));
  };
  const loadFor = (req, id) => {
    const l = repo.load(id);
    need(l && canSee(l, req.me), 404, 'Load not found.');
    return l;
  };

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  app.get('/api/meta', (_req, res) => res.json({ states: STATES, cities: CITIES, equipment: EQUIPMENT }));

  // ---------- auth ----------
  const issue = (userId, company) => ({
    token: signToken({ sub: userId, cid: company.id, role: company.role }, secret),
    company,
  });

  app.post('/api/auth/register', rateLimit(authLimit), route((req) => {
    const b = req.body || {};
    const role = b.role === 'carrier' ? 'carrier' : b.role === 'shipper' ? 'shipper' : fail(400, 'Choose shipper or carrier.');
    const name = str(b.name, 120);
    const email = str(b.email, 160).toLowerCase();
    need(name.length >= 2, 400, 'Enter your registered business name.');
    need(isValidABN(b.abn), 400, 'Enter a valid 11-digit Australian Business Number.');
    need(STATES.some((s) => s.code === b.state), 400, 'Choose an Australian state or territory.');
    const city = cityByName(b.city);
    need(city && city.state === b.state, 400, `Choose a city in ${b.state}.`);
    need(isValidPostcode(b.postcode, b.state), 400, `That postcode isn’t in ${b.state}.`);
    need(str(b.contact).length >= 2, 400, 'Enter a contact name.');
    need(isValidAUPhone(b.phone), 400, 'Use an Australian phone number.');
    need(/^\S+@\S+\.\S+$/.test(email), 400, 'Enter a valid email.');
    need(typeof b.password === 'string' && b.password.length >= 8, 400, 'Use a password of at least 8 characters.');
    need(b.confirm === true, 400, 'Roadtrain is only for businesses registered in Australia.');
    const abn = formatABN(b.abn);
    need(!repo.userByEmail(email), 409, 'An account with that email already exists.');
    need(!repo.companyByAbn(abn, role), 409, `A ${role} with that ABN is already registered.`);

    const company = {
      id: repo.id(role === 'carrier' ? 'car' : 'shp'), role, name, abn, state: b.state, city: city.name, postcode: str(b.postcode, 4),
      contact: str(b.contact, 120), phone: str(b.phone, 20), email, verified: false,
    };
    if (role === 'carrier') {
      const equipment = Array.isArray(b.equipment) ? [...new Set(b.equipment)].filter((e) => equipmentById(e)) : [];
      need(equipment.length, 400, 'Select at least one equipment type.');
      const fleet = Math.floor(Number(b.fleet));
      need(fleet >= 1 && fleet <= 10000, 400, 'Fleet size must be at least 1.');
      Object.assign(company, {
        equipment, fleet, nhvas: !!b.nhvas, insuredM: [5, 10, 20].includes(Number(b.insuredM)) ? Number(b.insuredM) : 5,
        rating: 0, reviews: 0, onTime: 0, lanes: [], hue: Math.floor(Math.random() * 360), about: `${city.name}-based carrier.`,
      });
    }
    const userId = repo.tx(() => {
      repo.saveCompany(company);
      return repo.createUser(company.id, email, b.password);
    });
    return issue(userId, company);
  }));

  app.post('/api/auth/login', rateLimit(authLimit), route((req) => {
    const { email, password } = req.body || {};
    const u = repo.userByEmail(str(email, 160));
    need(u && typeof password === 'string' && verifyPassword(password, u.password_hash), 401, 'Email or password is incorrect.');
    return issue(u.id, repo.company(u.company_id));
  }));

  // ---------- state ----------
  // Everything the signed-in company (or an anonymous visitor) is allowed to see.
  app.get('/api/state', route((req) => {
    const me = req.me;
    const all = repo.companies();
    const quotes = repo.quotes();
    const loads = repo.loads().filter((l) => canSee(l, me));
    const visibleLoadIds = new Set(loads.map((l) => l.id));
    const quoteCount = (id) => quotes.filter((q) => q.loadId === id).length;
    return {
      me: me ? { role: me.role, company: repo.company(me.companyId) } : null,
      shippers: all.filter((c) => c.role === 'shipper').map((c) => (c.id === me?.companyId ? c : publicCompany(c))),
      carriers: all.filter((c) => c.role === 'carrier').map((c) => (c.id === me?.companyId ? c : publicCompany(c))),
      loads: loads.map((l) => ({ ...l, quoteCount: quoteCount(l.id) })).sort((a, b) => b.createdAt - a.createdAt),
      quotes: !me ? [] : quotes.filter((q) =>
        me.role === 'carrier' ? q.carrierId === me.companyId : visibleLoadIds.has(q.loadId) && repo.load(q.loadId).shipperId === me.companyId,
      ),
    };
  }));

  // ---------- shipper actions ----------
  app.post('/api/loads', requireRole('shipper'), route((req) => {
    const b = req.body || {};
    const o = cityByName(b.origin);
    const d = cityByName(b.destination);
    const eq = equipmentById(b.equipment);
    need(o && d, 400, 'Pickup and delivery must be Australian cities.');
    need(o.name !== d.name, 400, 'Delivery must differ from pickup.');
    need(eq, 400, 'Choose an equipment type.');
    need(isDate(b.pickupDate) && b.pickupDate >= today(), 400, 'Pickup cannot be in the past.');
    need(isDate(b.deliveryDate) && b.deliveryDate >= b.pickupDate, 400, 'Delivery must be after pickup.');
    const weightT = Number(b.weightT);
    need(weightT > 0 && weightT <= 200, 400, 'Enter a weight in tonnes.');
    const commodity = str(b.commodity, 160);
    need(commodity, 400, 'Describe the freight.');
    const targetRate = Math.round(Number(b.targetRate));
    need(targetRate >= 100 && targetRate <= 1_000_000, 400, 'Enter a target rate between $100 and $1,000,000.');
    const visibility = b.visibility === 'private' ? 'private' : 'public';
    const invited = visibility === 'private' ? [...new Set(b.invitedCarrierIds || [])] : [];
    need(visibility === 'public' || invited.length, 400, 'Select at least one carrier.');
    need(invited.every((id) => repo.company(id)?.role === 'carrier'), 400, 'Unknown carrier selected.');
    const pallets = eq.pallets ? Math.max(0, Math.min(eq.pallets, Math.floor(Number(b.pallets) || 0))) || null : null;
    const load = {
      id: repo.id('ld'), ref: `RT-${Math.floor(30000 + Math.random() * 69999)}`, shipperId: req.me.companyId,
      origin: o.name, destination: d.name, equipment: eq.id, weightT, pallets, commodity, notes: str(b.notes, 1000),
      targetRate, pickupDate: b.pickupDate, deliveryDate: b.deliveryDate, visibility, invitedCarrierIds: invited,
      status: 'open', bookedCarrierId: null, createdAt: Date.now(), pickedUpAt: null, deliveredAt: null, pod: null,
    };
    repo.saveLoad(load);
    return { load };
  }));

  const ownOpenLoad = (req) => {
    const l = loadFor(req, req.params.id);
    need(l.shipperId === req.me.companyId, 403, 'This isn’t your load.');
    need(l.status === 'open', 409, 'This load is no longer open.');
    return l;
  };

  app.post('/api/loads/:id/invite', requireRole('shipper'), route((req) => {
    const l = ownOpenLoad(req);
    const ids = Array.isArray(req.body?.carrierIds) ? req.body.carrierIds : [];
    need(ids.length && ids.every((id) => repo.company(id)?.role === 'carrier'), 400, 'Select valid carriers.');
    repo.saveLoad({ ...l, invitedCarrierIds: [...new Set([...l.invitedCarrierIds, ...ids])] });
  }));

  app.post('/api/loads/:id/cancel', requireRole('shipper'), route((req) => {
    const l = ownOpenLoad(req);
    repo.saveLoad({ ...l, status: 'cancelled' });
  }));

  // Books the load with one quote and declines the rest.
  const book = (l, q) => {
    for (const other of repo.quotesForLoad(l.id)) {
      if (other.id !== q.id && other.status === 'pending') repo.saveQuote({ ...other, status: 'declined' });
    }
    repo.saveQuote({ ...q, status: 'accepted' });
    repo.saveLoad({ ...l, status: 'booked', bookedCarrierId: q.carrierId, agreedRate: q.amount });
  };

  app.post('/api/quotes/:id/accept', requireRole('shipper'), route((req) => {
    const q = repo.quote(req.params.id);
    need(q, 404, 'Quote not found.');
    req.params.id = q.loadId;
    const l = ownOpenLoad(req);
    need(q.status === 'pending', 409, 'This quote is no longer pending.');
    repo.tx(() => book(l, q));
  }));

  app.post('/api/quotes/:id/decline', requireRole('shipper'), route((req) => {
    const q = repo.quote(req.params.id);
    need(q, 404, 'Quote not found.');
    req.params.id = q.loadId;
    ownOpenLoad(req);
    need(q.status === 'pending', 409, 'This quote is no longer pending.');
    repo.saveQuote({ ...q, status: 'declined' });
  }));

  // ---------- carrier actions ----------
  const openForCarrier = (req) => {
    const l = loadFor(req, req.params.id);
    need(l.status === 'open', 409, 'This load has already been booked.');
    return l;
  };

  app.post('/api/loads/:id/quotes', requireRole('carrier'), route((req) => {
    const l = openForCarrier(req);
    const amount = Math.round(Number(req.body?.amount));
    const etaDays = Math.round(Number(req.body?.etaDays));
    need(amount >= 100 && amount <= 1_000_000, 400, 'Enter a rate between $100 and $1,000,000.');
    need(etaDays >= 1 && etaDays <= 14, 400, 'Transit must be 1 to 14 days.');
    repo.tx(() => {
      for (const q of repo.quotesForLoad(l.id)) {
        if (q.carrierId === req.me.companyId && q.status === 'pending') repo.deleteQuote(q.id);
      }
      repo.saveQuote({ id: repo.id('q'), loadId: l.id, carrierId: req.me.companyId, amount, etaDays, message: str(req.body?.message, 500), status: 'pending', createdAt: Date.now() });
    });
  }));

  app.post('/api/loads/:id/book', requireRole('carrier'), route((req) => {
    repo.tx(() => {
      const l = openForCarrier(req);
      const q = { id: repo.id('q'), loadId: l.id, carrierId: req.me.companyId, amount: l.targetRate, etaDays: 0, message: 'Booked instantly at posted rate.', status: 'pending', createdAt: Date.now() };
      book(l, q);
    });
  }));

  const myJob = (req, status) => {
    const l = loadFor(req, req.params.id);
    need(l.bookedCarrierId === req.me.companyId, 403, 'This job isn’t booked to you.');
    need(l.status === status, 409, `This load is ${l.status.replace('_', ' ')}.`);
    return l;
  };

  app.post('/api/loads/:id/pickup', requireRole('carrier'), route((req) => {
    const l = myJob(req, 'booked');
    repo.saveLoad({ ...l, status: 'in_transit', pickedUpAt: Date.now() });
  }));

  app.post('/api/loads/:id/deliver', requireRole('carrier'), route((req) => {
    const l = myJob(req, 'in_transit');
    const receivedBy = str(req.body?.receivedBy, 100);
    need(receivedBy.length >= 2, 400, 'Enter the name of the person who received the freight.');
    repo.saveLoad({ ...l, status: 'delivered', deliveredAt: Date.now(), pod: { receivedBy, at: Date.now() } });
  }));

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found.')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong on our side. Try again.' : err.message });
  });

  return app;
}
