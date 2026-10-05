// Demo data. Every company here is fictitious. ABNs pass the checksum but are not registered.
const day = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * day).toISOString().slice(0, 10);

export const SEED_SHIPPERS = [
  { id: 'shp-1', name: 'Coastal Produce Co', abn: '32 139 520 930', city: 'Brisbane', state: 'QLD', contact: 'Mia Nguyen', phone: '07 3123 4567', email: 'freight@coastalproduce.example', verified: true },
  { id: 'shp-2', name: 'Southern Cross Building Supplies', abn: '10 193 674 245', city: 'Melbourne', state: 'VIC', contact: 'Liam O’Connor', phone: '03 9123 4567', email: 'dispatch@scbs.example', verified: true },
];

export const SEED_CARRIERS = [
  { id: 'car-1', name: 'Outback Express Haulage', abn: '33 737 796 994', city: 'Darwin', state: 'NT', fleet: 42, equipment: ['road-train', 'b-double', 'semi-taut'], rating: 4.9, reviews: 312, onTime: 98, nhvas: true, insuredM: 20, founded: 1998, lanes: ['Darwin–Adelaide', 'Darwin–Mount Isa', 'Alice Springs–Port Augusta'], about: 'Family-owned linehaul specialists running the Stuart Highway every night of the week.', verified: true, hue: 18 },
  { id: 'car-2', name: 'Harbour City Logistics', abn: '12 329 548 320', city: 'Sydney', state: 'NSW', fleet: 68, equipment: ['semi-taut', 'b-double', 'rigid', 'side-loader'], rating: 4.8, reviews: 540, onTime: 97, nhvas: true, insuredM: 20, founded: 2006, lanes: ['Sydney–Melbourne', 'Sydney–Brisbane', 'Port Botany metro'], about: 'East-coast general freight with depots in Ingleburn, Laverton and Larapinta.', verified: true, hue: 190 },
  { id: 'car-3', name: 'Cold Chain Couriers', abn: '82 225 953 441', city: 'Melbourne', state: 'VIC', fleet: 35, equipment: ['semi-reefer', 'rigid'], rating: 4.7, reviews: 221, onTime: 96, nhvas: true, insuredM: 10, founded: 2011, lanes: ['Melbourne–Sydney', 'Melbourne–Adelaide', 'Melbourne–Hobart'], about: 'HACCP-certified temperature-controlled transport with live probe telemetry.', verified: true, hue: 210 },
  { id: 'car-4', name: 'Pilbara Heavy Movers', abn: '44 434 058 259', city: 'Port Hedland', state: 'WA', fleet: 24, equipment: ['road-train', 'flat-top', 'tanker'], rating: 4.8, reviews: 143, onTime: 95, nhvas: true, insuredM: 20, founded: 2003, lanes: ['Perth–Port Hedland', 'Perth–Karratha', 'Kalgoorlie–Perth'], about: 'Mining and resources haulage, oversize and over-mass permitted.', verified: true, hue: 28 },
  { id: 'car-5', name: 'Sunshine State Transport', abn: '23 090 704 808', city: 'Brisbane', state: 'QLD', fleet: 51, equipment: ['semi-taut', 'semi-reefer', 'b-double'], rating: 4.6, reviews: 388, onTime: 94, nhvas: true, insuredM: 20, founded: 2001, lanes: ['Brisbane–Cairns', 'Brisbane–Sydney', 'Brisbane–Townsville'], about: 'Bruce Highway specialists with daily departures to North Queensland.', verified: true, hue: 45 },
  { id: 'car-6', name: 'Bass Strait Freightlines', abn: '66 555 505 395', city: 'Launceston', state: 'TAS', fleet: 19, equipment: ['semi-taut', 'semi-reefer', 'side-loader'], rating: 4.7, reviews: 97, onTime: 97, nhvas: false, insuredM: 10, founded: 2014, lanes: ['Hobart–Melbourne', 'Launceston–Melbourne', 'Devonport–Hobart'], about: 'Daily Spirit of Tasmania sailings with drop trailers on both sides.', verified: true, hue: 160 },
  { id: 'car-7', name: 'Nullarbor Linehaul', abn: '43 804 082 298', city: 'Adelaide', state: 'SA', fleet: 30, equipment: ['b-double', 'semi-taut', 'flat-top'], rating: 4.5, reviews: 176, onTime: 93, nhvas: true, insuredM: 20, founded: 2009, lanes: ['Adelaide–Perth', 'Melbourne–Perth', 'Adelaide–Darwin'], about: 'East–west across the Eyre Highway, 52 hours Melbourne to Perth.', verified: true, hue: 330 },
  { id: 'car-8', name: 'Riverina Grain & Bulk', abn: '51 951 346 868', city: 'Wagga Wagga', state: 'NSW', fleet: 16, equipment: ['tipper', 'b-double'], rating: 4.6, reviews: 84, onTime: 95, nhvas: true, insuredM: 10, founded: 2016, lanes: ['Wagga Wagga–Port Kembla', 'Dubbo–Newcastle', 'Mildura–Melbourne'], about: 'Harvest-season bulk grain, fertiliser and aggregates.', verified: false, hue: 95 },
  { id: 'car-9', name: 'Capital Rigid Couriers', abn: '61 952 291 908', city: 'Canberra', state: 'ACT', fleet: 12, equipment: ['rigid', 'semi-taut'], rating: 4.4, reviews: 61, onTime: 92, nhvas: false, insuredM: 5, founded: 2019, lanes: ['Canberra–Sydney', 'Canberra–Wagga Wagga'], about: 'Tail-lift rigid deliveries across the ACT and southern tablelands.', verified: true, hue: 260 },
  { id: 'car-10', name: 'Tropic Tankers', abn: '30 801 177 585', city: 'Townsville', state: 'QLD', fleet: 22, equipment: ['tanker', 'road-train'], rating: 4.7, reviews: 109, onTime: 96, nhvas: true, insuredM: 20, founded: 2005, lanes: ['Townsville–Mount Isa', 'Townsville–Cairns'], about: 'Dangerous goods (ADG 7.8) bulk fuel and chemicals across North Queensland.', verified: true, hue: 5 },
];

const load = (n, shipperId, from, to, equipment, weightT, commodity, rate, pickup, extra = {}) => ({
  id: `ld-${n}`,
  ref: `RT-${String(24000 + n * 37)}`,
  shipperId,
  origin: from,
  destination: to,
  equipment,
  weightT,
  pallets: extra.pallets ?? null,
  commodity,
  targetRate: rate,
  pickupDate: iso(pickup),
  deliveryDate: iso(pickup + (extra.days ?? 2)),
  visibility: extra.visibility ?? 'public',
  invitedCarrierIds: extra.invited ?? [],
  status: extra.status ?? 'open',
  bookedCarrierId: extra.bookedCarrierId ?? null,
  notes: extra.notes ?? '',
  createdAt: Date.now() - n * 3600_000,
  pickedUpAt: extra.pickedUpAt ?? null,
  deliveredAt: null,
  pod: null,
});

export const SEED_LOADS = [
  load(1, 'shp-1', 'Brisbane', 'Sydney', 'semi-reefer', 18, 'Fresh mangoes (chilled 10°C)', 2900, 1, { pallets: 20 }),
  load(2, 'shp-2', 'Melbourne', 'Perth', 'b-double', 34, 'Structural steel and Colorbond sheet', 11200, 2, { days: 4 }),
  load(3, 'shp-1', 'Cairns', 'Brisbane', 'semi-taut', 16, 'Bagged raw sugar', 4200, 3, { pallets: 22, days: 3 }),
  load(4, 'shp-2', 'Melbourne', 'Hobart', 'semi-taut', 12, 'Timber framing packs', 3600, 1, { visibility: 'private', invited: ['car-6', 'car-3'], days: 2 }),
  load(5, 'shp-1', 'Darwin', 'Alice Springs', 'road-train', 62, 'Bulk cement', 6400, 4, { days: 2 }),
  load(6, 'shp-2', 'Sydney', 'Canberra', 'rigid', 6, 'Office fit-out furniture', 950, 0, { pallets: 10, days: 1 }),
  load(7, 'shp-1', 'Port Hedland', 'Perth', 'flat-top', 22, 'Mining conveyor components', 7300, 5, { days: 3, notes: 'Over-width. Pilot vehicle arranged by shipper.' }),
  load(8, 'shp-2', 'Adelaide', 'Melbourne', 'semi-taut', 20, 'Packaged wine (cartons)', 2400, 2, { pallets: 22 }),
  load(9, 'shp-1', 'Wagga Wagga', 'Wollongong', 'tipper', 28, 'Wheat (APW1)', 1900, 6, { days: 1 }),
  load(10, 'shp-1', 'Brisbane', 'Townsville', 'semi-taut', 15, 'Hardware retail replenishment', 3900, -1, { status: 'in_transit', bookedCarrierId: 'car-5', pickedUpAt: Date.now() - 50_000, days: 2 }),
];

export const SEED_QUOTES = [
  { id: 'q-1', loadId: 'ld-1', carrierId: 'car-3', amount: 2850, message: 'Reefer available Brisbane Wednesday AM, probe data shared live.', etaDays: 1, status: 'pending', createdAt: Date.now() - 2 * 3600_000 },
  { id: 'q-2', loadId: 'ld-1', carrierId: 'car-5', amount: 2990, message: 'Can do same-day pickup from Rocklea.', etaDays: 1, status: 'pending', createdAt: Date.now() - 3600_000 },
  { id: 'q-3', loadId: 'ld-4', carrierId: 'car-6', amount: 3450, message: 'Tuesday night sailing, drop trailer at your DC.', etaDays: 2, status: 'pending', createdAt: Date.now() - 5 * 3600_000 },
  { id: 'q-4', loadId: 'ld-2', carrierId: 'car-7', amount: 10900, message: 'Two-up drivers, 52 hours dock to dock.', etaDays: 3, status: 'pending', createdAt: Date.now() - 4 * 3600_000 },
  { id: 'q-5', loadId: 'ld-10', carrierId: 'car-5', amount: 3850, message: 'Booked.', etaDays: 2, status: 'accepted', createdAt: Date.now() - 30 * 3600_000 },
];
