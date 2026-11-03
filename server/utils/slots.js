const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

// Returns every slot start time a doctor offers on the given YYYY-MM-DD date.
export function generateSlots(doctor, date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  const slots = [];
  for (const window of doctor.availability.filter((w) => w.day === day)) {
    for (let t = toMinutes(window.start); t + doctor.slotDuration <= toMinutes(window.end); t += doctor.slotDuration) {
      slots.push(toHHMM(t));
    }
  }
  return [...new Set(slots)].sort();
}

// Slot times are clinic wall-clock times, so "now" is read in the clinic's timezone rather than the
// server's (a UTC host would otherwise open or close slots 5½ hours off).
const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || 'Asia/Kolkata';
const clinicClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// Current clinic time as "YYYY-MM-DDTHH:mm", which compares correctly as a string.
export function clinicNow() {
  const p = Object.fromEntries(clinicClock.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function isPast(date, slot) {
  return `${date}T${slot}` <= clinicNow();
}
