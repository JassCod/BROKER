import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { DEMO_PASSWORD, openDb, seedDemo } from './db.js';

let server;
let base;
before(async () => {
  const repo = openDb(':memory:');
  seedDemo(repo);
  const app = createApp({ repo, secret: 'test-secret', authLimit: { windowMs: 60_000, max: 1000 } });
  await new Promise((r) => (server = app.listen(0, r)));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const call = async (path, { token, body, method } = {}) => {
  const res = await fetch(base + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
};
const login = async (email) => (await call('/auth/login', { body: { email, password: DEMO_PASSWORD } })).data.token;
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

test('login rejects a wrong password', async () => {
  const r = await call('/auth/login', { body: { email: 'freight@coastalproduce.example', password: 'nope' } });
  assert.equal(r.status, 401);
});

test('registration enforces Australian business details', async () => {
  const good = { role: 'shipper', name: 'Test Co', abn: '51 824 753 556', state: 'NSW', city: 'Sydney', postcode: '2000', contact: 'Sam', phone: '0412 345 678', email: 'sam@test.example', password: 'longenough', confirm: true };
  assert.equal((await call('/auth/register', { body: { ...good, abn: '12345678901' } })).status, 400);
  assert.equal((await call('/auth/register', { body: { ...good, postcode: '3000' } })).status, 400);
  assert.equal((await call('/auth/register', { body: { ...good, phone: '+1 415 555 0100' } })).status, 400);
  assert.equal((await call('/auth/register', { body: { ...good, confirm: false } })).status, 400);
  const ok = await call('/auth/register', { body: good });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.token);
  assert.equal((await call('/auth/register', { body: good })).status, 409);
});

test('anonymous visitors see only open public loads and no contact details', async () => {
  const { data } = await call('/state');
  assert.equal(data.me, null);
  assert.ok(data.loads.every((l) => l.visibility === 'public' && l.status === 'open'));
  assert.ok(data.carriers.every((c) => c.email === undefined && c.phone === undefined));
  assert.deepEqual(data.quotes, []);
});

test('invite-only load flow: post, quote, accept, pickup, deliver', async () => {
  const shipper = await login('freight@coastalproduce.example');
  const invited = await login('ops@harbourcitylogistics.example');
  const outsider = await login('ops@outbackexpresshaulage.example');

  const posted = await call('/loads', {
    token: shipper,
    body: { origin: 'Sydney', destination: 'Melbourne', equipment: 'semi-taut', weightT: 12, pallets: 16, commodity: 'Beverages', targetRate: 2800, pickupDate: tomorrow(), deliveryDate: tomorrow(), visibility: 'private', invitedCarrierIds: ['car-2'] },
  });
  assert.equal(posted.status, 200);
  const id = posted.data.load.id;

  assert.equal((await call(`/loads/${id}/quotes`, { token: outsider, body: { amount: 2000, etaDays: 1 } })).status, 404);
  const seen = (await call('/state', { token: outsider })).data.loads.some((l) => l.id === id);
  assert.equal(seen, false);
  assert.equal((await call(`/loads/${id}/quotes`, { token: shipper, body: { amount: 2000, etaDays: 1 } })).status, 403);

  assert.equal((await call(`/loads/${id}/quotes`, { token: invited, body: { amount: 2600, etaDays: 1, message: 'Can do' } })).status, 200);
  const st = (await call('/state', { token: shipper })).data;
  const q = st.quotes.find((x) => x.loadId === id);
  assert.equal(q.amount, 2600);

  assert.equal((await call(`/quotes/${q.id}/accept`, { token: invited, body: {} })).status, 403);
  assert.equal((await call(`/quotes/${q.id}/accept`, { token: shipper, body: {} })).status, 200);
  assert.equal((await call(`/quotes/${q.id}/accept`, { token: shipper, body: {} })).status, 409);

  assert.equal((await call(`/loads/${id}/deliver`, { token: invited, body: { receivedBy: 'J Smith' } })).status, 409);
  assert.equal((await call(`/loads/${id}/pickup`, { token: outsider, body: {} })).status, 404);
  assert.equal((await call(`/loads/${id}/pickup`, { token: invited, body: {} })).status, 200);
  assert.equal((await call(`/loads/${id}/deliver`, { token: invited, body: { receivedBy: 'J Smith' } })).status, 200);

  const final = (await call('/state', { token: shipper })).data.loads.find((l) => l.id === id);
  assert.equal(final.status, 'delivered');
  assert.equal(final.agreedRate, 2600);
  assert.equal(final.pod.receivedBy, 'J Smith');
});

test('instant booking takes the posted rate and closes the load', async () => {
  const carrier = await login('ops@coldchaincouriers.example');
  const r = await call('/loads/ld-1/book', { token: carrier, body: {} });
  assert.equal(r.status, 200);
  const again = await call('/loads/ld-1/book', { token: carrier, body: {} });
  assert.equal(again.status, 409);
  const other = await login('ops@sunshinestatetransport.example');
  assert.equal((await call('/loads/ld-1/book', { token: other, body: {} })).status, 404);
});

test('load validation rejects non-Australian or past loads', async () => {
  const shipper = await login('freight@coastalproduce.example');
  const base = { origin: 'Sydney', destination: 'Melbourne', equipment: 'rigid', weightT: 5, commodity: 'x', targetRate: 900, pickupDate: tomorrow(), deliveryDate: tomorrow() };
  assert.equal((await call('/loads', { token: shipper, body: { ...base, origin: 'Auckland' } })).status, 400);
  assert.equal((await call('/loads', { token: shipper, body: { ...base, pickupDate: '2020-01-01' } })).status, 400);
  assert.equal((await call('/loads', { token: shipper, body: { ...base, targetRate: 5 } })).status, 400);
  assert.equal((await call('/loads', { body: base })).status, 401);
});

test('tampered tokens are ignored', async () => {
  const token = await login('freight@coastalproduce.example');
  const [h, , s] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ sub: 'x', cid: 'shp-2', role: 'shipper', exp: 9e9 })).toString('base64url');
  const r = await call('/state', { token: `${h}.${forged}.${s}` });
  assert.equal(r.data.me, null);
});
