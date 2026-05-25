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

export default function LeadEditForm({ lead, salespeople, action }) {
  return (
    <form action={action} className="edit-form">
      <div className="form-grid">
        <div className="field">
          <label>Κατάσταση CRM</label>
          <select name="crm_status" defaultValue={lead.crm_status}>
            <option value="unknown">Άγνωστη</option>
            <option value="active">Ενεργή</option>
            <option value="closed">Κλειστή</option>
            <option value="negative">Αρνητική</option>
          </select>
        </div>

        <div className="field">
          <label>Πωλητής</label>
          <select name="salesperson_id" defaultValue={lead.salesperson_id ?? ''}>
            <option value="">— Χωρίς ανάθεση —</option>
            {salespeople.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Μέγεθος lead (€)</label>
          <input name="lead_size_eur" type="text" inputMode="decimal" defaultValue={lead.lead_size_eur ?? ''} placeholder="π.χ. 15000" />
        </div>

        <div className="field">
          <label>Τελική αξία πώλησης (€)</label>
          <input name="sale_value_eur" type="text" inputMode="decimal" defaultValue={lead.sale_value_eur ?? ''} placeholder="π.χ. 12500" />
        </div>

        <div className="field full">
          <label>Συνεργάτης (ποιος έφερε τη δουλειά)</label>
          <input name="associate" type="text" defaultValue={lead.associate ?? ''} placeholder="Όνομα συνεργάτη εμπορικού δικτύου" />
        </div>

        <div className="field full">
          <label>Ανάγκες</label>
          <textarea name="needs" rows={3} defaultValue={lead.needs ?? ''} placeholder="Τι χρειάζεται ο πελάτης…" />
        </div>

        <div className="field full">
          <label>Σημειώσεις</label>
          <textarea name="notes" rows={3} defaultValue={lead.notes ?? ''} />
        </div>
      </div>

      <div className="form-actions">
        <SaveButton />
      </div>
    </form>
  );
}
