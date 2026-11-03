import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/client.js';
import Alert from '../components/Alert.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import DoctorRegistrationFields from '../components/DoctorRegistrationFields.jsx';

const INITIAL = {
  role: 'patient',
  name: '',
  email: '',
  phone: '',
  gender: '',
  password: '',
  confirm: '',
  specialization: '',
  qualifications: '',
  experience: '',
  fees: '',
  clinicAddress: '',
  state: '',
  city: '',
  pincode: '',
  medicalCouncil: '',
  registrationNumber: '',
  registrationYear: '',
  hprId: '',
};

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const change = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };
  const isDoctor = form.role === 'doctor';

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setSubmitting(true);
    setError('');
    try {
      const { name, email, phone, gender, password, role } = form;
      await register({
        name,
        email,
        phone,
        gender,
        password,
        role,
        doctorProfile: isDoctor
          ? {
              specialization: form.specialization,
              qualifications: form.qualifications,
              experience: Number(form.experience) || 0,
              fees: Number(form.fees) || 0,
              clinicAddress: form.clinicAddress,
              state: form.state,
              city: form.city.trim(),
              pincode: form.pincode.trim(),
              medicalCouncil: form.medicalCouncil,
              registrationNumber: form.registrationNumber.trim(),
              registrationYear: Number(form.registrationYear) || undefined,
              hprId: form.hprId.trim(),
            }
          : undefined,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card card wide">
      <h1>Create your account</h1>
      <div className="role-toggle">
        {['patient', 'doctor'].map((r) => (
          <button
            key={r}
            type="button"
            className={form.role === r ? 'active' : ''}
            onClick={() => setForm({ ...form, role: r })}
          >
            I&apos;m a {r}
          </button>
        ))}
      </div>
      {!isDoctor && (
        <>
          <GoogleSignInButton text="signup_with" onSuccess={() => navigate('/', { replace: true })} />
          <div className="divider"><span>or sign up with email</span></div>
        </>
      )}
      <Alert>{error}</Alert>
      <form onSubmit={submit} className="form-grid">
        <label className="field">
          Full name
          <input name="name" value={form.name} onChange={change} required />
        </label>
        <label className="field">
          Email
          <input type="email" name="email" value={form.email} onChange={change} required autoComplete="email" />
        </label>
        <label className="field">
          Phone
          <input type="tel" name="phone" value={form.phone} onChange={change} pattern="[0-9+\- ]{7,15}" />
        </label>
        <label className="field">
          Gender
          <select name="gender" value={form.gender} onChange={change}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="field">
          Password
          <PasswordInput name="password" value={form.password} onChange={change} minLength={6} required autoComplete="new-password" />
        </label>
        <label className="field">
          Confirm password
          <PasswordInput name="confirm" value={form.confirm} onChange={change} minLength={6} required autoComplete="new-password" />
        </label>

        {isDoctor && (
          <>
            <label className="field">
              Specialization
              <input name="specialization" value={form.specialization} onChange={change} placeholder="e.g. Cardiologist" required />
            </label>
            <label className="field">
              Qualifications
              <input name="qualifications" value={form.qualifications} onChange={change} placeholder="MBBS, MD" />
            </label>
            <label className="field">
              Experience (years)
              <input type="number" min="0" name="experience" value={form.experience} onChange={change} />
            </label>
            <label className="field">
              Consultation fee (₹)
              <input type="number" min="0" name="fees" value={form.fees} onChange={change} />
            </label>
            <DoctorRegistrationFields form={form} onChange={change} />
          </>
        )}

        <button className="btn btn-primary btn-block span-2" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="small center">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
