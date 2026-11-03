import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { authApi, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import Spinner from '../components/Spinner.jsx';

export default function ResetPassword() {
  const { token } = useParams();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ checking: true });
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authApi
      .checkResetToken(token)
      .then(({ email }) => setStatus({ email }))
      .catch((err) => setStatus({ invalid: errorMessage(err) }));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setSubmitting(true);
    setError('');
    try {
      await resetPassword(token, form.password);
      navigate('/dashboard', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  if (status.checking) return <Spinner label="Checking reset link…" />;

  if (status.invalid) {
    return (
      <div className="auth-card card">
        <h1>Can&apos;t use this link</h1>
        <Alert>{status.invalid}</Alert>
        <Link to="/forgot-password" className="btn btn-primary btn-block">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="auth-card card">
      <h1>Set a new password</h1>
      <p className="muted">For {status.email}</p>
      <Alert>{error}</Alert>
      <form onSubmit={submit}>
        <label className="field">
          New password
          <PasswordInput name="password" value={form.password} onChange={change} minLength={6} required autoComplete="new-password" />
        </label>
        <label className="field">
          Confirm new password
          <PasswordInput name="confirm" value={form.confirm} onChange={change} minLength={6} required autoComplete="new-password" />
        </label>
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Saving…' : 'Reset password'}
        </button>
      </form>
    </div>
  );
}
