import { INDIAN_STATES, MEDICAL_COUNCILS } from '../india.js';
import { CITIES_BY_STATE } from '../data/indianCities.js';
import CityInput from './CityInput.jsx';

/** Practice location + medical registration inputs, shared by doctor sign-up and the doctor profile. */
export default function DoctorRegistrationFields({ form, onChange }) {
  return (
    <>
      <h3 className="span-2 form-section">Practice location</h3>
      <label className="field">
        State / UT
        <select
          name="state"
          value={form.state || ''}
          onChange={(e) => {
            onChange(e);
            // A city from the previous state no longer fits.
            const keep = (CITIES_BY_STATE[e.target.value] || []).some((c) => c.toLowerCase() === String(form.city || '').toLowerCase());
            if (!keep) onChange({ target: { name: 'city', value: '' } });
          }}
          required
        >
          <option value="">Select state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="field">
        City
        <CityInput
          name="city"
          value={form.city || ''}
          onChange={(value) => onChange({ target: { name: 'city', value } })}
          options={(CITIES_BY_STATE[form.state] || []).map((value) => ({ value }))}
          placeholder={form.state ? 'Type or choose your city' : 'Choose a state first'}
          disabled={!form.state}
          required
        />
      </label>
      <label className="field">
        Pincode
        <input name="pincode" value={form.pincode || ''} onChange={onChange} inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} placeholder="6 digits" />
      </label>
      <label className="field">
        Clinic address
        <input name="clinicAddress" value={form.clinicAddress || ''} onChange={onChange} />
      </label>

      <h3 className="span-2 form-section">Medical registration</h3>
      <label className="field">
        Medical council
        <select name="medicalCouncil" value={form.medicalCouncil || ''} onChange={onChange} required>
          <option value="">Select council</option>
          {MEDICAL_COUNCILS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Registration number
        <input name="registrationNumber" value={form.registrationNumber || ''} onChange={onChange} required maxLength={40} placeholder="As on your council certificate" />
      </label>
      <label className="field">
        Year of registration
        <input type="number" name="registrationYear" value={form.registrationYear || ''} onChange={onChange} min="1950" max={new Date().getFullYear()} />
      </label>
      <label className="field">
        ABDM HPR ID <span className="muted small">(optional)</span>
        <input name="hprId" value={form.hprId || ''} onChange={onChange} placeholder="14 digits or name@hpr.abdm" maxLength={60} />
      </label>
      <p className="span-2 muted small">
        Your profile is shown to patients only after our team verifies your registration with the National Medical
        Commission / your state council (and ABDM&apos;s Healthcare Professionals Registry if you add an HPR ID).
      </p>
    </>
  );
}
