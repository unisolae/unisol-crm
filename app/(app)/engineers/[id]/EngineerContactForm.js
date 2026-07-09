'use client';

import { useFormStatus } from 'react-dom';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" type="submit" disabled={pending}>
      {pending ? 'Αποθήκευση…' : 'Αποθήκευση'}
    </button>
  );
}

export default function EngineerContactForm({ engineer, action }) {
  return (
    <form action={action} className="edit-form">
      <div className="form-grid">
        <div className="field">
          <label>Τηλέφωνο</label>
          <input
            name="phone"
            type="tel"
            defaultValue={engineer.phone ?? ''}
            placeholder="π.χ. 210 1234567"
          />
        </div>

        <div className="field">
          <label>Email</label>
          <input
            name="email"
            type="email"
            defaultValue={engineer.email ?? ''}
            placeholder="π.χ. onoma@example.gr"
          />
        </div>

        <div className="field full">
          <label>Διεύθυνση</label>
          <input
            name="address"
            type="text"
            defaultValue={engineer.address ?? ''}
            placeholder="Οδός και αριθμός"
          />
        </div>

        <div className="field">
          <label>Πόλη</label>
          <input name="city" type="text" defaultValue={engineer.city ?? ''} />
        </div>

        <div className="field">
          <label>Τ.Κ.</label>
          <input name="postal_code" type="text" defaultValue={engineer.postal_code ?? ''} />
        </div>

        <div className="field full">
          <label>Παρατηρήσεις</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={engineer.notes ?? ''}
            placeholder="Ελεύθερες σημειώσεις για τον μηχανικό…"
          />
        </div>
      </div>

      <div className="form-actions">
        <SaveButton />
      </div>
    </form>
  );
}
