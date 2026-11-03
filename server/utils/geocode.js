// Turns the browser's GPS coordinates into a readable place for the booking form, using OpenStreetMap's Nominatim
// (free, no key). Its usage policy asks for an identifying User-Agent and at most one request per second, so lookups
// are spaced out and repeated spots are answered from a small cache.

const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'MediCare-Connect/1.0 (appointment booking; reverse geocoding)';
const MIN_INTERVAL_MS = 1100;
const CACHE_SIZE = 500;

const cache = new Map(); // "lat,lon" rounded to ~100 m -> place
let nextSlot = 0;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const first = (...values) => values.find((v) => typeof v === 'string' && v.trim()) || undefined;

// { label, area, city, district, state, pincode } for a point, or null when nothing is known there.
export async function reverseGeocode(lat, lon) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (cache.has(key)) return cache.get(key);

  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + MIN_INTERVAL_MS;
  await wait(start - now);

  const url = `${NOMINATIM_URL}?format=jsonv2&zoom=16&addressdetails=1&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Location service answered ${res.status}`);
  const data = await res.json();
  const a = data.address;
  if (!a) return null;

  const area = first(a.suburb, a.neighbourhood, a.village, a.hamlet, a.quarter, a.road);
  const city = first(a.city, a.town, a.municipality, a.county);
  const district = first(a.state_district, a.county, a.city_district);
  const place = {
    area,
    city,
    district,
    state: a.state,
    pincode: a.postcode,
    label: [...new Set([area, city, district, a.state].filter(Boolean))].join(', ') + (a.postcode ? ` - ${a.postcode}` : ''),
  };

  if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value);
  cache.set(key, place);
  return place;
}
