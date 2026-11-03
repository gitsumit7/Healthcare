import { Link } from 'react-router-dom';

const COPY = {
  pending: {
    type: 'pending',
    title: 'Verification pending',
    text: 'Our team is checking your medical registration. Your profile will appear in search and accept bookings once it is verified.',
  },
  verified: {
    type: 'verified',
    title: 'Verified doctor',
    text: 'Your registration is verified — patients can find and book you.',
  },
  rejected: {
    type: 'rejected',
    title: 'Verification unsuccessful',
    text: 'We could not verify your registration. Please correct your registration details in your profile and save to request a fresh review.',
  },
};

/** Shows a doctor where their registration verification stands. */
export default function VerificationBanner({ verification, showProfileLink = false }) {
  const status = verification?.status || 'pending';
  const copy = COPY[status];
  return (
    <div className={`verify-banner verify-${copy.type}`} role="status">
      <strong>{copy.title}</strong>
      <span>
        {copy.text}
        {verification?.note && status !== 'verified' && <> Note from the reviewer: “{verification.note}”</>}
        {showProfileLink && status !== 'verified' && (
          <>
            {' '}
            <Link to="/profile">Review your details →</Link>
          </>
        )}
      </span>
    </div>
  );
}
