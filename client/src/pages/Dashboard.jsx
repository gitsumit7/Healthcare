import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import VerificationBanner from '../components/VerificationBanner.jsx';
import { appointmentApi, errorMessage } from '../api/client.js';
import useLiveUpdates from '../api/useLiveUpdates.js';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';
import Alert from '../components/Alert.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import VisitSummary from '../components/VisitSummary.jsx';
import CheckOutForm from '../components/CheckOutForm.jsx';
import { formatDate, formatTime, hasPassed, patientLine } from '../utils.js';

const CLOCK_TICK_MS = 30_000; // how often time-based actions (confirm, cancel, check out) update
const REFRESH_MS = 60_000; // backup re-fetch; changes normally arrive instantly over the live stream

const isCancelled = (a) => a.status === 'cancelled';
// A visit stays upcoming until an admin marks it completed (or it is cancelled).
const isUpcoming = (a) => ['pending', 'confirmed'].includes(a.status);

const TABS = {
  upcoming: { label: 'Upcoming', match: isUpcoming },
  pending: { label: 'Pending', match: (a) => a.status === 'pending' },
  completed: { label: 'Completed', match: (a) => a.status === 'completed' },
  cancelled: { label: 'Cancelled', match: isCancelled },
  all: { label: 'All', match: () => true },
};

export default function Dashboard() {
  const { user } = useAuth();
  // Admins have no appointments of their own; their home is the verification console.
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <AppointmentsDashboard />;
}

function AppointmentsDashboard() {
  const { user, doctor } = useAuth();
  const location = useLocation();
  const isDoctor = user.role === 'doctor';
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('upcoming');
  const [busyId, setBusyId] = useState(null);
  const [checkOutId, setCheckOutId] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // The first load shows a spinner; background refreshes swap the list in quietly.
  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    return appointmentApi
      .mine()
      .then(setAppointments)
      .catch((err) => !quiet && setError(errorMessage(err)))
      .finally(() => !quiet && setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const refresh = () => document.visibilityState === 'visible' && load(true);
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);

  // An admin (or the doctor / patient on the other side) changed one of these appointments.
  useLiveUpdates(() => load(true));

  const stats = useMemo(
    () => ({
      total: appointments.filter((a) => !isCancelled(a)).length,
      upcoming: appointments.filter(isUpcoming).length,
      pending: appointments.filter((a) => a.status === 'pending').length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      cancelled: appointments.filter(isCancelled).length,
    }),
    [appointments]
  );

  const visible = appointments
    .filter((a) => TABS[tab].match(a))
    .sort((a, b) => {
      const cmp = `${a.date}${a.slot}`.localeCompare(`${b.date}${b.slot}`);
      return tab === 'upcoming' ? cmp : -cmp;
    });

  const replace = (updated) => setAppointments((list) => list.map((a) => (a._id === updated._id ? updated : a)));

  const update = async (appt, data, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(appt._id);
    setError('');
    try {
      replace(await appointmentApi.updateStatus(appt._id, data));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const addNotes = (appt) => {
    const notes = window.prompt('Consultation notes / prescription', appt.doctorNotes || '');
    if (notes !== null) update(appt, { doctorNotes: notes });
  };

  return (
    <section>
      <div className="section-head">
        <div>
          <h1>{isDoctor ? 'Doctor dashboard' : 'My appointments'}</h1>
          <p className="muted">Welcome, {user.name}</p>
        </div>
        {!isDoctor && (
          <Link to="/doctors" className="btn btn-primary">+ Book appointment</Link>
        )}
      </div>

      {isDoctor && doctor && <VerificationBanner verification={doctor.verification} showProfileLink />}
      {location.state?.passwordReset &&<Alert type="success">Your password has been reset and you are logged in.</Alert>}

      <div className="stats">
        <div className="stat card"><span>Total</span><strong>{stats.total}</strong><small>All bookings except cancelled</small></div>
        <div className="stat card"><span>Upcoming</span><strong>{stats.upcoming}</strong><small>Not yet completed by admin</small></div>
        <div className="stat card"><span>Pending</span><strong>{stats.pending}</strong><small>Awaiting doctor&apos;s confirmation</small></div>
        <div className="stat card"><span>Completed</span><strong>{stats.completed}</strong><small>Marked complete by admin</small></div>
        <div className="stat card"><span>Cancelled</span><strong>{stats.cancelled}</strong><small>By you or the {isDoctor ? 'patient' : 'doctor'}</small></div>
      </div>

      <div className="tabs">
        {Object.entries(TABS).map(([key, { label }]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      <Alert>{error}</Alert>
      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <p className="empty">No {tab === 'all' ? '' : TABS[tab].label.toLowerCase()} appointments.</p>
      ) : (
        <div className="appt-list">
          {visible.map((a) => {
            const busy = busyId === a._id;
            const started = hasPassed(a.date, a.slot, now);
            return (
              <article key={a._id} className="card appt">
                <div className="appt-when">
                  <strong>{formatTime(a.slot)}</strong>
                  <span>{formatDate(a.date)}</span>
                </div>
                <div className="appt-body">
                  {isDoctor ? (
                    <>
                      <h3>{a.patient?.name}</h3>
                      <p className="muted small">
                        {a.patient?.email} {a.patient?.phone && `· ${a.patient.phone}`}
                        {a.patient?.bloodGroup && ` · Blood group ${a.patient.bloodGroup}`}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3>{a.doctor?.user?.name}</h3>
                      <p className="muted small">
                        {a.doctor?.specialization} · ₹{a.fees} {a.doctor?.clinicAddress && `· ${a.doctor.clinicAddress}`}
                      </p>
                    </>
                  )}
                  {patientLine(a) && <p className="small"><strong>Patient:</strong> {patientLine(a)}</p>}
                  {a.reason && <p className="small"><strong>Reason:</strong> {a.reason}</p>}
                  <VisitSummary appointment={a} />
                  {checkOutId === a._id && (
                    <CheckOutForm
                      appointment={a}
                      onCancel={() => setCheckOutId(null)}
                      onDone={(updated) => {
                        replace(updated);
                        setCheckOutId(null);
                      }}
                    />
                  )}
                </div>
                <div className="appt-actions">
                  <StatusBadge status={a.status} />
                  {isDoctor && a.status === 'pending' && !started && (
                    <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => update(a, { status: 'confirmed' })}>
                      Confirm
                    </button>
                  )}
                  {/* A consultation can only be marked done once its time has come. */}
                  {isDoctor && !isCancelled(a) && started && checkOutId !== a._id && (
                    <button
                      className={`btn btn-sm ${a.checkedOutAt ? 'btn-outline' : 'btn-primary'}`}
                      disabled={busy}
                      onClick={() => setCheckOutId(a._id)}
                    >
                      {a.checkedOutAt ? 'Edit check-out' : 'Check out'}
                    </button>
                  )}
                  {isDoctor && a.status !== 'cancelled' && (
                    <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => addNotes(a)}>
                      {a.doctorNotes ? 'Edit notes' : 'Add notes'}
                    </button>
                  )}
                  {['pending', 'confirmed'].includes(a.status) && (isDoctor || !started) && (
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={busy}
                      onClick={() => update(a, { status: 'cancelled' }, 'Cancel this appointment?')}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
