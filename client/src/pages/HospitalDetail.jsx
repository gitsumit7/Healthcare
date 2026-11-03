import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errorMessage, hospitalApi } from '../api/client.js';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import DoctorCard, { DemoBadge } from '../components/DoctorCard.jsx';
import { hospitalMapUrl, telHref } from './Hospitals.jsx';

export default function HospitalDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [specialty, setSpecialty] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    hospitalApi
      .get(id)
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  const specialties = useMemo(
    () => [...new Set((data?.doctors || []).map((d) => d.specialization))].sort(),
    [data]
  );

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;

  const { hospital: h, doctors } = data;
  const shown = specialty ? doctors.filter((d) => d.specialization === specialty) : doctors;
  // Doctor cards link back to the hospital; inside its own page that link would point here.
  const cardDoctors = shown.map((d) => ({ ...d, hospital: undefined }));

  return (
    <section>
      <p className="small">
        <Link to={`/hospitals?state=${encodeURIComponent(h.state || '')}`}>← Hospitals in {h.state}</Link>
      </p>

      <div className="card hospital-hero">
        <div>
          <h1>
            {h.name} {h.isDemo && <DemoBadge />}
          </h1>
          <div className="badges">
            {h.category && <span className="chip-sm">{h.category}</span>}
            {h.careType && <span className="chip-sm">{h.careType}</span>}
            {h.systemsOfMedicine && <span className="chip-sm">{h.systemsOfMedicine}</span>}
            {h.beds && <span className="chip-sm">{h.beds} beds</span>}
          </div>
          <p>
            📍 {[h.isDemo ? null : h.address, h.district, h.state].filter(Boolean).join(', ')}
            {h.pincode && ` – ${h.pincode}`}
          </p>
          {h.specialties && <p className="muted small">Specialties: {h.specialties}</p>}
          {h.isDemo && (
            <p className="demo-note small">Sample hospital for demonstration — not a real facility. For an emergency call 108.</p>
          )}
        </div>
        <div className="hospital-actions">
          {h.phone && <a className="btn btn-outline btn-sm" href={telHref(h.phone)}>📞 {h.phone.split(/[,/;]/)[0]}</a>}
          {h.emergencyPhone && (
            <a className="btn btn-danger btn-sm" href={telHref(h.emergencyPhone)}>
              🚑 {h.emergencyPhone === '108' ? '108 Ambulance' : 'Emergency'}
            </a>
          )}
          <a className="btn btn-outline btn-sm" href={hospitalMapUrl(h)} target="_blank" rel="noreferrer">Map ↗</a>
        </div>
      </div>

      <div className="section-head hospital-doctors-head">
        <div>
          <h2>Doctors at this hospital</h2>
          <p className="muted">
            {doctors.length
              ? `${doctors.length} verified doctor${doctors.length > 1 ? 's' : ''} on MediCare Connect practise here`
              : 'No doctors on MediCare Connect have listed this hospital yet.'}
          </p>
        </div>
        {specialties.length > 1 && (
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} aria-label="Filter by specialty">
            <option value="">All departments ({doctors.length})</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s} ({doctors.filter((d) => d.specialization === s).length})
              </option>
            ))}
          </select>
        )}
      </div>

      {doctors.length === 0 ? (
        <div className="empty">
          <p>
            Looking for a doctor nearby?{' '}
            <Link to={`/doctors?state=${encodeURIComponent(h.state || '')}&city=${encodeURIComponent(h.district || '')}`}>
              See all doctors in {h.district || h.state} →
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid">
          {cardDoctors.map((d) => (
            <DoctorCard key={d._id} doctor={d} />
          ))}
        </div>
      )}
    </section>
  );
}
