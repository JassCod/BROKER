import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import express from 'express';
import { createApp } from './app.js';
import { openDb, seedDemo } from './db.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const prod = process.env.NODE_ENV === 'production';
const secret = process.env.JWT_SECRET || (prod ? null : 'dev-only-secret-change-me');
if (!secret) {
  console.error('JWT_SECRET must be set in production.');
  process.exit(1);
}

const repo = openDb(process.env.DB_PATH || join(root, 'data', 'roadtrain.db'));
if (process.env.SEED_DEMO !== 'false' && seedDemo(repo)) console.log('Seeded demo companies (password: roadtrain-demo)');

const app = createApp({ repo, secret, corsOrigin: process.env.CORS_ORIGIN });

// Serve the built website from the same server when it exists.
const dist = join(root, 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: 'index.html' }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => console.log(`Roadtrain API listening on http://localhost:${port}`));
