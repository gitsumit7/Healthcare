import { useEffect, useState } from 'react';
import { doctorApi, errorMessage, userApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import Spinner from '../components/Spinner.jsx';
import DoctorRegistrationFields from '../components/DoctorRegistrationFields.jsx';
import VerificationBanner from '../components/VerificationBanner.jsx';
import HospitalPicker from '../components/HospitalPicker.jsx';
import { DAYS } from '../utils.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function PersonalInfo() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    gender: user.gender || '',
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
    bloodGroup: user.bloodGroup || '',
    address: user.address || '',
    medicalHistory: user.medicalHistory || '',
  });
  const [msg, setMsg] = useState({});
  const [saving, setSaving] = useState(false);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({});
    try {
      const { user: updated } = await userApi.updateMe({ ...form, dateOfBirth: form.dateOfBirth || null });
      setUser(updated);
      setMsg({ success: 'Profile saved' });
    } catch (err) {
      setMsg({ error: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card form-grid" onSubmit={submit}>
      <h2 className="span-2">Personal information</h2>
      <div className="span-2">
        <Alert type="success">{msg.success}</Alert>
        <Alert>{msg.error}</Alert>
      </div>
      <label className="field">Full name<input name="name" value={form.name} onChange={change} required /></label>
      <label className="field">Email<input value={user.email} disabled /></label>
      <label className="field">Phone<input name="phone" value={form.phone} onChange={change} /></label>
      <label className="field">
        Gender
        <select name="gender" value={form.gender} onChange={change}>
          <option value="">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </label>
      {user.role === 'patient' && (
        <>
          <label className="field">Date of birth<input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={change} /></label>
          <label className="field">
            Blood group
            <select name="bloodGroup" value={form.bloodGroup} onChange={change}>
              <option value="">—</option>
              {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <label className="field span-2">Address<input name="address" value={form.address} onChange={change} /></label>
          <label className="field span-2">
            Medical history / allergies
            <textarea rows={3} name="medicalHistory" value={form.medicalHistory} onChange={change} maxLength={2000} />
          </label>
        </>
      )}
      <button className="btn btn-primary span-2" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}

function DoctorSettings() {
  const { setDoctor } = useAuth();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    doctorApi.myProfile().then(setForm).catch((err) => setMsg({ error: errorMessage(err) }));
  }, []);

  if (!form) return msg.error ? <Alert>{msg.error}</Alert> : <Spinner />;

  const change = (e) => {
    const { name, value, type, checked } = e.target;
    const parsed = type === 'checkbox' ? checked : type === 'number' && value !== '' ? Number(value) : value;
    setForm((f) => ({ ...f, [name]: parsed }));
  };
  const setWindow = (i, key, value) =>
    setForm({ ...form, availability: form.availability.map((w, j) => (j === i ? { ...w, [key]: value } : w)) });
  const addWindow = () =>
    setForm({ ...form, availability: [...form.availability, { day: 1, start: '10:00', end: '13:00' }] });
  const removeWindow = (i) => setForm({ ...form, availability: form.availability.filter((_, j) => j !== i) });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({});
    try {
      const { specialization, qualifications, experience, fees, about, clinicAddress, slotDuration, availability, isAvailable } = form;
      const optional = (v) => (v === '' || v == null ? undefined : typeof v === 'string' ? v.trim() : v);
      const wasVerified = form.verification?.status === 'verified';
      const updated = await doctorApi.updateMyProfile({
        specialization, qualifications, experience, fees, about, clinicAddress, slotDuration, availability, isAvailable,
        state: form.state,
        city: form.city?.trim(),
        pincode: optional(form.pincode),
        medicalCouncil: form.medicalCouncil,
        registrationNumber: form.registrationNumber?.trim(),
        registrationYear: optional(form.registrationYear),
        hprId: optional(form.hprId),
        hospital: form.hospital?._id || form.hospital || '',
      });
      setForm(updated);
      setDoctor(updated);
      setMsg({
        success:
          wasVerified && updated.verification?.status === 'pending'
            ? 'Saved. Because your registration details changed, your profile is hidden from patients until it is verified again.'
            : 'Professional profile saved',
      });
    } catch (err) {
      setMsg({ error: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const sorted = form.availability.map((w, i) => ({ ...w, i })).sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));

  return (
    <form className="card form-grid" onSubmit={submit}>
      <h2 className="span-2">Professional profile</h2>
      <div className="span-2">
        <VerificationBanner verification={form.verification} />
        <Alert type="success">{msg.success}</Alert>
        <Alert>{msg.error}</Alert>
      </div>
      <label className="field">Specialization<input name="specialization" value={form.specialization} onChange={change} required /></label>
      <label className="field">Qualifications<input name="qualifications" value={form.qualifications || ''} onChange={change} /></label>
      <label className="field">Experience (years)<input type="number" min="0" name="experience" value={form.experience} onChange={change} /></label>
      <label className="field">Consultation fee (₹)<input type="number" min="0" name="fees" value={form.fees} onChange={change} /></label>
      <DoctorRegistrationFields form={form} onChange={change} />
      <HospitalPicker
        state={form.state}
        city={form.city}
        value={form.hospital}
        onChange={(hospital) => setForm((f) => ({ ...f, hospital }))}
      />
      <h3 className="span-2 form-section">About &amp; schedule</h3>
      <label className="field span-2">About<textarea rows={3} name="about" value={form.about || ''} onChange={change} maxLength={1500} /></label>
      <label className="field">
        Slot duration
        <select name="slotDuration" value={form.slotDuration} onChange={(e) => setForm({ ...form, slotDuration: Number(e.target.value) })}>
          {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
        </select>
      </label>
      <label className="field checkbox">
        <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={change} />
        Accepting new appointments
      </label>

      <div className="span-2">
        <h3>Weekly availability</h3>
        {sorted.length === 0 && <p className="muted small">No working hours set — patients cannot book you.</p>}
        {sorted.map((w) => (
          <div className="avail-row" key={w.i}>
            <select value={w.day} onChange={(e) => setWindow(w.i, 'day', Number(e.target.value))}>
              {DAYS.map((d, idx) => <option key={d} value={idx}>{d}</option>)}
            </select>
            <input type="time" value={w.start} onChange={(e) => setWindow(w.i, 'start', e.target.value)} required />
            <span>to</span>
            <input type="time" value={w.end} onChange={(e) => setWindow(w.i, 'end', e.target.value)} required />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => removeWindow(w.i)}>Remove</button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" onClick={addWindow}>+ Add time window</button>
      </div>

      <button className="btn btn-primary span-2" disabled={saving}>{saving ? 'Saving…' : 'Save professional profile'}</button>
    </form>
  );
}

function ChangePassword() {
  const { replaceToken } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState({});
  const submit = async (e) => {
    e.preventDefault();
    setMsg({});
    try {
      const { token } = await userApi.changePassword(form);
      replaceToken(token);
      setForm({ currentPassword: '', newPassword: '' });
      setMsg({ success: 'Password updated' });
    } catch (err) {
      setMsg({ error: errorMessage(err) });
    }
  };
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <form className="card form-grid" onSubmit={submit}>
      <h2 className="span-2">Change password</h2>
      <div className="span-2">
        <Alert type="success">{msg.success}</Alert>
        <Alert>{msg.error}</Alert>
      </div>
      <label className="field">Current password<PasswordInput name="currentPassword" value={form.currentPassword} onChange={change} required autoComplete="current-password" /></label>
      <label className="field">New password<PasswordInput name="newPassword" value={form.newPassword} onChange={change} minLength={6} required autoComplete="new-password" /></label>
      <button className="btn btn-outline span-2">Update password</button>
    </form>
  );
}

export default function Profile() {
  const { user } = useAuth();
  return (
    <section className="profile">
      <h1>My profile</h1>
      <PersonalInfo />
      {user.role === 'doctor' && <DoctorSettings />}
      <ChangePassword />
    </section>
  );
}
