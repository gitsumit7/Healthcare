import { formatDate, paymentSummary } from '../utils.js';

// Payment, the doctor's notes and follow-up, and where the visit stands on completion.
export default function VisitSummary({ appointment: a }) {
  const completed = a.status === 'completed';
  const awaitingAdmin = !completed && ['pending', 'confirmed'].includes(a.status) && a.checkedOutAt;
  return (
    <>
      <p className="small">
        <strong>Payment:</strong> {paymentSummary(a)}
      </p>
      {(a.doctorNotes || a.followUpDate || completed || awaitingAdmin) && (
        <div className={`small notes ${completed ? 'visit-summary' : ''}`}>
          {completed && <strong className="visit-summary-title">Visit summary</strong>}
          {a.doctorNotes && (
            <p>
              <strong>Notes / prescription:</strong> {a.doctorNotes}
            </p>
          )}
          {a.followUpDate && (
            <p>
              <strong>Follow-up:</strong> {formatDate(a.followUpDate)}
            </p>
          )}
          {awaitingAdmin && (
            <p className="muted">
              Checked out by the doctor on {new Date(a.checkedOutAt).toLocaleDateString()} · awaiting admin completion
            </p>
          )}
          {completed && a.completedAt && (
            <p className="muted">
              Marked complete by {a.completedByRole === 'admin' ? 'clinic admin' : 'the doctor'}
              {a.completedBy?.name && ` (${a.completedBy.name})`} on {new Date(a.completedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </>
  );
}
