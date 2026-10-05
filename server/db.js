import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hashPassword } from './auth.js';
import { SEED_CARRIERS, SEED_LOADS, SEED_QUOTES, SEED_SHIPPERS } from '../src/lib/seed.js';

export const DEMO_PASSWORD = 'roadtrain-demo';

// Each record keeps the same JSON shape the frontend uses, in a `doc` column,
// with the fields we filter on promoted to real columns.
export function openDb(path = ':memory:') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, role TEXT NOT NULL, abn TEXT NOT NULL, doc TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS loads (id TEXT PRIMARY KEY, shipper_id TEXT NOT NULL REFERENCES companies(id), status TEXT NOT NULL, doc TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS quotes (id TEXT PRIMARY KEY, load_id TEXT NOT NULL REFERENCES loads(id), carrier_id TEXT NOT NULL REFERENCES companies(id), status TEXT NOT NULL, doc TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS quotes_load ON quotes(load_id);
    CREATE INDEX IF NOT EXISTS quotes_carrier ON quotes(carrier_id);
    CREATE INDEX IF NOT EXISTS loads_shipper ON loads(shipper_id);
  `);
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  return repo(db);
}

const parse = (row) => (row ? JSON.parse(row.doc) : null);

function repo(db) {
  const r = {
    raw: db,
    id: (prefix) => `${prefix}-${randomUUID().slice(0, 12)}`,
    tx(fn) {
      db.exec('BEGIN');
      try {
        const out = fn();
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    company: (id) => parse(db.prepare('SELECT doc FROM companies WHERE id = ?').get(id)),
    companies: (role) =>
      (role ? db.prepare('SELECT doc FROM companies WHERE role = ?').all(role) : db.prepare('SELECT doc FROM companies').all()).map(parse),
    companyByAbn: (abn, role) => parse(db.prepare('SELECT doc FROM companies WHERE abn = ? AND role = ?').get(abn, role)),
    saveCompany(c) {
      db.prepare('INSERT INTO companies (id, role, abn, doc) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET doc = excluded.doc').run(c.id, c.role, c.abn, JSON.stringify(c));
    },
    userByEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim()),
    user: (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id),
    createUser(companyId, email, password) {
      const id = r.id('usr');
      db.prepare('INSERT INTO users (id, company_id, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(id, companyId, String(email).trim(), hashPassword(password), Date.now());
      return id;
    },
    load: (id) => parse(db.prepare('SELECT doc FROM loads WHERE id = ?').get(id)),
    loads: () => db.prepare('SELECT doc FROM loads').all().map(parse),
    saveLoad(l) {
      db.prepare('INSERT INTO loads (id, shipper_id, status, doc) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, doc = excluded.doc').run(l.id, l.shipperId, l.status, JSON.stringify(l));
    },
    quote: (id) => parse(db.prepare('SELECT doc FROM quotes WHERE id = ?').get(id)),
    quotes: () => db.prepare('SELECT doc FROM quotes').all().map(parse),
    quotesForLoad: (loadId) => db.prepare('SELECT doc FROM quotes WHERE load_id = ?').all(loadId).map(parse),
    saveQuote(q) {
      db.prepare('INSERT INTO quotes (id, load_id, carrier_id, status, doc) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, doc = excluded.doc').run(q.id, q.loadId, q.carrierId, q.status, JSON.stringify(q));
    },
    deleteQuote: (id) => db.prepare('DELETE FROM quotes WHERE id = ?').run(id),
    isEmpty: () => db.prepare('SELECT COUNT(*) AS n FROM companies').get().n === 0,
  };
  return r;
}

// Demo companies, each with a login (password DEMO_PASSWORD).
export function seedDemo(r) {
  if (!r.isEmpty()) return false;
  r.tx(() => {
    for (const s of SEED_SHIPPERS) {
      r.saveCompany({ ...s, role: 'shipper' });
      r.createUser(s.id, s.email, DEMO_PASSWORD);
    }
    for (const c of SEED_CARRIERS) {
      const email = `ops@${c.name.toLowerCase().replace(/[^a-z]+/g, '')}.example`;
      r.saveCompany({ ...c, role: 'carrier', email });
      r.createUser(c.id, email, DEMO_PASSWORD);
    }
    for (const l of SEED_LOADS) r.saveLoad(l);
    for (const q of SEED_QUOTES) r.saveQuote(q);
  });
  return true;
}
