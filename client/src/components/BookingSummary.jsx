import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { formatDate, formatTime, paymentSummary } from '../utils.js';

const Row = ({ label, children }) =>
  children || children === 0 ? (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  ) : null;

// Everything about a booking just made: the appointment, who it is for and the doctor they will see.
export default function BookingSummary({ appointment: a, doctor, onBack }) {
  const p = a.patientDetails || {};
  const account = a.patient || {};
  const doctorUser = doctor.user || a.doctor?.user || {};
  const where = doctor.hospital?._id
    ? doctor.hospital.name
    : [doctor.clinicAddress, doctor.city, doctor.state].filter(Boolean).join(', ');

  return (
    <section className="card booking-summary">
      <h2>Appointment booked ✓</h2>
      <p className="muted small">Booking reference {String(a._id).slice(-8).toUpperCase()} · the doctor will confirm it shortly.</p>

      <h3>Appointment</h3>
      <dl className="summary-list">
        <Row label="Date">{formatDate(a.date)}</Row>
        <Row label="Time">{formatTime(a.slot)}</Row>
        <Row label="Status"><StatusBadge status={a.status} /></Row>
        <Row label="Payment">{paymentSummary(a)}</Row>
        <Row label="Reason for visit">{a.reason}</Row>
      </dl>

      <h3>Patient</h3>
      <dl className="summary-list">
        <Row label="Name">{p.name}</Row>
        <Row label="Age">{p.age != null ? `${p.age} years` : null}</Row>
        <Row label="Location">{p.location}</Row>
        <Row label="Booked by">{account.name}</Row>
        <Row label="Email">{account.email}</Row>
        <Row label="Phone">{account.phone}</Row>
        <Row label="Blood group">{account.bloodGroup}</Row>
      </dl>

      <h3>Doctor</h3>
      <dl className="summary-list">
        <Row label="Name">{doctorUser.name}</Row>
        <Row label="Specialization">{doctor.specialization}</Row>
        <Row label="Qualifications">{doctor.qualifications}</Row>
        <Row label="Experience">{doctor.experience != null ? `${doctor.experience} years` : null}</Row>
        <Row label="Consultation fee">₹{a.fees ?? doctor.fees}</Row>
        <Row label="Practises at">{where}</Row>
        <Row label="City / State">{[doctor.city, doctor.state].filter(Boolean).join(', ') + (doctor.pincode ? ` – ${doctor.pincode}` : '')}</Row>
        <Row label="Registration">{[doctor.registrationNumber, doctor.medicalCouncil].filter(Boolean).join(' · ')}</Row>
        <Row label="Email">{doctorUser.email}</Row>
        <Row label="Phone">{doctorUser.phone}</Row>
      </dl>

      <div className="summary-actions">
        <Link to="/dashboard" className="btn btn-primary">View in dashboard</Link>
        <button type="button" className="btn btn-outline" onClick={onBack}>
          Back to doctor profile
        </button>
      </div>
    </section>
  );
}
