import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doctorApi } from '../api/client.js';
import DoctorCard from '../components/DoctorCard.jsx';

const FEATURES = [
  { icon: '🔍', title: 'Discover doctors', text: 'Search verified specialists by name or specialty and compare fees and experience.' },
  { icon: '📅', title: 'Book instantly', text: 'See real-time slot availability and confirm an appointment in a few clicks.' },
  { icon: '🗂️', title: 'Manage care', text: 'Track upcoming visits, cancel when needed and keep your health profile up to date.' },
];

const POPULAR = [
  'General Physician', 'Pediatrician', 'Gynecologist', 'Dentist', 'Dermatologist',
  'Cardiologist', 'Orthopedic Surgeon', 'ENT Specialist', 'Ophthalmologist', 'Psychiatrist',
];

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [specializations, setSpecializations] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);

  useEffect(() => {
    doctorApi.specializations().then(setSpecializations).catch(() => {});
    doctorApi.list({ sort: 'experience' }).then((d) => setFeatured(d.doctors.slice(0, 3))).catch(() => {});
  }, []);

  // The most-searched specialties come first; the rest open with "+N more".
  const popular = POPULAR.filter((s) => specializations.includes(s));
  const ordered = [...popular, ...specializations.filter((s) => !POPULAR.includes(s))];
  const shownSpecialties = showAllSpecialties ? ordered : popular.length ? popular : ordered.slice(0, POPULAR.length);
  const hiddenCount = ordered.length - shownSpecialties.length;

  const submit = (e) => {
    e.preventDefault();
    navigate(`/doctors${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  };

  return (
    <>
      <section className="hero">
        <div>
          <h1>Your health, <span className="accent">one click</span> away.</h1>
          <p className="lead">
            MediCare Connect helps you find the right doctor, check availability and book appointments — without the
            waiting room queue.
          </p>
          <form className="search-bar" onSubmit={submit}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search doctors or specialties, e.g. Cardiologist"
              aria-label="Search doctors"
            />
            <button className="btn btn-primary">Search</button>
          </form>
          <div className="chips">
            {shownSpecialties.map((s) => (
              <Link key={s} to={`/doctors?specialization=${encodeURIComponent(s)}`} className="chip">
                {s}
              </Link>
            ))}
            {hiddenCount > 0 && (
              <button type="button" className="chip chip-more" onClick={() => setShowAllSpecialties(true)}>
                +{hiddenCount} more
              </button>
            )}
            {showAllSpecialties && specializations.length > POPULAR.length && (
              <button type="button" className="chip chip-more" onClick={() => setShowAllSpecialties(false)}>
                Show less
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="features">
        {FEATURES.map((f) => (
          <div key={f.title} className="card feature">
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p className="muted">{f.text}</p>
          </div>
        ))}
      </section>

      {featured.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Top doctors</h2>
            <Link to="/doctors">View all →</Link>
          </div>
          <div className="grid">
            {featured.map((d) => (
              <DoctorCard key={d._id} doctor={d} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
