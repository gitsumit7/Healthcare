import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { errorMessage, hospitalApi } from '../api/client.js';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import { DemoBadge } from '../components/DoctorCard.jsx';

const PAGE_SIZE = 24;

export const telHref = (phone) => `tel:${String(phone).split(/[,/;]/)[0].replace(/[^\d+]/g, '')}`;

export const hospitalMapUrl = (h) => {
  // A demo hospital's name is made up, so its map link points at the city instead.
  const q = h.location ? `${h.location.lat},${h.location.lng}` : [h.isDemo ? '' : h.name, h.district, h.state].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

function HospitalCard({ h }) {
  const where = h.isDemo ? [h.district, h.state] : [h.address, h.district, h.state];
  return (
    <article className="card hospital-card">
      <h3>
        <Link to={`/hospitals/${h._id}`} className="hospital-title">{h.name}</Link> {h.isDemo && <DemoBadge />}
      </h3>
      <div className="badges">
        {h.category && <span className="chip-sm">{h.category}</span>}
        {h.careType && <span className="chip-sm">{h.careType}</span>}
        {h.systemsOfMedicine && <span className="chip-sm">{h.systemsOfMedicine}</span>}
        {h.beds && <span className="chip-sm">{h.beds} beds</span>}
      </div>
      <p className="small">
        📍 {where.filter(Boolean).join(', ')}
        {h.pincode && ` – ${h.pincode}`}
      </p>
      {h.specialties && <p className="muted small clamp-2">Specialties: {h.specialties}</p>}
      <p className="small">
        {h.doctorCount > 0 ? (
          <Link to={`/hospitals/${h._id}`} className="doctor-count-link">
            👨‍⚕️ {h.doctorCount} doctor{h.doctorCount > 1 ? 's' : ''} on MediCare Connect →
          </Link>
        ) : (
          <span className="muted">No doctors from MediCare Connect listed here yet</span>
        )}
      </p>
      <div className="hospital-actions">
        {h.phone && <a className="btn btn-outline btn-sm" href={telHref(h.phone)}>📞 {h.phone.split(/[,/;]/)[0]}</a>}
        {h.emergencyPhone && (
          <a className="btn btn-danger btn-sm" href={telHref(h.emergencyPhone)}>
            🚑 {h.emergencyPhone === '108' ? '108 Ambulance' : 'Emergency'}
          </a>
        )}
        <a className="btn btn-outline btn-sm" href={hospitalMapUrl(h)} target="_blank" rel="noreferrer">Map ↗</a>
      </div>
    </article>
  );
}

export default function Hospitals() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const state = params.get('state') || '';
  const district = params.get('district') || '';

  const [query, setQuery] = useState(search);
  const [locations, setLocations] = useState([]);
  const [data, setData] = useState({ hospitals: [], total: 0, page: 1, pages: 1, configured: true });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    hospitalApi.locations().then(setLocations).catch(() => {});
  }, []);

  const apiParams = (page) => ({ search: search || undefined, state: state || undefined, district: district || undefined, page, limit: PAGE_SIZE });

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError('');
    hospitalApi
      .list(apiParams(1))
      .then((d) => !stale && setData(d))
      .catch((err) => !stale && setError(errorMessage(err)))
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, state, district]);

  const update = (changes, opts) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, opts);
  };

  useEffect(() => setQuery(search), [search]);
  useEffect(() => {
    const q = query.trim();
    if (q === search) return undefined;
    const t = setTimeout(() => update({ search: q }, { replace: true }), q ? 400 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const d = await hospitalApi.list(apiParams(data.page + 1));
      setData((prev) => ({ ...d, hospitals: [...prev.hospitals, ...d.hospitals] }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const districts = locations.find((l) => l.state === state)?.districts || [];
  const noData = !loading && data.total === 0 && !search && !state;

  return (
    <section>
      <h1>Hospitals across India</h1>
      <p className="muted">
        Government and private hospitals from the National Health Portal hospital directory, published on the{' '}
        <a href="https://www.data.gov.in/catalog/hospital-directory-national-health-portal" target="_blank" rel="noreferrer">
          Open Government Data Platform India
        </a>
        . Listed for information — call the hospital to confirm services and timings.
      </p>
      {data.hospitals.some((h) => h.isDemo) && (
        <p className="demo-note small">
          These are <strong>sample hospitals</strong> for demonstration, one in every city — not real facilities. They are
          replaced automatically once the real directory is imported from data.gov.in. For a medical emergency call{' '}
          <a href="tel:108">108</a>.
        </p>
      )}

      <form className="filters" onSubmit={(e) => e.preventDefault()}>
        <div className="search-input">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hospital, area or specialty"
            aria-label="Search hospitals"
          />
          {query && (
            <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>
          )}
        </div>
        <select value={state} onChange={(e) => update({ state: e.target.value, district: '' })} aria-label="State">
          <option value="">All states</option>
          {locations.map((l) => (
            <option key={l.state} value={l.state}>{l.state} ({l.count})</option>
          ))}
        </select>
        <select value={district} onChange={(e) => update({ district: e.target.value })} disabled={!state} aria-label="District">
          <option value="">{state ? 'All districts' : 'Select a state first'}</option>
          {districts.map((d) => (
            <option key={d.district} value={d.district}>{d.district} ({d.count})</option>
          ))}
        </select>
      </form>

      <Alert>{error}</Alert>
      {loading && data.hospitals.length === 0 ? (
        <Spinner />
      ) : noData ? (
        <div className="empty">
          <p>No hospitals have been imported yet.</p>
          <p className="small">
            {data.configured
              ? 'An admin can import them from the Admin page.'
              : 'Add DATA_GOV_IN_API_KEY to server/.env, then restart the server (see README).'}
          </p>
        </div>
      ) : data.hospitals.length === 0 ? (
        <div className="empty">
          <p>No hospitals match your filters.</p>
          <button type="button" className="btn btn-primary" onClick={() => { setQuery(''); update({ search: '', state: '', district: '' }); }}>
            Show all hospitals
          </button>
        </div>
      ) : (
        <>
          <p className="muted">{data.total.toLocaleString('en-IN')} hospitals found</p>
          <div className={`grid ${loading ? 'is-loading' : ''}`}>
            {data.hospitals.map((h) => (
              <HospitalCard key={h._id} h={h} />
            ))}
          </div>
          {data.page < data.pages && (
            <div className="center load-more">
              <button type="button" className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load more (${(data.total - data.hospitals.length).toLocaleString('en-IN')} more)`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
