import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorMessage } from '../api/client.js';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import { DemoBadge, VerifiedBadge } from '../components/DoctorCard.jsx';
import { NMC_REGISTER_URL } from '../india.js';
import { initials } from '../utils.js';

const TABS = ['pending', 'verified', 'rejected'];

function HprResult({ check }) {
  if (!check?.checkedAt) return null;
  return (
    <p className={`small hpr-result ${check.found ? 'ok' : 'warn'}`}>
      ABDM HPR ({new Date(check.checkedAt).toLocaleString()}):{' '}
      {check.found
        ? `found — ${[check.name, check.council, check.registrationNumber && `Reg. ${check.registrationNumber}`].filter(Boolean).join(' · ')}`
        : 'no professional found for this HPR ID'}
    </p>
  );
}

function DoctorReviewCard({ doctor, abdmConfigured, onChange }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [hprNote, setHprNote] = useState('');

  const run = async (label, fn) => {
    setBusy(label);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const verify = () => run('verify', async () => onChange(await adminApi.setVerification(doctor._id, { status: 'verified' })));
  const reject = () => {
    const note = window.prompt('Reason for rejection (shown to the doctor):', doctor.verification?.note || '');
    if (note === null) return;
    run('reject', async () => onChange(await adminApi.setVerification(doctor._id, { status: 'rejected', note })));
  };
  const reopen = () => run('reopen', async () => onChange(await adminApi.setVerification(doctor._id, { status: 'pending' })));
  const checkHpr = () =>
    run('hpr', async () => {
      const { doctor: updated, hpr } = await adminApi.checkHpr(doctor._id);
      setHprNote(
        hpr.found
          ? hpr.registrationMatches === false
            ? '⚠ Registration number in HPR does not match the one the doctor entered.'
            : hpr.registrationMatches
              ? '✔ Registration number matches HPR.'
              : ''
          : ''
      );
      onChange(updated);
    });

  const v = doctor.verification || {};
  return (
    <article className="card review-card">
      <div className="review-head">
        <div className="avatar">{initials(doctor.user?.name)}</div>
        <div className="review-title">
          <h3>
            {doctor.user?.name} {v.status === 'verified' && <VerifiedBadge />} {doctor.isDemo && <DemoBadge />}
          </h3>
          <p className="muted small">
            {doctor.specialization} · {doctor.qualifications || '—'} · {doctor.experience} yrs
          </p>
          <p className="muted small">
            {doctor.user?.email} {doctor.user?.phone && `· ${doctor.user.phone}`} · joined{' '}
            {new Date(doctor.user?.createdAt || doctor.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <dl className="review-grid small">
        <dt>Location</dt>
        <dd>{[doctor.city, doctor.state, doctor.pincode].filter(Boolean).join(', ')}</dd>
        <dt>Council</dt>
        <dd>{doctor.medicalCouncil}</dd>
        <dt>Registration no.</dt>
        <dd>
          <strong>{doctor.registrationNumber}</strong>
          {doctor.registrationYear && ` (${doctor.registrationYear})`}
        </dd>
        <dt>ABDM HPR ID</dt>
        <dd>{doctor.hprId || <span className="muted">not provided</span>}</dd>
        {v.status !== 'pending' && (
          <>
            <dt>Decision</dt>
            <dd>
              {v.status}
              {v.method && ` via ${v.method}`}
              {v.verifiedBy?.name && ` by ${v.verifiedBy.name}`}
              {v.verifiedAt && ` on ${new Date(v.verifiedAt).toLocaleDateString()}`}
              {v.note && ` — “${v.note}”`}
            </dd>
          </>
        )}
      </dl>

      <HprResult check={v.hprCheck} />
      {hprNote && <p className="small">{hprNote}</p>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="review-actions">
        <a className="btn btn-outline btn-sm" href={NMC_REGISTER_URL} target="_blank" rel="noreferrer">
          Search NMC register ↗
        </a>
        {doctor.hprId && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={checkHpr}
            disabled={!!busy || !abdmConfigured}
            title={abdmConfigured ? 'Look this HPR ID up in ABDM' : 'Add ABDM credentials to server/.env to enable'}
          >
            {busy === 'hpr' ? 'Checking…' : 'Check with ABDM HPR'}
          </button>
        )}
        <span className="spacer" />
        {v.status !== 'verified' && (
          <button type="button" className="btn btn-primary btn-sm" onClick={verify} disabled={!!busy}>
            {busy === 'verify' ? 'Verifying…' : '✔ Verify'}
          </button>
        )}
        {v.status !== 'rejected' && (
          <button type="button" className="btn btn-danger btn-sm" onClick={reject} disabled={!!busy}>
            {v.status === 'verified' ? 'Revoke' : 'Reject'}
          </button>
        )}
        {v.status === 'rejected' && (
          <button type="button" className="btn btn-outline btn-sm" onClick={reopen} disabled={!!busy}>
            Move to pending
          </button>
        )}
      </div>
    </article>
  );
}

function HospitalImport({ stats, onDone }) {
  const [state, setState] = useState({});
  const run = async () => {
    setState({ busy: true });
    try {
      const r = await adminApi.importHospitals();
      setState({ success: `Imported ${r.imported} hospitals (${r.fetched} records fetched${r.total ? ` of ${r.total}` : ''}).` });
      onDone();
    } catch (err) {
      setState({ error: errorMessage(err) });
    }
  };
  return (
    <div className="card admin-import">
      <div>
        <h3>Hospitals from data.gov.in</h3>
        <p className="muted small">
          {stats.hospitals} hospitals imported from the National Health Portal hospital directory (Open Government Data
          Platform India).
        </p>
      </div>
      <button type="button" className="btn btn-outline" onClick={run} disabled={state.busy}>
        {state.busy ? 'Importing…' : 'Import / refresh hospitals'}
      </button>
      {state.success && <div className="alert alert-success span-all">{state.success}</div>}
      {state.error && <div className="alert alert-error span-all">{state.error}</div>}
    </div>
  );
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(() => adminApi.stats().then(setStats).catch((err) => setError(errorMessage(err))), []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    const timer = setTimeout(() => {
      adminApi
        .doctors({ status: tab, search: search.trim() || undefined })
        .then((list) => !stale && setDoctors(list))
        .catch((err) => !stale && setError(errorMessage(err)))
        .finally(() => !stale && setLoading(false));
    }, search ? 300 : 0);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [tab, search]);

  // A decision moves the doctor to another tab, so drop it from this list.
  const handleChange = (updated) => {
    setDoctors((list) =>
      updated.verification?.status === tab
        ? list.map((d) => (d._id === updated._id ? { ...d, ...updated } : d))
        : list.filter((d) => d._id !== updated._id)
    );
    loadStats();
  };

  return (
    <section>
      <h1>Admin · Doctor verification</h1>
      <p className="muted">
        Check each doctor&apos;s registration number against the NMC / state council register (and ABDM HPR when
        available) before verifying. Only verified doctors are visible to patients.
      </p>
      <Alert>{error}</Alert>

      {stats && (
        <div className="stats">
          <div className="stat card"><span>Pending review</span><strong>{stats.doctors.pending}</strong></div>
          <div className="stat card"><span>Verified doctors</span><strong>{stats.doctors.verified}</strong></div>
          <div className="stat card"><span>Patients</span><strong>{stats.patients}</strong></div>
          <div className="stat card"><span>Hospitals</span><strong>{stats.hospitals}</strong></div>
        </div>
      )}
      {stats && !stats.abdmConfigured && (
        <p className="muted small">
          ABDM HPR lookup is off — add <code>ABDM_CLIENT_ID</code>, <code>ABDM_CLIENT_SECRET</code> and{' '}
          <code>ABDM_HPR_LOOKUP_URL</code> to <code>server/.env</code> after your ABDM sandbox registration.
        </p>
      )}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
            {stats && ` (${stats.doctors[t]})`}
          </button>
        ))}
      </div>
      <div className="search-input admin-search">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, registration no., city or state"
          aria-label="Search doctors"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : doctors.length === 0 ? (
        <p className="empty">No {tab} doctors{search ? ' match your search' : ''}.</p>
      ) : (
        <div className="review-list">
          {doctors.map((d) => (
            <DoctorReviewCard key={d._id} doctor={d} abdmConfigured={stats?.abdmConfigured} onChange={handleChange} />
          ))}
        </div>
      )}

      {stats && <HospitalImport stats={stats} onDone={loadStats} />}
    </section>
  );
}
