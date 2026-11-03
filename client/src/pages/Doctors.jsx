import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doctorApi, errorMessage } from '../api/client.js';
import DoctorCard from '../components/DoctorCard.jsx';
import Spinner from '../components/Spinner.jsx';
import Alert from '../components/Alert.jsx';
import CityInput from '../components/CityInput.jsx';
import { ALL_CITIES, CITIES_BY_STATE } from '../data/indianCities.js';
import { INDIAN_STATES } from '../india.js';

const plural = (n) => `${n} doctor${n > 1 ? 's' : ''}`;

/** City suggestions: cities with doctors first (with counts), then every other known city. */
function cityOptions(locations, state) {
  const counts = new Map(); // "city|state" -> count
  for (const l of locations) for (const c of l.cities) counts.set(`${c.city.toLowerCase()}|${l.state}`, c.count);

  const base = state
    ? (CITIES_BY_STATE[state] || []).map((city) => ({ city, state }))
    : ALL_CITIES;
  const seen = new Set(base.map((o) => `${o.city.toLowerCase()}|${o.state}`));
  // Cities doctors typed that aren't in the built-in list.
  const extra = locations
    .filter((l) => !state || l.state === state)
    .flatMap((l) => l.cities.map((c) => ({ city: c.city, state: l.state })))
    .filter((o) => !seen.has(`${o.city.toLowerCase()}|${o.state}`));

  return [...base, ...extra]
    .map((o) => {
      const n = counts.get(`${o.city.toLowerCase()}|${o.state}`) || 0;
      const hint = [n && plural(n), !state && o.state].filter(Boolean).join(' · ');
      return { value: o.city, hint, n };
    })
    .sort((a, b) => (b.n > 0) - (a.n > 0) || a.value.localeCompare(b.value));
}

const PAGE_SIZE = 24;
const FILTER_KEYS = ['search', 'specialization', 'state', 'city'];

export default function Doctors() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const specialization = params.get('specialization') || '';
  const state = params.get('state') || '';
  const city = params.get('city') || '';
  const sort = params.get('sort') || '';

  const [query, setQuery] = useState(search);
  const [cityQuery, setCityQuery] = useState(city);
  const [specializations, setSpecializations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    doctorApi.specializations().then(setSpecializations).catch(() => {});
    doctorApi.locations().then(setLocations).catch(() => {});
  }, []);

  const filters = { search, specialization, state, city, sort };
  const apiParams = (p) => ({
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    page: p,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    let stale = false; // ignore responses that arrive after a newer search started
    setLoading(true);
    setError('');
    doctorApi
      .list(apiParams(1))
      .then((d) => {
        if (stale) return;
        setDoctors(d.doctors);
        setTotal(d.total);
        setPage(1);
        setPages(d.pages);
      })
      .catch((err) => !stale && setError(errorMessage(err)))
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, specialization, state, city, sort]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const d = await doctorApi.list(apiParams(page + 1));
      setDoctors((list) => [...list, ...d.doctors]);
      setPage(d.page);
      setPages(d.pages);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const update = (changes, { replace = false } = {}) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace });
  };

  // Keep the box in sync when the URL changes elsewhere (e.g. a specialty chip on the home page).
  useEffect(() => {
    setQuery(search);
  }, [search]);

  // Live search: apply typing after a short pause; clearing the box restores the full list at once.
  useEffect(() => {
    const q = query.trim();
    if (q === search) return undefined;
    const timer = setTimeout(() => update({ search: q }, { replace: true }), q ? 400 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Same live behaviour for the city box: typed text applies after a pause, picks/clears apply at once.
  useEffect(() => {
    setCityQuery(city);
  }, [city]);
  useEffect(() => {
    const c = cityQuery.trim();
    if (c === city) return undefined;
    const timer = setTimeout(() => update({ city: c }, { replace: true }), c ? 400 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityQuery]);

  const hasFilters = FILTER_KEYS.some((k) => params.get(k));
  const showAll = () => {
    setQuery('');
    setCityQuery('');
    update(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])));
  };

  const cities = useMemo(() => cityOptions(locations, state), [locations, state]);
  const where = [city, state].filter(Boolean).join(', ');

  return (
    <section>
      <div className="section-head">
        <div>
          <h1>Find a doctor</h1>
          <p className="muted">
            Verified doctors across {locations.length || 'all'} states &amp; union territories of India
          </p>
        </div>
      </div>

      <form className="filters filters-india" onSubmit={(e) => e.preventDefault()}>
        <div className="search-input">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder="Search by name, specialty or city"
            aria-label="Search doctors"
          />
          {query && (
            <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search" title="Clear search">
              ×
            </button>
          )}
        </div>
        <select
          value={state}
          onChange={(e) => {
            setCityQuery('');
            update({ state: e.target.value, city: '' });
          }}
          aria-label="State"
        >
          <option value="">All states</option>
          {INDIAN_STATES.map((s) => {
            const n = locations.find((l) => l.state === s)?.count;
            return (
              <option key={s} value={s}>
                {s}{n ? ` (${n})` : ''}
              </option>
            );
          })}
        </select>
        <CityInput
          value={cityQuery}
          onChange={setCityQuery}
          options={cities}
          placeholder={state ? `All cities in ${state}` : 'All cities — type or choose'}
          ariaLabel="City"
        />
        <select value={specialization} onChange={(e) => update({ specialization: e.target.value })} aria-label="Specialty">
          <option value="">All specialties</option>
          {specializations.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort by">
          <option value="">Newest</option>
          <option value="experience">Most experienced</option>
          <option value="fees">Fee: low to high</option>
          <option value="-fees">Fee: high to low</option>
        </select>
      </form>

      <Alert>{error}</Alert>
      {loading && doctors.length === 0 ? (
        <Spinner />
      ) : doctors.length === 0 ? (
        <div className="empty">
          <p>
            No doctors match {search ? <>&ldquo;<strong>{search}</strong>&rdquo;</> : 'your filters'}
            {where ? ` in ${where}` : ''}
            {specialization ? ` (${specialization})` : ''}.
          </p>
          {hasFilters && (
            <button type="button" className="btn btn-primary" onClick={showAll}>
              Show all doctors
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="muted">
            {total} doctor{total > 1 ? 's' : ''} found{where ? ` in ${where}` : ''}
            {hasFilters && (
              <>
                {' · '}
                <button type="button" className="btn-link" onClick={showAll}>Clear filters</button>
              </>
            )}
          </p>
          <div className={`grid ${loading ? 'is-loading' : ''}`}>
            {doctors.map((d) => (
              <DoctorCard key={d._id} doctor={d} />
            ))}
          </div>
          {page < pages && (
            <div className="center load-more">
              <button type="button" className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load more (${total - doctors.length} more)`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
