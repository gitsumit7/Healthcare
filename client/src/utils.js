export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Local-date YYYY-MM-DD (toISOString would shift by timezone).
export const toDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const nextDays = (count) =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

export const formatDate = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export const formatTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const initials = (name = '') =>
  name
    .replace(/^Dr\.?\s*/i, '')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const hasPassed = (date, slot, now = new Date()) => new Date(`${date}T${slot}:00`) <= now;

// Whole years since a date of birth, or '' when unknown.
export function ageFromDob(dob, now = new Date()) {
  if (!dob) return '';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '';
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : '';
}

// "Ravi Kumar, 34 yrs · Andheri West, Mumbai" for the person a visit was booked for.
export function patientLine(a) {
  const p = a.patientDetails;
  if (!p?.name) return '';
  return `${p.name}${p.age != null ? `, ${p.age} yrs` : ''}${p.location ? ` · ${p.location}` : ''}`;
}

export const PAYMENT_LABELS = { upi: 'UPI', card: 'Card', cash: 'Cash', clinic: 'Pay at clinic' };

// One-line payment state for an appointment card.
export function paymentSummary(a) {
  const p = a.payment || { status: 'unpaid', method: 'clinic' };
  if (p.status === 'paid') return `Paid ₹${a.fees} · ${PAYMENT_LABELS[p.method]}${p.reference ? ` · Ref ${p.reference}` : ''}`;
  if (p.status === 'refunded') return `₹${a.fees} refunded to ${PAYMENT_LABELS[p.method]}`;
  return `₹${a.fees} due at the clinic`;
}
