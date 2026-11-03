import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorMessage } from '../api/client.js';
import useLiveUpdates from '../api/useLiveUpdates.js';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import VisitSummary from '../components/VisitSummary.jsx';
import { formatDate, formatTime, patientLine } from '../utils.js';

const QUEUES = [
  { key: 'review', label: 'To review', empty: 'No pending or upcoming appointments to review.' },
  { key: 'completed', label: 'Completed', empty: 'No completed visits yet.' },
  { key: 'upcoming', label: 'Upcoming', empty: 'No upcoming appointments.' },
  { key: 'all', label: 'All', empty: 'No appointments yet.' },
];

// What the admin can do from each status. Every change is pushed to the patient's and doctor's dashboards.
const ACTIONS = {
  pending: [
    { status: 'completed', label: 'Mark complete', className: 'btn-primary' },
    { status: 'confirmed', label: 'Confirm', className: 'btn-outline' },
    { status: 'cancelled', label: 'Cancel', className: 'btn-danger', confirm: 'Cancel this appointment?' },
  ],
  confirmed: [
    { status: 'completed', label: 'Mark complete', className: 'btn-primary' },
    { status: 'pending', label: 'Back to pending', className: 'btn-outline' },
    { status: 'cancelled', label: 'Cancel', className: 'btn-danger', confirm: 'Cancel this appointment?' },
  ],
  completed: [
    { status: 'pending', label: 'Mark incomplete', className: 'btn-outline', confirm: 'Mark this visit as not completed? It goes back to pending.' },
  ],
  cancelled: [{ status: 'pending', label: 'Restore', className: 'btn-outline', confirm: 'Restore this booking as pending?' }],
};

export default function AdminCompletions() {
  const [queue, setQueue] = useState('review');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => setPage(1), [queue, search]);

  const query = useCallback(
    () => adminApi.appointments({ queue, page, search: search.trim() || undefined }),
    [queue, page, search]
  );

  useEffect(() => {
    let stale = false;
    if (!refresh) setLoading(true);
    const timer = setTimeout(() => {
      query()
        .then((d) => !stale && setData(d))
        .catch((err) => !stale && setError(errorMessage(err)))
        .finally(() => !stale && setLoading(false));
    }, search && !refresh ? 300 : 0);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, search, refresh]);

  // Someone else (a patient booking or cancelling, a doctor confirming) changed an appointment: reload quietly.
  useLiveUpdates(() => setRefresh((n) => n + 1));

  // The card keeps its place with the new status (so "Mark complete" turns into "Completed"); the counts reload.
  const changeStatus = async (appt, { status, confirm }) => {
    if (confirm && !window.confirm(confirm)) return;
    setBusyId(appt._id);
    setError('');
    try {
      const updated = await adminApi.setAppointmentStatus(appt._id, status);
      setData((d) => ({ ...d, appointments: d.appointments.map((a) => (a._id === updated._id ? updated : a)) }));
      const { counts } = await query();
      setData((d) => ({ ...d, counts }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const counts = data?.counts;
  const current = QUEUES.find((q) => q.key === queue);

  return (
    <section>
      <h1>Admin · Visit completions</h1>
      <p className="muted">
        Confirm, complete, cancel or restore any appointment. Patients and doctors see every change on their dashboards
        straight away.
      </p>
      <Alert>{error}</Alert>

      {counts && (
        <div className="stats">
          <div className="stat card"><span>To review</span><strong>{counts.review}</strong><small>Pending or confirmed, not completed</small></div>
          <div className="stat card"><span>Completed</span><strong>{counts.completed}</strong><small>Marked complete by admin</small></div>
          <div className="stat card"><span>Upcoming</span><strong>{counts.upcoming}</strong><small>Time not reached yet</small></div>
          <div className="stat card"><span>All</span><strong>{counts.all}</strong><small>Including cancelled</small></div>
        </div>
      )}

      <div className="tabs">
        {QUEUES.map((q) => (
          <button key={q.key} className={queue === q.key ? 'active' : ''} onClick={() => setQueue(q.key)}>
            {q.label}
            {counts && ` (${counts[q.key]})`}
          </button>
        ))}
      </div>
      <div className="search-input admin-search">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient or doctor name / email"
          aria-label="Search appointments"
        />
      </div>

      {loading && !data ? (
        <Spinner />
      ) : data.appointments.length === 0 ? (
        <p className="empty">{search ? 'No appointments match your search.' : current.empty}</p>
      ) : (
        <div className="appt-list">
          {data.appointments.map((a) => {
            const busy = busyId === a._id;
            return (
              <article key={a._id} className="card appt">
                <div className="appt-when">
                  <strong>{formatTime(a.slot)}</strong>
                  <span>{formatDate(a.date)}</span>
                </div>
                <div className="appt-body">
                  <h3>{a.patient?.name}</h3>
                  <p className="muted small">
                    with {a.doctor?.user?.name} · {a.doctor?.specialization}
                  </p>
                  {patientLine(a) && <p className="small"><strong>Patient:</strong> {patientLine(a)}</p>}
                  {a.reason && <p className="small"><strong>Reason:</strong> {a.reason}</p>}
                  <VisitSummary appointment={a} />
                </div>
                <div className="appt-actions">
                  <StatusBadge status={a.status} />
                  {a.status === 'completed' && (
                    <button className="btn btn-sm btn-completed" disabled aria-label="Completed">
                      ✓ Completed
                    </button>
                  )}
                  {(ACTIONS[a.status] || []).map((action) => (
                    <button
                      key={action.status}
                      className={`btn btn-sm ${action.className}`}
                      disabled={busy}
                      onClick={() => changeStatus(a, action)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="pager">
          <button className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            ← Previous
          </button>
          <span className="muted small">
            Page {data.page} of {data.pages}
          </span>
          <button className="btn btn-outline btn-sm" disabled={page >= data.pages || loading} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
