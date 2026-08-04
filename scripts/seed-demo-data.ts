import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { sql, ensureSchema, closePool } from '@/lib/db';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

const TRANSPORT_ID = 1;

// ---------- helpers ----------
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function pickSome<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}
function pad(n: number, width: number) {
  return String(n).padStart(width, '0');
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function weighted<T>(pairs: [T, number][]): T {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [value, w] of pairs) {
    if (r < w) return value;
    r -= w;
  }
  return pairs[0][0];
}

// ---------- data pools ----------
const CITIES = [
  { city_name: 'Mumbai', state: 'Maharashtra', code: 'MH', district: 'Mumbai', pincode: '400001', distance_km: 0 },
  { city_name: 'Pune', state: 'Maharashtra', code: 'MH', district: 'Pune', pincode: '411001', distance_km: 150 },
  { city_name: 'Nagpur', state: 'Maharashtra', code: 'MH', district: 'Nagpur', pincode: '440001', distance_km: 830 },
  { city_name: 'Nashik', state: 'Maharashtra', code: 'MH', district: 'Nashik', pincode: '422001', distance_km: 165 },
  { city_name: 'Kolhapur', state: 'Maharashtra', code: 'MH', district: 'Kolhapur', pincode: '416001', distance_km: 385 },
  { city_name: 'Delhi', state: 'Delhi', code: 'DL', district: 'New Delhi', pincode: '110001', distance_km: 1400 },
  { city_name: 'Gurgaon', state: 'Haryana', code: 'HR', district: 'Gurugram', pincode: '122001', distance_km: 1420 },
  { city_name: 'Jaipur', state: 'Rajasthan', code: 'RJ', district: 'Jaipur', pincode: '302001', distance_km: 1160 },
  { city_name: 'Ahmedabad', state: 'Gujarat', code: 'GJ', district: 'Ahmedabad', pincode: '380001', distance_km: 530 },
  { city_name: 'Surat', state: 'Gujarat', code: 'GJ', district: 'Surat', pincode: '395001', distance_km: 285 },
  { city_name: 'Vadodara', state: 'Gujarat', code: 'GJ', district: 'Vadodara', pincode: '390001', distance_km: 420 },
  { city_name: 'Bangalore', state: 'Karnataka', code: 'KA', district: 'Bengaluru', pincode: '560001', distance_km: 985 },
  { city_name: 'Chennai', state: 'Tamil Nadu', code: 'TN', district: 'Chennai', pincode: '600001', distance_km: 1340 },
  { city_name: 'Hyderabad', state: 'Telangana', code: 'TS', district: 'Hyderabad', pincode: '500001', distance_km: 710 },
  { city_name: 'Kolkata', state: 'West Bengal', code: 'WB', district: 'Kolkata', pincode: '700001', distance_km: 1960 },
  { city_name: 'Lucknow', state: 'Uttar Pradesh', code: 'UP', district: 'Lucknow', pincode: '226001', distance_km: 1420 },
  { city_name: 'Indore', state: 'Madhya Pradesh', code: 'MP', district: 'Indore', pincode: '452001', distance_km: 585 },
  { city_name: 'Aurangabad', state: 'Maharashtra', code: 'MH', district: 'Aurangabad', pincode: '431001', distance_km: 335 },
];

const CO_PREFIX = ['Shree', 'Jai', 'Om', 'Bharat', 'National', 'Ganesh', 'Laxmi', 'Royal', 'Universal', 'Metro', 'Sunrise', 'Star', 'Bharti', 'Vijay', 'Krishna', 'Siddhi', 'Sai', 'New India'];
const CO_SUFFIX = ['Traders', 'Industries', 'Enterprises', 'Logistics', 'Textiles', 'Steel Corp', 'Agro Foods', 'Pharma', 'Exports', 'Distributors', 'Foods', 'Plastics', 'Cotton Mills', 'Electricals', 'Hardware'];
function companyName() {
  return `${pick(CO_PREFIX)} ${pick(CO_SUFFIX)}`;
}

const FIRST_NAMES = ['Ramesh', 'Suresh', 'Mahesh', 'Ganesh', 'Rajesh', 'Dinesh', 'Santosh', 'Prakash', 'Vinod', 'Ashok', 'Sanjay', 'Deepak', 'Manoj', 'Anil', 'Sunil', 'Vikram', 'Rahul', 'Amit', 'Ravi', 'Kiran'];
const LAST_NAMES = ['Patil', 'Sharma', 'Kumar', 'Yadav', 'Jadhav', 'Deshmukh', 'Shinde', 'Pawar', 'Chavan', 'More', 'Gupta', 'Verma', 'Singh', 'Rao', 'Reddy', 'Nair'];
function personName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

const VENDOR_TYPES = ['owner', 'broker', 'fuel', 'workshop', 'toll'] as const;
const VEHICLE_TYPES = ['Truck (6 Wheeler)', 'Truck (10 Wheeler)', 'Trailer (22 Wheeler)', 'Container Truck', 'Tempo (407)', 'Mini Truck'];
const GOODS_TYPES = ['General Cargo', 'Textiles', 'Electronics', 'FMCG', 'Steel & Metal', 'Machinery Parts', 'Chemicals (Non-Hazardous)', 'Agricultural Produce'];
const GOODS_NATURES = ['Fragile', 'Perishable', 'Non-Perishable', 'Hazardous', 'Standard'];
const SERVICE_TYPES = ['Engine Oil Change', 'Filter Replacement', 'Greasing & Lubrication', 'Battery Replacement', 'Brake Repair', 'Clutch Repair', 'Tyre Replacement', 'AC Service', 'General Breakdown Repair'];

function randomVehicleNo(cityCode: string) {
  return `${cityCode}${pad(randInt(1, 14), 2)}${String.fromCharCode(65 + randInt(0, 25))}${String.fromCharCode(65 + randInt(0, 25))}${pad(randInt(1, 9999), 4)}`;
}

function randomGstin(stateCode: string) {
  const stateNum = pad(randInt(1, 37), 2);
  const pan = Array.from({ length: 10 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[randInt(0, 35)]).join('');
  return `${stateNum}${pan}1Z${randInt(1, 9)}`;
}

const PINCODE_BY_CITY = new Map(CITIES.map((c) => [c.city_name, c.pincode]));

async function main() {
  await ensureSchema();
  console.log('Seeding demo data for transport_id =', TRANSPORT_ID);

  // ---------- Branches ----------
  const branchNames = ['Head Office - Mumbai', 'Branch - Pune', 'Branch - Nagpur'];
  const branchIds: number[] = [];
  for (const name of branchNames) {
    const { rows } = await sql`
      INSERT INTO branches (transport_id, branch_name, address, city, status)
      VALUES (${TRANSPORT_ID}, ${name}, ${`${randInt(1, 99)}, Industrial Area`}, ${name.includes('Mumbai') ? 'Mumbai' : name.includes('Pune') ? 'Pune' : 'Nagpur'}, 'active')
      RETURNING id
    `;
    branchIds.push(rows[0].id);
  }
  console.log('Branches:', branchIds.length);

  // ---------- Cost Centers ----------
  const costCenterDefs = [
    ['Fleet Operations', 'Day-to-day vehicle running costs'],
    ['Sales & Marketing', 'Business development and client relations'],
    ['Administration', 'Office and admin overhead'],
    ['Warehouse Operations', 'Godown and cross-docking costs'],
    ['Workshop', 'In-house repair and maintenance'],
  ];
  for (const [name, description] of costCenterDefs) {
    await sql`INSERT INTO cost_centers (transport_id, name, description, status) VALUES (${TRANSPORT_ID}, ${name}, ${description}, 'active')`;
  }
  console.log('Cost centers:', costCenterDefs.length);

  // ---------- Cities ----------
  const cityIds: { id: number; city_name: string; code: string }[] = [];
  for (const c of CITIES) {
    const { rows } = await sql`
      INSERT INTO cities (city_name, district, state, pincode, distance_km, transit_time_hours, status)
      VALUES (${c.city_name}, ${c.district}, ${c.state}, ${c.pincode}, ${c.distance_km}, ${Math.round(c.distance_km / 40)}, 'active')
      ON CONFLICT (city_name) DO UPDATE SET district = EXCLUDED.district, state = EXCLUDED.state, pincode = EXCLUDED.pincode
      RETURNING id, city_name
    `;
    cityIds.push({ id: rows[0].id, city_name: rows[0].city_name, code: c.code });
  }
  console.log('Cities:', cityIds.length);

  // ---------- Goods Types / Natures / Banks ----------
  for (const t of GOODS_TYPES) {
    await sql`INSERT INTO goods_types (type_name, description, status) VALUES (${t}, ${''}, 'active')`;
  }
  for (const n of GOODS_NATURES) {
    await sql`INSERT INTO goods_natures (nature_name, description, status) VALUES (${n}, ${''}, 'active')`;
  }
  const bankDefs = [
    ['HDFC Bank', 'Fort Branch, Mumbai', 'HDFC0000123'],
    ['ICICI Bank', 'MG Road Branch, Pune', 'ICIC0000456'],
    ['State Bank of India', 'Main Branch, Nagpur', 'SBIN0000789'],
  ];
  for (const [bank_name, branch, ifsc_code] of bankDefs) {
    await sql`
      INSERT INTO banks (transport_id, bank_name, branch, ifsc_code, account_no, account_holder, status)
      VALUES (${TRANSPORT_ID}, ${bank_name}, ${branch}, ${ifsc_code}, ${String(randInt(100000000000, 999999999999))}, 'Transport Company', 'active')
    `;
  }
  console.log('Goods types/natures/banks seeded');

  // ---------- Financial Year ----------
  await sql`
    INSERT INTO financial_years (year_label, start_date, end_date, is_default, status)
    VALUES ('2026-2027', '2026-04-01', '2027-03-31', TRUE, 'active')
    ON CONFLICT (year_label) DO NOTHING
  `;

  // ---------- Consignors ----------
  const consignorIds: number[] = [];
  for (let i = 0; i < 12; i++) {
    const city = pick(cityIds);
    const { rows } = await sql`
      INSERT INTO consignors (transport_id, name, address, city, gst_no, pincode, contact_person, mobile, email, bank_name, account_no, default_payment_method, status)
      VALUES (
        ${TRANSPORT_ID}, ${companyName()}, ${`${randInt(1, 200)}, MIDC Industrial Estate`}, ${city.city_name},
        ${randomGstin(city.code)}, ${PINCODE_BY_CITY.get(city.city_name) || '400001'},
        ${personName()}, ${`9${randInt(100000000, 999999999)}`}, ${`accounts${i}@${companyName().toLowerCase().replace(/\s+/g, '')}.com`},
        ${pick(bankDefs)[0]}, ${String(randInt(100000000000, 999999999999))}, ${weighted<'to_pay' | 'paid' | 'tbb'>([['to_pay', 6], ['paid', 3], ['tbb', 1]])}, 'active'
      )
      RETURNING id
    `;
    consignorIds.push(rows[0].id);
  }
  console.log('Consignors:', consignorIds.length);

  // ---------- Consignees ----------
  const consigneeIds: number[] = [];
  for (let i = 0; i < 15; i++) {
    const city = pick(cityIds);
    const { rows } = await sql`
      INSERT INTO consignees (transport_id, name, address, city, gst_no, pincode, contact_person, mobile, email, status)
      VALUES (
        ${TRANSPORT_ID}, ${companyName()}, ${`${randInt(1, 200)}, Sector ${randInt(1, 40)}`}, ${city.city_name},
        ${randomGstin(city.code)}, ${PINCODE_BY_CITY.get(city.city_name) || '400001'}, ${personName()}, ${`8${randInt(100000000, 999999999)}`},
        ${`purchase${i}@${companyName().toLowerCase().replace(/\s+/g, '')}.com`}, 'active'
      )
      RETURNING id
    `;
    consigneeIds.push(rows[0].id);
  }
  console.log('Consignees:', consigneeIds.length);

  // ---------- Vendors ----------
  const vendorIds: { id: number; type: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const vendorType = pick([...VENDOR_TYPES]);
    const username = `vendor${i + 1}`;
    const { rows } = await sql`
      INSERT INTO vendors (transport_id, vendor_name, vendor_type, contact_person, mobile, email, address, gst_no, bank_name, account_no, username, password_hash, status)
      VALUES (
        ${TRANSPORT_ID}, ${companyName()}, ${vendorType}, ${personName()}, ${`7${randInt(100000000, 999999999)}`},
        ${`${username}@example.com`}, ${`${randInt(1, 99)}, Transport Nagar`}, ${randomGstin('MH')},
        ${pick(bankDefs)[0]}, ${String(randInt(100000000000, 999999999999))}, ${username},
        ${sha256('Demo@123')}, 'active'
      )
      RETURNING id
    `;
    vendorIds.push({ id: rows[0].id, type: vendorType });
  }
  console.log('Vendors:', vendorIds.length);
  const ownerVendorIds = vendorIds.filter((v) => v.type === 'owner').map((v) => v.id);
  const workshopVendorIds = vendorIds.filter((v) => v.type === 'workshop').map((v) => v.id);

  // ---------- Vehicles ----------
  const vehicleIds: number[] = [];
  for (let i = 0; i < 15; i++) {
    const city = pick(cityIds);
    const vendorId = Math.random() < 0.6 && ownerVendorIds.length ? pick(ownerVendorIds) : null;
    const complianceProfile = weighted<'expired' | 'expiring' | 'valid'>([['expired', 2], ['expiring', 3], ['valid', 5]]);
    const expiryFor = () => {
      if (complianceProfile === 'expired') return isoDate(daysAgo(randInt(1, 60)));
      if (complianceProfile === 'expiring') return isoDate(daysFromNow(randInt(1, 25)));
      return isoDate(daysFromNow(randInt(60, 400)));
    };
    const { rows } = await sql`
      INSERT INTO vehicles (
        transport_id, vehicle_no, owner_name, vehicle_type, vendor_id,
        rc_expiry, insurance_expiry, fitness_expiry, permit_expiry, national_permit_expiry, puc_expiry, road_tax_expiry,
        fastag_id, gps_device_id, status
      )
      VALUES (
        ${TRANSPORT_ID}, ${randomVehicleNo(city.code)}, ${personName()}, ${pick(VEHICLE_TYPES)}, ${vendorId},
        ${isoDate(daysFromNow(randInt(200, 1500)))}, ${expiryFor()}, ${expiryFor()}, ${expiryFor()}, ${expiryFor()}, ${expiryFor()}, ${isoDate(daysFromNow(randInt(200, 1500)))},
        ${`FT${randInt(1000000000, 2147483647)}`}, ${`GPS-DEV-${pad(i + 1, 4)}`}, 'active'
      )
      RETURNING id
    `;
    vehicleIds.push(rows[0].id);
  }
  console.log('Vehicles:', vehicleIds.length);

  // ---------- Drivers ----------
  const driverIds: number[] = [];
  for (let i = 0; i < 12; i++) {
    const employmentType = Math.random() < 0.6 ? 'own' : 'hired';
    const linkedVehicle = Math.random() < 0.7 ? pick(vehicleIds) : null;
    const licenseValidTo = isoDate(daysFromNow(randInt(-30, 900)));
    const username = `driver${i + 1}`;
    const { rows } = await sql`
      INSERT INTO drivers (
        transport_id, driver_name, username, password_hash, mobile, license_no, address, vehicle_id, employment_type, hire_date,
        license_valid_from, license_valid_to, aadhaar_no, pan_no, status
      )
      VALUES (
        ${TRANSPORT_ID}, ${personName()}, ${username},
        ${sha256('Demo@123')},
        ${`9${randInt(100000000, 999999999)}`}, ${`MH${pad(randInt(1, 14), 2)}${randInt(2015, 2023)}${randInt(1000000, 9999999)}`},
        ${`${randInt(1, 99)}, Driver Colony`}, ${linkedVehicle}, ${employmentType}, ${isoDate(daysAgo(randInt(60, 1200)))},
        ${isoDate(daysAgo(randInt(1000, 3000)))}, ${licenseValidTo}, ${String(randInt(100000000000, 999999999999))}, ${`ABCDE${randInt(1000, 9999)}F`}, 'active'
      )
      RETURNING id
    `;
    driverIds.push(rows[0].id);
  }
  console.log('Drivers:', driverIds.length);

  // ---------- Extra staff users (Manager, Accountant, Operator) ----------
  const staffDefs: [string, string, string][] = [
    ['Manager', 'manager@example.com', 'Priya Kulkarni'],
    ['Accountant', 'accountant@example.com', 'Rohit Mehta'],
    ['Operator', 'operator@example.com', 'Sneha Joshi'],
  ];
  const staffUserIds: number[] = [2]; // include existing Transport Admin (id=2)
  for (const [role, email, fullName] of staffDefs) {
    const [firstName, ...rest] = fullName.split(' ');
    const passwordHash = await bcrypt.hash('Demo@123', 10);
    const { rows } = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, role, platform_role, transport_id, status)
      VALUES (${email}, ${passwordHash}, ${firstName}, ${rest.join(' ')}, ${role}, 'transport_admin', ${TRANSPORT_ID}, 'active')
      ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
      RETURNING id
    `;
    staffUserIds.push(rows[0].id);
  }
  console.log('Staff users (incl. existing admin):', staffUserIds.length);

  // ---------- Routes ----------
  const routeIds: number[] = [];
  for (let i = 0; i < 12; i++) {
    const [fromCity, toCity] = pickSome(cityIds, 2);
    const { rows } = await sql`
      INSERT INTO routes (transport_id, route_name, from_city, to_city, distance_km, status)
      VALUES (${TRANSPORT_ID}, ${`${fromCity.city_name} - ${toCity.city_name}`}, ${fromCity.city_name}, ${toCity.city_name}, ${randInt(150, 1800)}, 'active')
      RETURNING id
    `;
    routeIds.push(rows[0].id);
  }
  console.log('Routes:', routeIds.length);

  // ---------- Freight Rates ----------
  let freightRateCount = 0;
  const usedCombos = new Set<string>();
  for (let i = 0; i < 30 && freightRateCount < 20; i++) {
    const consignorId = pick(consignorIds);
    const routeId = pick(routeIds);
    const city = pick(cityIds);
    const key = `${consignorId}-${routeId}-${city.city_name}`;
    if (usedCombos.has(key)) continue;
    usedCombos.add(key);
    const base = randInt(8, 25);
    await sql`
      INSERT INTO freight_rates (
        consignor_id, route_id, city_name, from_city, to_city, rate_per_kg, min_rate, vehicle_type,
        rate_10kg, rate_20kg, rate_30kg, rate_40kg, rate_50kg, rate_above_50kg, transport_id, status
      )
      VALUES (
        ${consignorId}, ${routeId}, ${city.city_name}, ${city.city_name}, ${city.city_name}, ${base}, ${base * 10},
        ${pick(VEHICLE_TYPES)}, ${base * 10}, ${base * 20 * 0.9}, ${base * 30 * 0.85}, ${base * 40 * 0.8}, ${base * 50 * 0.75}, ${base * 0.7},
        ${TRANSPORT_ID}, 'active'
      )
    `;
    freightRateCount++;
  }
  console.log('Freight rates:', freightRateCount);

  // ---------- LR Entries ----------
  const lrRecords: { id: number; lr_no: string; consignor_id: number; consignee_id: number; freight: number; lr_date: string }[] = [];
  for (let i = 0; i < 60; i++) {
    const consignorId = pick(consignorIds);
    const consigneeId = pick(consigneeIds);
    const fromCity = pick(cityIds).city_name;
    const toCity = pick(cityIds).city_name;
    const freight = randInt(2000, 45000);
    const hamali = randInt(0, 500);
    const lrCharge = randInt(50, 300);
    const advance = Math.random() < 0.3 ? randInt(500, 5000) : 0;
    const balance = freight + hamali + lrCharge - advance;
    const lrDate = daysAgo(randInt(0, 90));
    const vehicleId = Math.random() < 0.7 ? pick(vehicleIds) : null;
    const driverId = Math.random() < 0.7 ? pick(driverIds) : null;
    const status = weighted<'to_pay' | 'paid' | 'tbb'>([['to_pay', 5], ['paid', 4], ['tbb', 1]]);

    const { rows: seqRows } = await sql`
      WITH max_lr AS (
        SELECT COALESCE(MAX(NULLIF(regexp_replace(lr_no, '[^0-9]', '', 'g'), '')::INTEGER), 0) AS n FROM lr_entries
      )
      INSERT INTO transport_lr_sequences (id, next_lr_number, lr_prefix, updated_at)
      VALUES (${TRANSPORT_ID}, (SELECT n + 2 FROM max_lr), '', NOW())
      ON CONFLICT (id) DO UPDATE
        SET next_lr_number = GREATEST(transport_lr_sequences.next_lr_number, (SELECT n + 1 FROM max_lr)) + 1, updated_at = NOW()
      RETURNING next_lr_number - 1 AS seq_no, COALESCE(lr_prefix, '') AS prefix
    `;
    const lrNo = `${seqRows[0].prefix}${pad(seqRows[0].seq_no, 5)}`;

    const goodsItems = JSON.stringify([
      { description: pick(GOODS_TYPES), qty: randInt(1, 50), amount: freight },
    ]);

    const { rows } = await sql`
      INSERT INTO lr_entries (
        lr_no, lr_date, transport_id, consignor_id, consignee_id, from_city, to_city, delivery_address,
        freight, hamali, lr_charge, advance, balance, truck_no, driver_name, driver_mobile, remarks,
        pod_received, goods_items, status, created_by, vehicle_id, driver_id
      )
      VALUES (
        ${lrNo}, ${lrDate.toISOString()}, ${TRANSPORT_ID}, ${consignorId}, ${consigneeId}, ${fromCity}, ${toCity}, ${'Warehouse Gate No. 3'},
        ${freight}, ${hamali}, ${lrCharge}, ${advance}, ${balance}, '', '', '', ${''},
        ${Math.random() < 0.6}, ${goodsItems}::jsonb, ${status}, 'Seed Script', ${vehicleId}, ${driverId}
      )
      RETURNING id
    `;
    lrRecords.push({ id: rows[0].id, lr_no: lrNo, consignor_id: consignorId, consignee_id: consigneeId, freight, lr_date: isoDate(lrDate) });
  }
  console.log('LR entries:', lrRecords.length);

  // ---------- Challans ----------
  let challanCount = 0;
  for (let i = 0; i < 20; i++) {
    const lrGroup = pickSome(lrRecords, randInt(2, 5));
    const totalFreight = lrGroup.reduce((s, l) => s + l.freight, 0);
    const { rows: seqRows } = await sql`SELECT get_next_doc_number(${TRANSPORT_ID}, 'challan') AS seq`;
    const challanNo = `CH${pad(Number(seqRows[0].seq), 5)}`;
    const lrList = JSON.stringify(lrGroup.map((l) => ({ lr_no: l.lr_no, freight: l.freight, status: 'to_pay' })));
    await sql`
      INSERT INTO challans (
        transport_id, challan_no, challan_date, from_city, to_city, truck_no, driver_name, driver_mobile, owner_name,
        remarks, lr_list, total_freight, total_to_pay, total_paid, status, created_by, vehicle_id, driver_id
      )
      VALUES (
        ${TRANSPORT_ID}, ${challanNo}, ${daysAgo(randInt(0, 85)).toISOString()}, ${pick(cityIds).city_name}, ${pick(cityIds).city_name},
        '', ${personName()}, ${`9${randInt(100000000, 999999999)}`}, ${personName()}, 'Seeded demo challan',
        ${lrList}::jsonb, ${totalFreight}, ${totalFreight}, 0, 'open', 'Seed Script', ${pick(vehicleIds)}, ${pick(driverIds)}
      )
    `;
    challanCount++;
  }
  console.log('Challans:', challanCount);

  // ---------- Invoices ----------
  const invoiceRecords: { id: number; invoice_no: string; consignor_id: number; net_amount: number }[] = [];
  for (let i = 0; i < 25; i++) {
    const consignorId = pick(consignorIds);
    const consignorLRs = lrRecords.filter((l) => l.consignor_id === consignorId).slice(0, randInt(1, 4));
    const items = (consignorLRs.length > 0 ? consignorLRs : [pick(lrRecords)]).map((l) => ({
      lr_no: l.lr_no,
      description: 'Freight Charges',
      qty: 1,
      amount: l.freight,
    }));
    const totalAmount = items.reduce((s, it) => s + it.amount, 0);
    const gstPercentage = 18;
    const gstAmount = Math.round(totalAmount * (gstPercentage / 100));
    const netAmount = totalAmount + gstAmount;

    const { rows: seqRows } = await sql`SELECT get_next_doc_number(${TRANSPORT_ID}, 'invoice') AS seq`;
    const invoiceNo = `INV${pad(Number(seqRows[0].seq), 5)}`;
    const status = weighted<'draft' | 'issued' | 'paid'>([['issued', 5], ['paid', 4], ['draft', 1]]);

    const { rows: consignorRows } = await sql`SELECT name FROM consignors WHERE id = ${consignorId}`;
    const { rows } = await sql`
      INSERT INTO invoices (
        transport_id, invoice_no, invoice_date, party_name, consignor_id, gst_percentage, remarks,
        items, total_amount, gst_amount, net_amount, status, created_by
      )
      VALUES (
        ${TRANSPORT_ID}, ${invoiceNo}, ${isoDate(daysAgo(randInt(0, 80)))}, ${consignorRows[0]?.name || 'Consignor'}, ${consignorId},
        ${gstPercentage}, 'Seeded demo invoice', ${JSON.stringify(items)}::jsonb, ${totalAmount}, ${gstAmount}, ${netAmount}, ${status}, 'Seed Script'
      )
      RETURNING id
    `;
    invoiceRecords.push({ id: rows[0].id, invoice_no: invoiceNo, consignor_id: consignorId, net_amount: netAmount });
  }
  console.log('Invoices:', invoiceRecords.length);

  // ---------- Receipts ----------
  let receiptCount = 0;
  for (const inv of invoiceRecords.filter((i) => Math.random() < 0.7)) {
    const { rows: seqRows } = await sql`SELECT get_next_doc_number(${TRANSPORT_ID}, 'receipt') AS seq`;
    const receiptNo = `RCP${pad(Number(seqRows[0].seq), 5)}`;
    const receivedAmount = Math.round(inv.net_amount * (Math.random() < 0.7 ? 1 : 0.6));
    const { rows: consignorRows } = await sql`SELECT name FROM consignors WHERE id = ${inv.consignor_id}`;
    await sql`
      INSERT INTO receipts (
        transport_id, receipt_no, receipt_date, party_name, consignor_id, mode, remarks, items,
        total_amount, received_amount, receipt_type, status, created_by
      )
      VALUES (
        ${TRANSPORT_ID}, ${receiptNo}, ${isoDate(daysAgo(randInt(0, 60)))}, ${consignorRows[0]?.name || 'Consignor'}, ${inv.consignor_id},
        ${pick(['cash', 'bank', 'cheque'])}, 'Seeded demo receipt',
        ${JSON.stringify([{ invoice_no: inv.invoice_no, amount_received: receivedAmount }])}::jsonb,
        ${receivedAmount}, ${receivedAmount}, 'invoice', 'confirmed', 'Seed Script'
      )
    `;
    receiptCount++;
  }
  console.log('Receipts:', receiptCount);

  // ---------- Trips ----------
  const tripIds: number[] = [];
  for (let i = 0; i < 30; i++) {
    const vehicleId = pick(vehicleIds);
    const driverId = pick(driverIds);
    const status = weighted<'planned' | 'ongoing' | 'completed' | 'cancelled'>([['planned', 4], ['ongoing', 3], ['completed', 12], ['cancelled', 1]]);
    const startDate = status === 'planned' ? isoDate(daysFromNow(randInt(1, 20))) : isoDate(daysAgo(randInt(0, 80)));
    const endDate = status === 'completed' ? isoDate(new Date(new Date(startDate).getTime() + randInt(1, 4) * 86400000)) : '';
    const revenue = randInt(8000, 60000);
    const expense = Math.round(revenue * (0.3 + Math.random() * 0.4));

    const { rows: seqRows } = await sql`SELECT get_next_doc_number(${TRANSPORT_ID}, 'trip') AS seq`;
    const tripNo = `TR${pad(Number(seqRows[0].seq), 5)}`;
    const { rows } = await sql`
      INSERT INTO trips (
        transport_id, trip_no, vehicle_id, driver_id, from_city, to_city, start_date, end_date, status,
        total_revenue, total_expense, remarks, created_by
      )
      VALUES (
        ${TRANSPORT_ID}, ${tripNo}, ${vehicleId}, ${driverId}, ${pick(cityIds).city_name}, ${pick(cityIds).city_name},
        ${startDate}, ${endDate}, ${status}, ${revenue}, ${expense}, 'Seeded demo trip', 'Seed Script'
      )
      RETURNING id
    `;
    tripIds.push(rows[0].id);
  }
  console.log('Trips:', tripIds.length);

  // ---------- Fuel Entries (ascending odometer per vehicle for realistic mileage) ----------
  let fuelCount = 0;
  const vehicleOdometer = new Map<number, number>();
  for (const vId of vehicleIds) vehicleOdometer.set(vId, randInt(5000, 20000));
  for (let i = 0; i < 60; i++) {
    const vehicleId = pick(vehicleIds);
    const currentOdo = vehicleOdometer.get(vehicleId)!;
    const newOdo = currentOdo + randInt(200, 600);
    vehicleOdometer.set(vehicleId, newOdo);
    const quantity = randInt(40, 200);
    const rate = 92 + Math.random() * 8;
    await sql`
      INSERT INTO fuel_entries (
        transport_id, vehicle_id, driver_id, entry_date, quantity_liters, rate_per_liter, amount,
        odometer_reading, fuel_station, payment_mode, created_by
      )
      VALUES (
        ${TRANSPORT_ID}, ${vehicleId}, ${pick(driverIds)}, ${isoDate(daysAgo(randInt(0, 90)))}, ${quantity}, ${rate.toFixed(2)},
        ${(quantity * rate).toFixed(2)}, ${newOdo}, ${pick(['HP Petrol Pump', 'Indian Oil', 'Bharat Petroleum', 'Shell'])}, ${pick(['cash', 'bank', 'card'])}, 'Seed Script'
      )
    `;
    fuelCount++;
  }
  console.log('Fuel entries:', fuelCount);

  // ---------- Tyres + Events ----------
  let tyreCount = 0;
  let tyreEventCount = 0;
  for (let i = 0; i < 20; i++) {
    const vehicleId = Math.random() < 0.8 ? pick(vehicleIds) : null;
    const status = weighted<'in_use' | 'retreaded' | 'scrapped'>([['in_use', 7], ['retreaded', 2], ['scrapped', 1]]);
    const purchaseDate = isoDate(daysAgo(randInt(30, 700)));
    const purchaseCost = randInt(6000, 18000);
    const position = pick(['FL', 'FR', 'RL1', 'RL2', 'RR1', 'RR2', 'Spare']);
    const { rows } = await sql`
      INSERT INTO tyres (transport_id, tyre_serial_no, brand, vehicle_id, position, purchase_date, purchase_cost, status)
      VALUES (${TRANSPORT_ID}, ${`TYR-${randInt(100000, 999999)}`}, ${pick(['MRF', 'CEAT', 'Apollo', 'JK Tyre', 'Bridgestone'])}, ${vehicleId}, ${position}, ${purchaseDate}, ${purchaseCost}, ${status})
      RETURNING id
    `;
    const tyreId = rows[0].id;
    tyreCount++;
    if (vehicleId) {
      await sql`
        INSERT INTO tyre_events (transport_id, tyre_id, event_type, event_date, vehicle_id, position, cost)
        VALUES (${TRANSPORT_ID}, ${tyreId}, 'allocation', ${purchaseDate}, ${vehicleId}, ${position}, ${purchaseCost})
      `;
      tyreEventCount++;
      if (Math.random() < 0.4) {
        await sql`
          INSERT INTO tyre_events (transport_id, tyre_id, event_type, event_date, vehicle_id, position, cost, remarks)
          VALUES (${TRANSPORT_ID}, ${tyreId}, 'rotation', ${isoDate(daysAgo(randInt(1, 200)))}, ${vehicleId}, ${position}, 0, 'Routine rotation')
        `;
        tyreEventCount++;
      }
      if (status === 'retreaded') {
        await sql`
          INSERT INTO tyre_events (transport_id, tyre_id, event_type, event_date, vehicle_id, position, cost, remarks)
          VALUES (${TRANSPORT_ID}, ${tyreId}, 'retreading', ${isoDate(daysAgo(randInt(1, 100)))}, ${vehicleId}, ${position}, ${randInt(2000, 4000)}, 'Retreaded at authorized center')
        `;
        tyreEventCount++;
      }
    }
  }
  console.log('Tyres:', tyreCount, 'Tyre events:', tyreEventCount);

  // ---------- Maintenance Records ----------
  let maintenanceCount = 0;
  for (let i = 0; i < 25; i++) {
    const vehicleId = pick(vehicleIds);
    const isBreakdown = Math.random() < 0.2;
    const serviceDate = isoDate(daysAgo(randInt(0, 90)));
    const nextDueProfile = weighted<'overdue' | 'soon' | 'later'>([['overdue', 2], ['soon', 3], ['later', 5]]);
    const nextDueDate =
      nextDueProfile === 'overdue' ? isoDate(daysAgo(randInt(1, 30))) : nextDueProfile === 'soon' ? isoDate(daysFromNow(randInt(1, 20))) : isoDate(daysFromNow(randInt(60, 300)));
    await sql`
      INSERT INTO maintenance_records (
        transport_id, vehicle_id, vendor_id, service_type, service_date, odometer_reading, cost, is_breakdown,
        next_due_date, next_due_odometer, remarks, created_by
      )
      VALUES (
        ${TRANSPORT_ID}, ${vehicleId}, ${workshopVendorIds.length ? pick(workshopVendorIds) : null}, ${pick(SERVICE_TYPES)}, ${serviceDate},
        ${randInt(5000, 90000)}, ${randInt(800, 15000)}, ${isBreakdown}, ${nextDueDate}, ${randInt(90000, 150000)}, 'Seeded demo maintenance', 'Seed Script'
      )
    `;
    maintenanceCount++;
  }
  console.log('Maintenance records:', maintenanceCount);

  // ---------- Quotations ----------
  let quotationCount = 0;
  for (let i = 0; i < 15; i++) {
    const { rows: seqRows } = await sql`SELECT get_next_doc_number(${TRANSPORT_ID}, 'quotation') AS seq`;
    const quotationNo = `QT${pad(Number(seqRows[0].seq), 5)}`;
    await sql`
      INSERT INTO quotations (
        transport_id, quotation_no, consignor_id, from_city, to_city, vehicle_type, rate, fuel_surcharge_percent,
        valid_until, status, remarks, created_by
      )
      VALUES (
        ${TRANSPORT_ID}, ${quotationNo}, ${pick(consignorIds)}, ${pick(cityIds).city_name}, ${pick(cityIds).city_name},
        ${pick(VEHICLE_TYPES)}, ${randInt(15000, 55000)}, ${randInt(0, 12)}, ${isoDate(daysFromNow(randInt(10, 60)))},
        ${weighted<'draft' | 'sent' | 'approved' | 'rejected' | 'expired'>([['draft', 3], ['sent', 4], ['approved', 4], ['rejected', 2], ['expired', 2]])},
        'Seeded demo quotation', 'Seed Script'
      )
    `;
    quotationCount++;
  }
  console.log('Quotations:', quotationCount);

  // ---------- Warehouses + Entries ----------
  const warehouseIds: number[] = [];
  for (const name of ['Central Godown - Mumbai', 'Transit Hub - Pune']) {
    const { rows } = await sql`
      INSERT INTO warehouses (transport_id, warehouse_name, address, city, capacity_sqft, status)
      VALUES (${TRANSPORT_ID}, ${name}, ${'Warehouse Complex, Phase 2'}, ${name.includes('Mumbai') ? 'Mumbai' : 'Pune'}, ${randInt(5000, 20000)}, 'active')
      RETURNING id
    `;
    warehouseIds.push(rows[0].id);
  }
  let warehouseEntryCount = 0;
  for (let i = 0; i < 20; i++) {
    const entryType = Math.random() < 0.55 ? 'inward' : 'outward';
    await sql`
      INSERT INTO warehouse_entries (transport_id, warehouse_id, entry_type, lr_no, item_description, quantity, unit, entry_date, remarks, created_by)
      VALUES (
        ${TRANSPORT_ID}, ${pick(warehouseIds)}, ${entryType}, ${Math.random() < 0.5 ? pick(lrRecords).lr_no : ''}, ${pick(GOODS_TYPES)},
        ${randInt(10, 500)}, ${pick(['pcs', 'boxes', 'bags', 'pallets'])}, ${isoDate(daysAgo(randInt(0, 60)))}, 'Seeded demo entry', 'Seed Script'
      )
    `;
    warehouseEntryCount++;
  }
  console.log('Warehouses:', warehouseIds.length, 'Warehouse entries:', warehouseEntryCount);

  // ---------- Expense/Income Categories + Entries ----------
  const defaultCategories: [string, 'expense' | 'income'][] = [
    ['Fuel', 'expense'], ['Toll / Parking', 'expense'], ['Repair & Maintenance', 'expense'],
    ['Insurance', 'expense'], ['RTO / Tax', 'expense'], ['Office Expense', 'expense'], ['Other', 'expense'],
    ['Freight Income', 'income'], ['Vehicle Rent Income', 'income'], ['Other', 'income'],
  ];
  const categoryIds: { id: number; type: 'expense' | 'income' }[] = [];
  for (const [name, category_type] of defaultCategories) {
    const { rows } = await sql`
      INSERT INTO expense_income_categories (transport_id, name, category_type, status)
      VALUES (${TRANSPORT_ID}, ${name}, ${category_type}, 'active')
      RETURNING id
    `;
    categoryIds.push({ id: rows[0].id, type: category_type });
  }
  let expenseIncomeCount = 0;
  for (let i = 0; i < 40; i++) {
    const cat = pick(categoryIds);
    await sql`
      INSERT INTO expense_income_entries (
        transport_id, entry_type, category_id, amount, entry_date, payment_mode, vehicle_id, driver_id, remarks, created_by
      )
      VALUES (
        ${TRANSPORT_ID}, ${cat.type}, ${cat.id}, ${randInt(500, 25000)}, ${isoDate(daysAgo(randInt(0, 90)))}, ${pick(['cash', 'bank', 'cheque'])},
        ${Math.random() < 0.5 ? pick(vehicleIds) : null}, ${Math.random() < 0.3 ? pick(driverIds) : null}, 'Seeded demo entry', 'Seed Script'
      )
    `;
    expenseIncomeCount++;
  }
  console.log('Expense/Income entries:', expenseIncomeCount);

  // ---------- Driver Ledger Entries ----------
  let ledgerCount = 0;
  for (let i = 0; i < 30; i++) {
    const entryType = weighted<'advance' | 'rent' | 'deduction'>([['advance', 3], ['rent', 5], ['deduction', 2]]);
    await sql`
      INSERT INTO driver_ledger_entries (transport_id, driver_id, entry_type, amount, entry_date, remarks, created_by)
      VALUES (${TRANSPORT_ID}, ${pick(driverIds)}, ${entryType}, ${randInt(500, 8000)}, ${isoDate(daysAgo(randInt(0, 90)))}, 'Seeded demo entry', 'Seed Script')
    `;
    ledgerCount++;
  }
  console.log('Driver ledger entries:', ledgerCount);

  // ---------- Complaints ----------
  const complaintSubjects = ['Delayed delivery', 'Damaged goods on arrival', 'POD not received', 'Wrong delivery address used', 'Freight overcharged', 'Driver unresponsive', 'Vehicle breakdown delay', 'Missing items in shipment'];
  let complaintCount = 0;
  for (let i = 0; i < 8; i++) {
    const status = weighted<'open' | 'in_progress' | 'resolved' | 'closed'>([['open', 3], ['in_progress', 2], ['resolved', 2], ['closed', 1]]);
    await sql`
      INSERT INTO complaints (transport_id, consignor_id, lr_no, subject, description, status, resolution_remarks, resolved_at)
      VALUES (
        ${TRANSPORT_ID}, ${pick(consignorIds)}, ${pick(lrRecords).lr_no}, ${pick(complaintSubjects)}, 'Seeded demo complaint description for testing.',
        ${status}, ${status === 'resolved' || status === 'closed' ? 'Resolved after follow-up with the driver/warehouse team.' : ''},
        ${status === 'resolved' || status === 'closed' ? new Date() : null}
      )
    `;
    complaintCount++;
  }
  console.log('Complaints:', complaintCount);

  // ---------- Incident Reports ----------
  const incidentDescriptions = ['Minor accident at toll plaza, no injuries.', 'Vehicle breakdown due to tyre burst on highway.', 'Traffic delay due to road construction.', 'Overheating engine, stopped for cooldown.', 'Goods shifted during transit, re-secured.', 'Flat tyre replaced en route.'];
  let incidentCount = 0;
  for (let i = 0; i < 6; i++) {
    const status = weighted<'open' | 'reviewed' | 'closed'>([['open', 2], ['reviewed', 2], ['closed', 2]]);
    await sql`
      INSERT INTO incident_reports (transport_id, vehicle_id, driver_id, incident_date, description, status)
      VALUES (${TRANSPORT_ID}, ${pick(vehicleIds)}, ${pick(driverIds)}, ${isoDate(daysAgo(randInt(0, 60)))}, ${pick(incidentDescriptions)}, ${status})
    `;
    incidentCount++;
  }
  console.log('Incident reports:', incidentCount);

  // ---------- Staff Attendance (last 30 days, working days only) ----------
  let attendanceCount = 0;
  for (const userId of staffUserIds) {
    for (let d = 0; d < 30; d++) {
      const date = daysAgo(d);
      if (date.getDay() === 0) continue; // skip Sundays
      const status = weighted<'present' | 'absent' | 'half_day' | 'leave'>([['present', 20], ['absent', 2], ['half_day', 2], ['leave', 1]]);
      await sql`
        INSERT INTO staff_attendance (transport_id, user_id, attendance_date, status, remarks)
        VALUES (${TRANSPORT_ID}, ${userId}, ${isoDate(date)}, ${status}, '')
        ON CONFLICT (user_id, attendance_date) DO NOTHING
      `;
      attendanceCount++;
    }
  }
  console.log('Staff attendance records:', attendanceCount);

  // ---------- Staff Leave Requests ----------
  let leaveCount = 0;
  for (let i = 0; i < 5; i++) {
    const from = daysFromNow(randInt(-20, 20));
    const to = new Date(from.getTime() + randInt(1, 3) * 86400000);
    await sql`
      INSERT INTO staff_leave_requests (transport_id, user_id, leave_type, from_date, to_date, reason, status)
      VALUES (
        ${TRANSPORT_ID}, ${pick(staffUserIds)}, ${pick(['casual', 'sick', 'earned'])}, ${isoDate(from)}, ${isoDate(to)},
        'Personal reasons', ${pick(['pending', 'approved', 'rejected'])}
      )
    `;
    leaveCount++;
  }
  console.log('Staff leave requests:', leaveCount);

  console.log('\nSeed complete.');
  await closePool();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
