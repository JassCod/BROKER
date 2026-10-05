import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidABN, isValidPostcode, stateForPostcode, isValidAUPhone,
  cityByName, roadDistanceKm, estimateRate, routeWarnings, needsBassStrait, rateBreakdown, routeLegs,
} from './au.js';

test('ABN checksum', () => {
  assert.equal(isValidABN('51 824 753 556'), true); // ATO published example
  assert.equal(isValidABN('51824753557'), false);
  assert.equal(isValidABN('1234'), false);
  assert.equal(isValidABN(''), false);
});

test('postcodes map to the right state', () => {
  assert.equal(isValidPostcode('2000', 'NSW'), true);
  assert.equal(isValidPostcode('2600', 'NSW'), false);
  assert.equal(isValidPostcode('2600', 'ACT'), true);
  assert.equal(isValidPostcode('0800', 'NT'), true);
  assert.equal(isValidPostcode('90210'), false);
  assert.equal(stateForPostcode('2600'), 'ACT');
  assert.equal(stateForPostcode('3000'), 'VIC');
  assert.equal(stateForPostcode('6000'), 'WA');
  assert.equal(stateForPostcode('0870'), 'NT');
});

test('Australian phone numbers', () => {
  assert.equal(isValidAUPhone('0412 345 678'), true);
  assert.equal(isValidAUPhone('+61 2 9876 5432'), true);
  assert.equal(isValidAUPhone('1300 123 456'), true);
  assert.equal(isValidAUPhone('+1 415 555 0100'), false);
  assert.equal(isValidAUPhone('0512345678'), false);
});

test('road distance is plausible', () => {
  const syd = cityByName('Sydney');
  const mel = cityByName('Melbourne');
  const km = roadDistanceKm(syd, mel);
  assert.ok(km > 800 && km < 1000, `Sydney-Melbourne ${km}km`);
});

test('Tasmania routes cross Bass Strait', () => {
  const syd = cityByName('Sydney');
  const hob = cityByName('Hobart');
  assert.equal(needsBassStrait(syd, hob), true);
  assert.equal(needsBassStrait(cityByName('Launceston'), hob), false);
  const est = estimateRate({ origin: syd, destination: hob, equipmentId: 'semi-taut', weightT: 10 });
  assert.equal(est.ferry, true);
  assert.ok(est.low < est.mid && est.mid < est.high);
});

test('rate estimate respects minimum charge', () => {
  const est = estimateRate({ origin: cityByName('Sydney'), destination: cityByName('Wollongong'), equipmentId: 'rigid' });
  assert.ok(est.mid >= 450);
  assert.equal(estimateRate({ origin: null, destination: null, equipmentId: 'rigid' }), null);
});

test('route warnings flag road trains and overweight loads', () => {
  const w = routeWarnings({ origin: cityByName('Sydney'), destination: cityByName('Melbourne'), equipmentId: 'road-train', weightT: 10 });
  assert.ok(w.some((m) => m.includes('Road trains')));
  const heavy = routeWarnings({ origin: cityByName('Darwin'), destination: cityByName('Alice Springs'), equipmentId: 'semi-taut', weightT: 40 });
  assert.ok(heavy.some((m) => m.includes('payload')));
  assert.deepEqual(routeWarnings({ origin: cityByName('Darwin'), destination: cityByName('Alice Springs'), equipmentId: 'road-train', weightT: 40 }), []);
});

test('rate breakdown adds back up to the total', () => {
  const est = estimateRate({ origin: cityByName('Sydney'), destination: cityByName('Hobart'), equipmentId: 'semi-taut', weightT: 10 });
  const b = rateBreakdown(est);
  assert.equal(b.linehaul + b.fuel + b.ferry, est.mid);
  assert.equal(b.incGst, est.mid + b.gst);
});

test('Tasmania legs include a sea crossing', () => {
  const legs = routeLegs(cityByName('Hobart'), cityByName('Sydney'));
  assert.deepEqual(legs.map((l) => l.mode), ['road', 'sea', 'road']);
  assert.equal(routeLegs(cityByName('Sydney'), cityByName('Melbourne')).length, 1);
});
