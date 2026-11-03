import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi, errorMessage } from '../api/client.js';
import Alert from '../components/Alert.jsx';

const RESEND_COOLDOWN_SECONDS = 30;

// Inline SVG icons render identically on every OS, unlike emoji.
const ICONS = {
  key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm-1 1 9 7 9-7',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
};
const AuthIcon = ({ name, tone = '' }) => (
  <div className={`auth-icon ${tone}`} aria-hidden="true">
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  </div>
);

const formatClock = (totalSeconds) => {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Ticks once a second while `active`, returning the current timestamp.
function useNow(active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null); // { email, sentAt, expiresAt, ttlMs, devResetUrl }
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resentCount, setResentCount] = useState(0);

  const now = useNow(Boolean(sent));
  const remainingMs = sent ? sent.expiresAt - now : 0;
  const expired = Boolean(sent) && remainingMs <= 0;
  const cooldown = sent ? RESEND_COOLDOWN_SECONDS - (now - sent.sentAt) / 1000 : 0;
  const canResend = cooldown <= 0 && !submitting;

  const send = async (target) => {
    setSubmitting(true);
    setError('');
    try {
      const data = await authApi.forgotPassword(target);
      const ttlMs = (data.expiresInMinutes || 15) * 60 * 1000;
      const sentAt = Date.now();
      setSent({ email: target, sentAt, expiresAt: sentAt + ttlMs, ttlMs, devResetUrl: data.devResetUrl });
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (await send(email.trim())) setResentCount(0);
  };

  const resend = async () => {
    if (await send(sent.email)) setResentCount((c) => c + 1);
  };

  const reset = () => {
    setSent(null);
    setError('');
    setResentCount(0);
  };

  if (!sent) {
    return (
      <div className="auth-card card">
        <AuthIcon name="key" />
        <h1>Forgot password?</h1>
        <p className="muted">Enter your account email and we&apos;ll send you a link to reset your password.</p>
        <Alert>{error}</Alert>
        <form onSubmit={submit}>
          <label className="field">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
            />
          </label>
          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <p className="small center">
          Remembered it? <Link to="/login">Back to login</Link>
        </p>
      </div>
    );
  }

  const progress = Math.max(0, Math.min(100, (remainingMs / sent.ttlMs) * 100));

  return (
    <div className="auth-card card">
      <AuthIcon name={expired ? 'clock' : 'mail'} tone={expired ? 'warn' : 'ok'} />
      <h1>{expired ? 'Link expired' : 'Check your email'}</h1>
      <p className="muted">
        {expired ? (
          <>The reset link sent to <strong className="email-chip">{sent.email}</strong> is no longer valid. Send a new one to continue.</>
        ) : (
          <>If an account exists for <strong className="email-chip">{sent.email}</strong>, we&apos;ve sent a link to reset your password.</>
        )}
      </p>

      <Alert>{error}</Alert>
      {resentCount > 0 && !expired && !error && (
        <Alert type="success">New link sent{resentCount > 1 ? ` (${resentCount}×)` : ''}. Earlier links no longer work.</Alert>
      )}

      {!expired && (
        <div className="expiry" role="timer" aria-live="off">
          <div className="expiry-row">
            <span>Link expires in</span>
            <strong className={remainingMs < 60_000 ? 'urgent' : ''}>{formatClock(remainingMs / 1000)}</strong>
          </div>
          <div className="expiry-bar">
            <span style={{ width: `${progress}%` }} className={remainingMs < 60_000 ? 'urgent' : ''} />
          </div>
        </div>
      )}

      {!expired && (
        <ol className="steps small">
          <li>Open the email from MediCare Connect</li>
          <li>Click <strong>Reset my password</strong></li>
          <li>Choose a new password — you&apos;ll be logged in automatically</li>
        </ol>
      )}

      {sent.devResetUrl && !expired && (
        <div className="demo-box small">
          <strong>Development mode:</strong> email is not configured, so here is the reset link directly:
          <br />
          <Link to={new URL(sent.devResetUrl).pathname}>Open reset link →</Link>
        </div>
      )}

      <div className="auth-actions">
        <button
          type="button"
          className={`btn btn-block ${expired ? 'btn-primary' : 'btn-outline'}`}
          disabled={!canResend}
          onClick={resend}
        >
          {submitting ? 'Sending…' : cooldown > 0 ? `Resend link in ${formatClock(cooldown)}` : expired ? 'Send a new link' : 'Resend link'}
        </button>
        <button type="button" className="btn btn-link" onClick={reset}>
          Use a different email
        </button>
      </div>

      {!expired && <p className="muted small center">Didn&apos;t get it? Check your spam or promotions folder.</p>}
      <p className="small center">
        Remembered it? <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}
