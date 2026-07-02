'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPartner, updatePartner, deletePartner } from './actions';
import { PARTNER_TYPE } from '@/lib/labels';

export default function PartnerForm({ partner, salespeople, mode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const isEdit = mode === 'edit';
  const p = partner || {};

  function onSubmit(formData) {
    start(async () => {
      const res = isEdit
        ? await updatePartner(partner.id, formData)
        : await createPartner(formData);
      if (res?.error) {
        alert('Σφάλμα: ' + res.error);
        return;
      }
      if (!isEdit && res?.id) router.push(`/partners/${res.id}`);
      else router.refresh();
    });
  }

  function onDelete() {
    if (!confirm('Διαγραφή συνεργάτη; Θα αποσυνδεθεί από όλα τα leads.')) return;
    start(async () => {
      const res = await deletePartner(partner.id);
      if (res?.error) {
        alert('Σφάλμα: ' + res.error);
        return;
      }
      router.push('/partners');
    });
  }

  return (
    <form action={onSubmit} className="edit-form">
      <div className="form-grid">
        <div className="field">
          <label>Τύπος συνεργάτη *</label>
          <select name="type" defaultValue={p.type || 'crew'}>
            {Object.entries(PARTNER_TYPE).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Κωδικός ERP</label>
          <input
            name="erp_code"
            type="text"
            inputMode="numeric"
            maxLength={5}
            defaultValue={p.erp_code ?? ''}
            placeholder="5ψήφιος"
          />
          <span className="field-hint">Έρχεται από το ERP — συμπλήρωσέ τον όποτε είναι διαθέσιμος.</span>
        </div>

        <div className="field">
          <label>Ονοματεπώνυμο</label>
          <input name="full_name" type="text" defaultValue={p.full_name ?? ''} placeholder="π.χ. Παπαδόπουλος Γιώργος" />
        </div>

        <div className="field">
          <label>Επωνυμία / εταιρεία</label>
          <input name="company_name" type="text" defaultValue={p.company_name ?? ''} placeholder="π.χ. Δομική ΑΕ" />
        </div>

        <div className="field">
          <label>Τηλέφωνο</label>
          <input name="phone" type="tel" defaultValue={p.phone ?? ''} />
        </div>

        <div className="field">
          <label>Κινητό</label>
          <input name="mobile" type="tel" defaultValue={p.mobile ?? ''} />
        </div>

        <div className="field">
          <label>Email</label>
          <input name="email" type="email" defaultValue={p.email ?? ''} />
        </div>

        <div className="field">
          <label>Υπεύθυνος πωλητής (Unisol)</label>
          <select name="salesperson_id" defaultValue={p.salesperson_id ?? ''}>
            <option value="">— Κανένας —</option>
            {salespeople.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="field full">
          <label>Διεύθυνση</label>
          <input name="address" type="text" defaultValue={p.address ?? ''} />
        </div>

        <div className="field full">
          <label>Κύριος προμηθευτής</label>
          <input name="main_supplier" type="text" defaultValue={p.main_supplier ?? ''} placeholder="Ποιος είναι ο κύριος προμηθευτής του" />
        </div>

        <div className="field full">
          <label>Παρατηρήσεις</label>
          <textarea name="notes" rows={3} defaultValue={p.notes ?? ''} />
        </div>

        <div className="field">
          <label className="check-row">
            <input type="checkbox" name="is_active" defaultChecked={p.is_active !== false} />
            <span>Ενεργός</span>
          </label>
        </div>
      </div>

      <div className="form-actions">
        {isEdit && (
          <button type="button" className="btn-ghost danger" onClick={onDelete} disabled={pending}>
            Διαγραφή
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Αποθήκευση…' : isEdit ? 'Αποθήκευση' : 'Δημιουργία συνεργάτη'}
        </button>
      </div>
    </form>
  );
}
