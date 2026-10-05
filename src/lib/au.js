// Australian freight domain helpers: states, postcodes, ABN, phone,
// distances, heavy-vehicle equipment and lane rate estimates.

export const STATES = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'SA', name: 'South Australia' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'NT', name: 'Northern Territory' },
  { code: 'ACT', name: 'Australian Capital Territory' },
];

// Inclusive postcode ranges per state/territory (Australia Post allocation).
const POSTCODE_RANGES = {
  NSW: [[1000, 2599], [2619, 2899], [2921, 2999]],
  ACT: [[200, 299], [2600, 2618], [2900, 2920]],
  VIC: [[3000, 3999], [8000, 8999]],
  QLD: [[4000, 4999], [9000, 9999]],
  SA: [[5000, 5999]],
  WA: [[6000, 6999]],
  TAS: [[7000, 7999]],
  NT: [[800, 999]],
};

// Freight hubs. roadTrain = within the gazetted road-train network.
export const CITIES = [
  { name: 'Sydney', state: 'NSW', postcode: '2000', lat: -33.87, lon: 151.21, hub: true },
  { name: 'Newcastle', state: 'NSW', postcode: '2300', lat: -32.93, lon: 151.78 },
  { name: 'Wollongong', state: 'NSW', postcode: '2500', lat: -34.42, lon: 150.89 },
  { name: 'Coffs Harbour', state: 'NSW', postcode: '2450', lat: -30.3, lon: 153.11 },
  { name: 'Tamworth', state: 'NSW', postcode: '2340', lat: -31.09, lon: 150.93 },
  { name: 'Dubbo', state: 'NSW', postcode: '2830', lat: -32.25, lon: 148.6, roadTrain: true },
  { name: 'Wagga Wagga', state: 'NSW', postcode: '2650', lat: -35.12, lon: 147.37 },
  { name: 'Albury', state: 'NSW', postcode: '2640', lat: -36.08, lon: 146.92 },
  { name: 'Canberra', state: 'ACT', postcode: '2600', lat: -35.28, lon: 149.13 },
  { name: 'Melbourne', state: 'VIC', postcode: '3000', lat: -37.81, lon: 144.96, hub: true },
  { name: 'Geelong', state: 'VIC', postcode: '3220', lat: -38.15, lon: 144.36 },
  { name: 'Ballarat', state: 'VIC', postcode: '3350', lat: -37.56, lon: 143.85 },
  { name: 'Bendigo', state: 'VIC', postcode: '3550', lat: -36.76, lon: 144.28 },
  { name: 'Shepparton', state: 'VIC', postcode: '3630', lat: -36.38, lon: 145.4 },
  { name: 'Mildura', state: 'VIC', postcode: '3500', lat: -34.19, lon: 142.16 },
  { name: 'Brisbane', state: 'QLD', postcode: '4000', lat: -27.47, lon: 153.03, hub: true },
  { name: 'Gold Coast', state: 'QLD', postcode: '4217', lat: -28.0, lon: 153.43 },
  { name: 'Toowoomba', state: 'QLD', postcode: '4350', lat: -27.56, lon: 151.95 },
  { name: 'Rockhampton', state: 'QLD', postcode: '4700', lat: -23.38, lon: 150.51, roadTrain: true },
  { name: 'Mackay', state: 'QLD', postcode: '4740', lat: -21.14, lon: 149.19 },
  { name: 'Townsville', state: 'QLD', postcode: '4810', lat: -19.26, lon: 146.82, roadTrain: true },
  { name: 'Cairns', state: 'QLD', postcode: '4870', lat: -16.92, lon: 145.77 },
  { name: 'Mount Isa', state: 'QLD', postcode: '4825', lat: -20.73, lon: 139.49, roadTrain: true },
  { name: 'Adelaide', state: 'SA', postcode: '5000', lat: -34.93, lon: 138.6, hub: true },
  { name: 'Port Augusta', state: 'SA', postcode: '5700', lat: -32.49, lon: 137.77, roadTrain: true },
  { name: 'Mount Gambier', state: 'SA', postcode: '5290', lat: -37.83, lon: 140.78 },
  { name: 'Perth', state: 'WA', postcode: '6000', lat: -31.95, lon: 115.86, hub: true },
  { name: 'Geraldton', state: 'WA', postcode: '6530', lat: -28.77, lon: 114.61, roadTrain: true },
  { name: 'Kalgoorlie', state: 'WA', postcode: '6430', lat: -30.75, lon: 121.47, roadTrain: true },
  { name: 'Albany', state: 'WA', postcode: '6330', lat: -35.02, lon: 117.88 },
  { name: 'Karratha', state: 'WA', postcode: '6714', lat: -20.74, lon: 116.85, roadTrain: true },
  { name: 'Port Hedland', state: 'WA', postcode: '6721', lat: -20.31, lon: 118.6, roadTrain: true },
  { name: 'Broome', state: 'WA', postcode: '6725', lat: -17.96, lon: 122.24, roadTrain: true },
  { name: 'Darwin', state: 'NT', postcode: '0800', lat: -12.46, lon: 130.84, hub: true, roadTrain: true },
  { name: 'Katherine', state: 'NT', postcode: '0850', lat: -14.47, lon: 132.26, roadTrain: true },
  { name: 'Alice Springs', state: 'NT', postcode: '0870', lat: -23.7, lon: 133.88, roadTrain: true },
  { name: 'Hobart', state: 'TAS', postcode: '7000', lat: -42.88, lon: 147.33, hub: true },
  { name: 'Launceston', state: 'TAS', postcode: '7250', lat: -41.43, lon: 147.14 },
  { name: 'Devonport', state: 'TAS', postcode: '7310', lat: -41.18, lon: 146.35 },
];

export const cityByName = (name) =>
  CITIES.find((c) => c.name.toLowerCase() === String(name || '').trim().toLowerCase());

export const cityLabel = (c) => (c ? `${c.name}, ${c.state} ${c.postcode}` : '');

export function isValidPostcode(postcode, state) {
  if (!/^\d{4}$/.test(String(postcode || ''))) return false;
  const n = Number(postcode);
  const states = state ? [state] : Object.keys(POSTCODE_RANGES);
  return states.some((s) => (POSTCODE_RANGES[s] || []).some(([lo, hi]) => n >= lo && n <= hi));
}

export function stateForPostcode(postcode) {
  if (!/^\d{4}$/.test(String(postcode || ''))) return null;
  const n = Number(postcode);
  // ACT ranges sit inside NSW blocks, so test ACT first.
  for (const s of ['ACT', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT']) {
    if (POSTCODE_RANGES[s].some(([lo, hi]) => n >= lo && n <= hi)) return s;
  }
  return null;
}

// ABN: 11 digits, subtract 1 from the first digit, weighted sum mod 89 == 0.
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
export function isValidABN(abn) {
  const digits = String(abn || '').replace(/\s/g, '');
  if (!/^\d{11}$/.test(digits)) return false;
  const d = digits.split('').map(Number);
  d[0] -= 1;
  return d.reduce((sum, x, i) => sum + x * ABN_WEIGHTS[i], 0) % 89 === 0;
}

export const formatABN = (abn) =>
  String(abn || '').replace(/\s/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4');

// Australian mobile (04xx) or landline (02/03/07/08), optionally as +61.
export function isValidAUPhone(phone) {
  const p = String(phone || '').replace(/[\s()-]/g, '');
  return /^(?:\+61|0)[2-478]\d{8}$/.test(p) || /^(?:1300|1800)\d{6}$/.test(p);
}

export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const ROAD_FACTOR = 1.22;
export const needsBassStrait = (a, b) => (a.state === 'TAS') !== (b.state === 'TAS');

export function roadDistanceKm(a, b) {
  if (!a || !b) return 0;
  // Interstate Tasmania freight crosses Bass Strait: Geelong <-> Devonport (Spirit of Tasmania).
  if (needsBassStrait(a, b)) {
    const port = cityByName('Geelong');
    const dev = cityByName('Devonport');
    const [main, tas] = a.state === 'TAS' ? [b, a] : [a, b];
    return Math.round(roadDistanceKm(main, port) + roadDistanceKm(dev, tas));
  }
  return Math.round(haversineKm(a, b) * ROAD_FACTOR);
}

export const transitDays = (km) => Math.max(1, Math.ceil(km / 900));

// Australian heavy-vehicle combinations. Payload in tonnes, rate in AUD/km.
export const EQUIPMENT = [
  { id: 'rigid', name: 'Rigid truck', short: 'Rigid', pallets: 12, payload: 12, rate: 2.6, desc: 'Metro and regional runs, tail-lift options.' },
  { id: 'semi-taut', name: 'Semi tautliner', short: 'Tautliner', pallets: 22, payload: 24, rate: 3.2, desc: 'The workhorse of Australian general freight.' },
  { id: 'semi-reefer', name: 'Refrigerated semi', short: 'Reefer', pallets: 22, payload: 22, rate: 3.9, desc: 'Chilled and frozen, -25°C to +25°C.' },
  { id: 'flat-top', name: 'Flat-top / drop-deck', short: 'Flat-top', pallets: 22, payload: 24, rate: 3.4, desc: 'Machinery, steel, building materials.' },
  { id: 'b-double', name: 'B-double', short: 'B-double', pallets: 34, payload: 38, rate: 4.1, desc: 'High-productivity interstate linehaul.' },
  { id: 'road-train', name: 'Road train (Type 1/2)', short: 'Road train', pallets: 56, payload: 80, rate: 5.2, desc: 'Remote and outback haulage on gazetted routes.' },
  { id: 'tipper', name: 'Tipper / side tipper', short: 'Tipper', pallets: 0, payload: 30, rate: 3.3, desc: 'Grain, aggregate, bulk commodities.' },
  { id: 'tanker', name: 'Tanker', short: 'Tanker', pallets: 0, payload: 34, rate: 4.4, desc: 'Fuel, chemicals and food-grade liquids.' },
  { id: 'side-loader', name: 'Container side-loader', short: 'Side-loader', pallets: 0, payload: 30, rate: 3.5, desc: '20ft and 40ft port and rail container moves.' },
];

export const equipmentById = (id) => EQUIPMENT.find((e) => e.id === id);

export const FERRY_SURCHARGE = 1450;
export const MIN_CHARGE = 450;
export const GST_RATE = 0.1;

// Indicative lane rate (ex GST) with a market band, in whole dollars.
export function estimateRate({ origin, destination, equipmentId, weightT = 0 }) {
  const eq = equipmentById(equipmentId);
  if (!origin || !destination || !eq) return null;
  const km = roadDistanceKm(origin, destination);
  const utilisation = eq.payload ? Math.min(1, Number(weightT || 0) / eq.payload) : 0;
  // Short hauls cost more per km; long linehaul is cheaper per km.
  const distanceAdj = km < 300 ? 1.35 : km < 1000 ? 1.08 : km > 2500 ? 0.92 : 1;
  let mid = km * eq.rate * distanceAdj * (0.92 + utilisation * 0.16);
  const ferry = needsBassStrait(origin, destination);
  if (ferry) mid += FERRY_SURCHARGE;
  mid = Math.max(MIN_CHARGE, mid);
  const round = (n) => Math.round(n / 10) * 10;
  return {
    km,
    days: transitDays(km),
    ferry,
    low: round(mid * 0.88),
    mid: round(mid),
    high: round(mid * 1.15),
    perKm: km ? +(mid / km).toFixed(2) : 0,
    gst: round(mid * GST_RATE),
  };
}

export const FUEL_LEVY = 0.18;

// Splits an estimate into the line items a shipper sees on an invoice.
export function rateBreakdown(est, total = est?.mid) {
  if (!est) return null;
  const ferry = est.ferry ? FERRY_SURCHARGE : 0;
  const road = Math.max(0, total - ferry);
  const linehaul = Math.round(road / (1 + FUEL_LEVY));
  const fuel = road - linehaul;
  const gst = Math.round(total * GST_RATE);
  return { linehaul, fuel, ferry, exGst: total, gst, incGst: total + gst };
}

// Ordered legs of a trip for display, including the sea crossing where needed.
export function routeLegs(a, b) {
  if (!a || !b) return [];
  if (!needsBassStrait(a, b)) return [{ from: a.name, to: b.name, km: roadDistanceKm(a, b), mode: 'road' }];
  const port = cityByName('Geelong');
  const dev = cityByName('Devonport');
  const legs = a.state === 'TAS'
    ? [{ from: a.name, to: dev.name, km: roadDistanceKm(a, dev), mode: 'road' }, { from: dev.name, to: port.name, km: 0, mode: 'sea' }, { from: port.name, to: b.name, km: roadDistanceKm(port, b), mode: 'road' }]
    : [{ from: a.name, to: port.name, km: roadDistanceKm(a, port), mode: 'road' }, { from: port.name, to: dev.name, km: 0, mode: 'sea' }, { from: dev.name, to: b.name, km: roadDistanceKm(dev, b), mode: 'road' }];
  return legs.filter((l) => l.mode === 'sea' || l.from !== l.to);
}

// Returns human-readable compliance warnings for a load (empty when fine).
export function routeWarnings({ origin, destination, equipmentId, weightT }) {
  const out = [];
  const eq = equipmentById(equipmentId);
  if (!origin || !destination || !eq) return out;
  if (origin.name === destination.name) out.push('Pickup and delivery are the same city.');
  if (eq.id === 'road-train' && !(origin.roadTrain && destination.roadTrain)) {
    out.push('Road trains are restricted to the gazetted network. Expect a break-down yard transfer into metro areas.');
  }
  if (eq.payload && Number(weightT) > eq.payload) {
    out.push(`${eq.short} payload is about ${eq.payload} t under NHVR general mass limits. Split the load or pick a larger combination.`);
  }
  if (needsBassStrait(origin, destination)) {
    out.push('Crosses Bass Strait on the Spirit of Tasmania. A ferry surcharge applies.');
  }
  return out;
}

export const aud = (n) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n || 0);

export const auDate = (d) =>
  d ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : '—';
