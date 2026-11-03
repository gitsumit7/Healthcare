import crypto from 'node:crypto';
import Hospital from '../models/Hospital.js';
import Doctor from '../models/Doctor.js';
import { INDIAN_STATES } from './india.js';

// Imports the National Health Portal hospital directory from the data.gov.in Open Government Data API.
// Needs DATA_GOV_IN_API_KEY (free, from your data.gov.in account). DATA_GOV_IN_HOSPITAL_RESOURCE_ID picks the dataset
// and defaults to "National Hospital Directory with Geo Code and additional parameters (updated till last month)",
// published by the Ministry of Health and Family Welfare / NIHFW.

const API_BASE = () => process.env.DATA_GOV_IN_API_BASE || 'https://api.data.gov.in/resource';
const DEFAULT_RESOURCE_ID = '98fa254e-c5f8-4910-a19b-4828939b477d';
const resourceId = () => process.env.DATA_GOV_IN_HOSPITAL_RESOURCE_ID || DEFAULT_RESOURCE_ID;

export const hospitalImportConfigured = () => Boolean(process.env.DATA_GOV_IN_API_KEY);

// "Hospital_Name", "hospital_name" and "Hospital Name" all become "hospitalname".
const normaliseKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');

const FIELD_ALIASES = {
  name: ['hospitalname', 'name', 'facilityname'],
  category: ['hospitalcategory', 'category', 'ownership'],
  careType: ['hospitalcaretype', 'caretype', 'facilitytype'],
  systemsOfMedicine: ['disciplinesystemsofmedicine', 'systemsofmedicine', 'discipline'],
  specialties: ['specialties', 'specialities'],
  address: ['addressoriginalfirstline', 'address', 'location'],
  state: ['state', 'statename'],
  district: ['district', 'districtname'],
  pincode: ['pincode', 'pin', 'pincodes'],
  phone: ['telephone', 'mobilenumber', 'phone', 'contactnumber'],
  emergencyPhone: ['emergencynum', 'emergencynumber', 'ambulancephoneno'],
  email: ['hospitalprimaryemailid', 'email', 'emailid'],
  website: ['website', 'websiteurl'],
  beds: ['totalnumbeds', 'beds', 'numberofbeds'],
  coordinates: ['locationcoordinates', 'coordinates', 'latlong'],
  sourceId: ['srno', 'sno', 'id', 'hospitalid'],
};

const EMPTY = new Set(['', '0', 'na', 'n/a', 'nil', 'none', '-', 'null', 'notavailable']);
const clean = (v) => {
  if (v == null) return undefined;
  const s = String(v).trim();
  return EMPTY.has(s.toLowerCase().replace(/\s/g, '')) ? undefined : s;
};

const STATE_ALIASES = {
  nctofdelhi: 'Delhi',
  newdelhi: 'Delhi',
  orissa: 'Odisha',
  pondicherry: 'Puducherry',
  uttaranchal: 'Uttarakhand',
  dadraandnagarhaveli: 'Dadra and Nagar Haveli and Daman and Diu',
  damananddiu: 'Dadra and Nagar Haveli and Daman and Diu',
  andamanandnicobar: 'Andaman and Nicobar Islands',
  jammukashmir: 'Jammu and Kashmir',
  // A West Bengal district that the source lists as a state on one record.
  northtwentyfourparganas: 'West Bengal',
};
const STATE_LOOKUP = new Map(INDIAN_STATES.map((s) => [normaliseKey(s.replace(/&/g, 'and')), s]));

export function normaliseState(raw) {
  const value = clean(raw);
  if (!value) return undefined;
  const key = normaliseKey(value.replace(/&/g, 'and'));
  return STATE_LOOKUP.get(key) || STATE_ALIASES[key] || value.replace(/\b\w/g, (c) => c.toUpperCase());
}

const titleCase = (s) => (s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s);

/** Maps one data.gov.in record to Hospital fields, or null if it has no name. */
export function mapHospitalRecord(record) {
  const byKey = new Map(Object.entries(record).map(([k, v]) => [normaliseKey(k), v]));
  const get = (field) => {
    for (const alias of FIELD_ALIASES[field]) {
      const value = clean(byKey.get(alias));
      if (value) return value;
    }
    return undefined;
  };

  const name = get('name');
  if (!name) return null;

  const [lat, lng] = String(get('coordinates') || '').split(/[,\s]+/).map(Number);
  const pincode = get('pincode')?.match(/[1-9]\d{5}/)?.[0];
  const state = normaliseState(get('state'));
  const district = titleCase(get('district'));
  const sourceId =
    get('sourceId') ||
    crypto.createHash('sha1').update([name, state, district, pincode].join('|').toLowerCase()).digest('hex').slice(0, 16);

  return {
    name: titleCase(name),
    category: get('category'),
    careType: get('careType'),
    systemsOfMedicine: get('systemsOfMedicine'),
    specialties: get('specialties'),
    address: get('address'),
    state,
    district,
    pincode,
    phone: get('phone'),
    emergencyPhone: get('emergencyPhone'),
    email: get('email'),
    website: get('website'),
    beds: Number(get('beds')) || undefined,
    location: Number.isFinite(lat) && Number.isFinite(lng) && lat && lng ? { lat, lng } : undefined,
    sourceId: `datagovin:${sourceId}`,
  };
}

/**
 * Pages through the dataset and upserts hospitals. Resolves to { imported, fetched, total }.
 * `limit` caps how many records are fetched (the full directory has tens of thousands).
 */
export async function importHospitals({ limit = Number(process.env.HOSPITAL_IMPORT_LIMIT) || 5000, pageSize = 500, log = () => {} } = {}) {
  if (!hospitalImportConfigured()) {
    throw new Error('Set DATA_GOV_IN_API_KEY in server/.env to import hospitals');
  }
  const base = `${API_BASE()}/${encodeURIComponent(resourceId())}`;
  let offset = 0;
  let fetched = 0;
  let imported = 0;
  let total;

  while (fetched < limit) {
    const size = Math.min(pageSize, limit - fetched);
    const url = `${base}?api-key=${encodeURIComponent(process.env.DATA_GOV_IN_API_KEY)}&format=json&offset=${offset}&limit=${size}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status === 'error') {
      throw new Error(`data.gov.in request failed (${res.status}): ${data.message || data.error || 'unexpected response'}`);
    }

    const records = Array.isArray(data.records) ? data.records : [];
    total = Number(data.total) || total;
    if (!records.length) break;

    const docs = records.map(mapHospitalRecord).filter(Boolean);
    if (docs.length) {
      const result = await Hospital.bulkWrite(
        docs.map((doc) => ({
          updateOne: { filter: { sourceId: doc.sourceId }, update: { $set: { ...doc, importedAt: new Date() } }, upsert: true },
        })),
        { ordered: false }
      );
      imported += result.upsertedCount + result.modifiedCount;
    }

    fetched += records.length;
    offset += records.length;
    log(`Hospitals: fetched ${fetched}${total ? ` of ${total}` : ''}`);
    if (records.length < size || (total && offset >= total)) break;
  }

  // Real data has arrived, so the sample hospitals are no longer needed. Doctors attached to one fall back
  // to their own clinic (they can pick a real hospital in their profile).
  let demoRemoved = 0;
  if (imported > 0) {
    const demoIds = await Hospital.find({ isDemo: true }).distinct('_id');
    await Doctor.updateMany({ hospital: { $in: demoIds } }, { $unset: { hospital: 1 } });
    ({ deletedCount: demoRemoved } = await Hospital.deleteMany({ _id: { $in: demoIds } }));
  }
  return { imported, fetched, total, demoRemoved };
}
