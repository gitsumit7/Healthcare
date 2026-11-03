import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/client.js';
import Alert from '../components/Alert.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="auth-card card">
      <h1>Welcome back</h1>
      <p className="muted">Log in to manage your appointments.</p>
      <GoogleSignInButton
        text="continue_with"
        onSuccess={() => navigate(location.state?.from || '/', { replace: true })}
      />
      <div className="divider"><span>or log in with email</span></div>
      <Alert>{error}</Alert>
      <form onSubmit={submit}>
        <label className="field">
          Email
          <input type="email" name="email" value={form.email} onChange={change} required autoComplete="email" />
        </label>
        <label className="field">
          Password
          <PasswordInput name="password" value={form.password} onChange={change} required autoComplete="current-password" />
        </label>
        <p className="small forgot-link">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Login'}
        </button>
      </form>
      <p className="small center">
        New here? <Link to="/register">Create an account</Link>
      </p>
      <div className="demo-box small">
        <strong>Demo accounts</strong> (seeded in-memory DB)
        <br />
        Patient: patient@medicare.dev / patient123
        <br />
        Doctor: ananya.sharma@medicare.dev / doctor123
        <br />
        Admin: admin@medicare.dev / admin123
      </div>
    </div>
  );
}
