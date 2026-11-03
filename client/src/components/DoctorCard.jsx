import { Link } from 'react-router-dom';
import { initials } from '../utils.js';

export const VerifiedBadge = () => (
  <span className="badge-verified" title="Medical registration verified by MediCare Connect">
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path fill="currentColor" d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1.1 3 1.1 3-2.8 1.6-.9 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.9-3.1L2.7 15.5l1.1-3-1.1-3 2.8-1.6.9-3.1 3.2.3z" />
      <path fill="#fff" d="M10.6 15.6l-3.2-3.2 1.4-1.4 1.8 1.8 4.6-4.6 1.4 1.4z" />
    </svg>
    Verified
  </span>
);

export const DemoBadge = () => (
  <span className="badge-demo" title="Sample profile for demonstration - not a real doctor">Demo</span>
);

export default function DoctorCard({ doctor }) {
  return (
    <article className="card doctor-card">
      <div className="doctor-card-head">
        <div className="avatar">{initials(doctor.user?.name)}</div>
        <div>
          <h3>{doctor.user?.name}</h3>
          <p className="muted">{doctor.specialization}</p>
          <div className="badges">
            {doctor.verification?.status === 'verified' && <VerifiedBadge />}
            {doctor.isDemo && <DemoBadge />}
          </div>
        </div>
      </div>
      <p className="muted small">{doctor.qualifications}</p>
      <ul className="doctor-meta">
        <li><strong>{doctor.experience}</strong> yrs exp.</li>
        <li><strong>₹{doctor.fees}</strong> fee</li>
      </ul>
      {doctor.hospital?._id && (
        <p className="small doctor-hospital">
          🏥 <Link to={`/hospitals/${doctor.hospital._id}`}>{doctor.hospital.name}</Link>
        </p>
      )}
      <p className="small">
        📍 {[doctor.city, doctor.state].filter(Boolean).join(', ')}
        {doctor.pincode && <span className="muted"> · {doctor.pincode}</span>}
      </p>
      <Link to={`/doctors/${doctor._id}`} className="btn btn-primary btn-block">
        View &amp; Book
      </Link>
    </article>
  );
}
