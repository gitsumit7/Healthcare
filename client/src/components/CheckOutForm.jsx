import { useState } from 'react';
import { appointmentApi, errorMessage } from '../api/client.js';
import Alert from './Alert.jsx';

// The day after a YYYY-MM-DD date, as YYYY-MM-DD.
const dayAfter = (date) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Doctor's check-out: records notes, an optional follow-up and the fee if it was paid at the clinic.
// The visit is then marked completed by an admin.
export default function CheckOutForm({ appointment, onDone, onCancel }) {
  const alreadyPaid = appointment.payment?.status === 'paid';
  const [form, setForm] = useState({
    doctorNotes: appointment.doctorNotes || '',
    followUpDate: appointment.followUpDate || '',
    feeCollected: !alreadyPaid,
    paymentMethod: 'cash',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) =>
    setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      onDone(await appointmentApi.checkOut(appointment._id, form));
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form className="checkout-form" onSubmit={submit}>
      <h4>Check-out</h4>
      <Alert>{error}</Alert>
      <label className="field">
        Notes / prescription
        <textarea rows={3} maxLength={2000} value={form.doctorNotes} onChange={set('doctorNotes')} />
      </label>
      <label className="field">
        Follow-up date (optional)
        <input type="date" min={dayAfter(appointment.date)} value={form.followUpDate} onChange={set('followUpDate')} />
      </label>
      {alreadyPaid ? (
        <p className="small muted">Fee of ₹{appointment.fees} already paid online.</p>
      ) : (
        <div className="checkout-fee">
          <label className="field checkbox">
            <input type="checkbox" checked={form.feeCollected} onChange={set('feeCollected')} />
            Fee of ₹{appointment.fees} collected
          </label>
          {form.feeCollected && (
            <select value={form.paymentMethod} onChange={set('paymentMethod')} aria-label="Fee paid by">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          )}
        </div>
      )}
      <div className="checkout-actions">
        <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save check-out'}
        </button>
      </div>
    </form>
  );
}
