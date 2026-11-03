import { useEffect, useState } from 'react';
import { hospitalApi } from '../api/client.js';

/** Lets a doctor choose the hospital they practise at, from hospitals in their city. */
export default function HospitalPicker({ state, city, value, onChange }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state || !city) {
      setHospitals([]);
      return undefined;
    }
    let stale = false;
    setLoading(true);
    hospitalApi
      .list({ state, district: city.trim(), limit: 60 })
      .then((d) => !stale && setHospitals(d.hospitals))
      .catch(() => !stale && setHospitals([]))
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [state, city]);

  const selectedId = value?._id || value || '';
  // Keep the current choice visible even if it is not in this city's list (e.g. the doctor just changed city).
  const options = value?._id && !hospitals.some((h) => h._id === value._id) ? [value, ...hospitals] : hospitals;

  return (
    <label className="field span-2">
      Hospital you practise at
      <select value={selectedId} onChange={(e) => onChange(e.target.value)} disabled={!state || !city || loading}>
        <option value="">{loading ? 'Loading hospitals…' : 'Own clinic / hospital not listed'}</option>
        {options.map((h) => (
          <option key={h._id} value={h._id}>
            {h.name}
            {h.district ? `, ${h.district}` : ''}
            {h.isDemo ? ' (demo)' : ''}
          </option>
        ))}
      </select>
      <span className="muted small">
        {!state || !city
          ? 'Choose your state and city first.'
          : hospitals.length
            ? `Patients will see you on this hospital's page. ${hospitals.length} hospital${hospitals.length > 1 ? 's' : ''} found in ${city}.`
            : `No hospitals found in ${city} yet — leave this as your own clinic.`}
      </span>
    </label>
  );
}
