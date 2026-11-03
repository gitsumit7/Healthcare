import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { appointmentApi, doctorApi, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';
import Alert from '../components/Alert.jsx';
import { VerifiedBadge, DemoBadge } from '../components/DoctorCard.jsx';
import LocationInput from '../components/LocationInput.jsx';
import BookingSummary from '../components/BookingSummary.jsx';
import { DAYS, ageFromDob, formatDate, formatTime, hasPassed, initials, nextDays, paymentSummary, toDateKey } from '../utils.js';

const BOOKING_WINDOW_DAYS = 14;
const CLOCK_TICK_MS = 30_000; // how often passed slots drop off today's list
const SLOTS_REFRESH_MS = 60_000; // how often other patients' bookings are picked up

// Demo checkout options: online ones are recorded as paid, nothing is charged.
const CHECKOUT_OPTIONS = [
  { value: 'upi', label: 'UPI', hint: 'Demo payment — no money is charged' },
  { value: 'card', label: 'Card', hint: 'Demo payment — no card details needed' },
  { value: 'clinic', label: 'Pay at clinic', hint: 'Pay by cash or UPI at your visit' },
];

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Whether the doctor still has a slot starting after `now` on day `d` (any time, for future days).
function dayHasOpenings(doctor, d, now) {
  const windows = doctor.availability.filter((w) => w.day === d.getDay());
  if (toDateKey(d) !== toDateKey(now)) return windows.length > 0;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return windows.some((w) => toMinutes(w.end) - doctor.slotDuration > nowMinutes);
}

// The booking draft kept across the "Login to book" round trip. Older drafts held only the reason text.
function readDraft(key) {
  const raw = sessionStorage.getItem(key);
  if (!raw) return { reason: '', location: '' };
  try {
    const draft = JSON.parse(raw);
    return { reason: draft.reason || '', location: draft.location || draft.patient?.location || '' };
  } catch {
    return { reason: raw, location: '' };
  }
}

// Today if it still has openings, otherwise the next day the doctor works.
function firstBookableDate(doctor, now) {
  const day = nextDays(BOOKING_WINDOW_DAYS).find((d) => dayHasOpenings(doctor, d, now));
  return toDateKey(day || now);
}

export default function DoctorDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState('');
  // Draft survives the "Login to book" round trip, which unmounts this page.
  const draftKey = `booking-reason:${id}`;
  const [reason, setReason] = useState(() => readDraft(draftKey).reason);
  const [location, setLocation] = useState(() => readDraft(draftKey).location);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');

  // Name and age come from the profile; only the location is asked for (prefilled from the profile address).
  const profileAge = ageFromDob(user?.dateOfBirth);
  useEffect(() => {
    if (user?.role === 'patient') setLocation((current) => current || user.address || '');
  }, [user]);

  useEffect(() => {
    setError('');
    doctorApi
      .get(id)
      .then((d) => {
        setDoctor(d);
        setDate(firstBookableDate(d, new Date()));
      })
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // As the clock moves: drop a picked slot once it starts, and roll forward past midnight.
  useEffect(() => {
    if (!doctor || !date) return;
    if (date < toDateKey(now)) setDate(firstBookableDate(doctor, now));
    else if (slot && hasPassed(date, slot, now)) setSlot('');
  }, [now, doctor, date, slot]);

  useEffect(() => {
    if (!date) return;
    let active = true;
    const load = () =>
      doctorApi
        .slots(id, date)
        .then((d) => active && setSlots(d.slots))
        .catch((err) => active && setError(errorMessage(err)));

    setSlot('');
    setSlotsLoading(true);
    load().finally(() => active && setSlotsLoading(false));
    const timer = setInterval(load, SLOTS_REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, date, booked]);


  const startCheckout = () => {
    if (!user) {
      if (reason.trim() || location.trim()) sessionStorage.setItem(draftKey, JSON.stringify({ reason, location }));
      return navigate('/login', { state: { from: `/doctors/${id}` } });
    }
    if (!location.trim()) return setError('Enter your location, or tap the location icon to fill it in.');
    setError('');
    setCheckout(true);
  };

  const book = async () => {
    setBooking(true);
    setError('');
    try {
      const appointment = await appointmentApi.book({
        doctorId: id,
        date,
        slot,
        reason,
        paymentMethod,
        patientDetails: { location: location.trim() },
      });
      setBooked(appointment);
      setShowSummary(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCheckout(false);
      setReason('');
      sessionStorage.removeItem(draftKey);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBooking(false);
    }
  };

  if (!doctor) return error ? <Alert>{error}</Alert> : <Spinner />;

  const workingDays = [...new Set(doctor.availability.map((w) => w.day))].sort();
  // Today's list shrinks as times pass; future days show every slot.
  const openSlots = slots.filter((s) => !hasPassed(date, s.time, now));

  return (
    <div className="detail-layout">
      {booked && showSummary ? (
        <BookingSummary appointment={booked} doctor={doctor} onBack={() => setShowSummary(false)} />
      ) : (
        <section className="card">
          <div className="doctor-card-head">
            <div className="avatar avatar-lg">{initials(doctor.user.name)}</div>
            <div>
              <h1>{doctor.user.name}</h1>
              <p className="accent">{doctor.specialization}</p>
              <p className="muted small">{doctor.qualifications}</p>
              <div className="badges">
                {doctor.verification?.status === 'verified' && <VerifiedBadge />}
                {doctor.isDemo && <DemoBadge />}
              </div>
            </div>
          </div>
          {doctor.isDemo && (
            <p className="demo-note small">This is a sample profile for demonstration — not a real doctor.</p>
          )}
          <ul className="doctor-meta">
            <li><strong>{doctor.experience}</strong> yrs experience</li>
            <li><strong>₹{doctor.fees}</strong> consultation</li>
            <li><strong>{doctor.slotDuration}</strong> min slots</li>
          </ul>
          {doctor.about && (
            <>
              <h3>About</h3>
              <p>{doctor.about}</p>
            </>
          )}
          {doctor.hospital?._id && (
            <p className="doctor-hospital">
              🏥 Practises at <Link to={`/hospitals/${doctor.hospital._id}`}>{doctor.hospital.name}</Link>
              {doctor.hospital.isDemo && <span className="muted small"> (demo hospital)</span>}
            </p>
          )}
          <p>
            📍 {[doctor.hospital?._id ? null : doctor.clinicAddress, doctor.city, doctor.state].filter(Boolean).join(', ')}
            {doctor.pincode && ` – ${doctor.pincode}`}
          </p>
          <h3>Registration</h3>
          <ul className="hours">
            <li><span>Registration no.</span><span>{doctor.registrationNumber}</span></li>
            <li><span>Council</span><span>{doctor.medicalCouncil}</span></li>
            {doctor.registrationYear && <li><span>Year</span><span>{doctor.registrationYear}</span></li>}
            {doctor.hprId && <li><span>ABDM HPR ID</span><span>{doctor.hprId}</span></li>}
          </ul>
          <h3>Working hours</h3>
          <ul className="hours">
            {workingDays.map((day) => (
              <li key={day}>
                <span>{DAYS[day]}</span>
                <span>
                  {doctor.availability
                    .filter((w) => w.day === day)
                    .map((w) => `${formatTime(w.start)} – ${formatTime(w.end)}`)
                    .join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card booking">
        <h2>Book an appointment</h2>
        {booked && (
          <Alert type="success">
            Booked for {formatDate(booked.date)} at {formatTime(booked.slot)}. {paymentSummary(booked)}. Status: pending
            confirmation.{' '}
            <Link to="/dashboard">View in dashboard →</Link>
          </Alert>
        )}
        <Alert>{error}</Alert>

        <h4>Select date</h4>
        <div className="date-strip">
          {nextDays(BOOKING_WINDOW_DAYS).map((d) => {
            const key = toDateKey(d);
            const open = dayHasOpenings(doctor, d, now);
            return (
              <button
                key={key}
                type="button"
                disabled={!open}
                className={`date-pill ${key === date ? 'active' : ''}`}
                onClick={() => setDate(key)}
              >
                <span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <strong>{d.getDate()}</strong>
                <span>{d.toLocaleDateString(undefined, { month: 'short' })}</span>
              </button>
            );
          })}
        </div>

        <h4>Select time</h4>
        {slotsLoading ? (
          <Spinner label="Checking availability…" />
        ) : slots.length === 0 ? (
          <p className="empty">The doctor is not available on this day.</p>
        ) : openSlots.length === 0 ? (
          <p className="empty">No more slots left today. Please pick another day.</p>
        ) : (
          <div className="slot-grid">
            {openSlots.map((s) => (
              <button
                key={s.time}
                type="button"
                disabled={!s.available}
                className={`slot ${slot === s.time ? 'active' : ''}`}
                onClick={() => setSlot(s.time)}
              >
                {formatTime(s.time)}
              </button>
            ))}
          </div>
        )}

        {user?.role === 'patient' && (
          <p className="small muted booking-for">
            Booking for <strong>{user.name}</strong>
            {profileAge !== '' ? `, ${profileAge} yrs` : ''} — from your <Link to="/profile">profile</Link>
            {profileAge === '' && '. Add your date of birth there to include your age.'}
          </p>
        )}
        <label className="field">
          Location
          <LocationInput
            value={location}
            onChange={setLocation}
            maxLength={200}
            placeholder="Area, city — or tap the pin to detect it"
            autoComplete="address-level2"
          />
        </label>

        <label className="field">
          Reason for visit (optional)
          <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>

        {user && user.role !== 'patient' ? (
          <p className="muted">Only patient accounts can book appointments.</p>
        ) : checkout && slot ? (
          <div className="checkout">
            <h4>Checkout</h4>
            <dl className="checkout-summary">
              <dt>Patient</dt>
              <dd>{user.name}{profileAge !== '' ? `, ${profileAge} yrs` : ''}</dd>
              <dt>Location</dt>
              <dd>{location}</dd>
              <dt>Doctor</dt>
              <dd>{doctor.user.name}</dd>
              <dt>When</dt>
              <dd>{formatDate(date)} · {formatTime(slot)}</dd>
              <dt>Consultation fee</dt>
              <dd><strong>₹{doctor.fees}</strong></dd>
            </dl>
            <div className="pay-options" role="radiogroup" aria-label="Payment method">
              {CHECKOUT_OPTIONS.map((o) => (
                <label key={o.value} className={`pay-option ${paymentMethod === o.value ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={o.value}
                    checked={paymentMethod === o.value}
                    onChange={() => setPaymentMethod(o.value)}
                  />
                  <span>
                    <strong>{o.label}</strong>
                    <small>{o.hint}</small>
                  </span>
                </label>
              ))}
            </div>
            <div className="checkout-actions">
              <button type="button" className="btn btn-outline" disabled={booking} onClick={() => setCheckout(false)}>
                Back
              </button>
              <button type="button" className="btn btn-primary" disabled={booking} onClick={book}>
                {booking ? 'Booking…' : paymentMethod === 'clinic' ? 'Book · pay at clinic' : `Pay ₹${doctor.fees} & book`}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-primary btn-block" disabled={!slot} onClick={startCheckout}>
            {user ? `Continue to checkout${slot ? ` · ${formatTime(slot)}` : ''}` : 'Login to book'}
          </button>
        )}
      </section>
    </div>
  );
}
