import { useState } from 'react';
import { errorMessage, geoApi } from '../api/client.js';

const PIN = 'M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z';

const GEO_ERRORS = {
  1: 'Location permission was denied. Allow it in the browser, or type your location.',
  2: 'Your location could not be found. Please type it.',
  3: 'Finding your location took too long. Please try again or type it.',
};

// Text box for a place, with a button on the right that fills it from the device's location.
export default function LocationInput({ value, onChange, ...props }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const locate = () => {
    if (!navigator.geolocation) return setError('This browser cannot share your location. Please type it.');
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const place = await geoApi.reverse(coords.latitude, coords.longitude);
          onChange(place.label);
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setError(GEO_ERRORS[err.code] || 'Could not get your location. Please type it.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5 * 60_000 }
    );
  };

  return (
    <>
      <div className="location-input">
        <input {...props} value={value} onChange={(e) => onChange(e.target.value)} />
        <button
          type="button"
          className={`location-btn ${locating ? 'locating' : ''}`}
          onClick={locate}
          disabled={locating}
          aria-label="Use my current location"
          title="Use my current location"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={PIN} />
          </svg>
        </button>
      </div>
      {locating && <span className="small muted">Finding your location…</span>}
      {error && <span className="small field-error">{error}</span>}
    </>
  );
}
