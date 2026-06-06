'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function ActionForm({ action }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [hasNext, setHasNext] = useState(false);
  const router = useRouter();

  function onSubmit(formData) {
    start(async () => {
      const res = await action(formData);
      if (res?.error) {
        alert('Σφάλμα: ' + res.error);
        return;
      }
      setOpen(false);
      setHasNext(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button className="btn-inline" onClick={() => setOpen(true)}>
        + Νέα ενέργεια
      </button>
    );
  }

  return (
    <form action={onSubmit} className="action-form">
      <div className="field">
        <label>Τι έγινε</label>
        <input
          name="description"
          type="text"
          placeholder="π.χ. Τηλεφωνική επικοινωνία, αποστολή προσφοράς…"
          required
        />
      </div>

      <div className="field">
        <label>Αποτέλεσμα</label>
        <input name="result" type="text" placeholder="π.χ. Ζήτησε προσφορά, ραντεβού…" />
      </div>

      <div className="field">
        <label className="check-row">
          <input type="checkbox" name="is_final" />
          <span>Τελική ενέργεια (κλείνει — δεν υπάρχει επόμενο βήμα)</span>
        </label>
      </div>

      <div className="field">
        <label className="check-row">
          <input
            type="checkbox"
            checked={hasNext}
            onChange={(e) => setHasNext(e.target.checked)}
          />
          <span>Προγραμματισμός επόμενης ενέργειας</span>
        </label>
      </div>

      {hasNext && (
        <div className="field">
          <label>Επόμενη ενέργεια — ημ/ώρα</label>
          <input name="next_action_at" type="datetime-local" />
          <span className="field-hint">
            Θα δημιουργηθεί αυτόματα υπενθύμιση στα εισερχόμενά σου γι' αυτή την ημερομηνία.
          </span>
        </div>
      )}

      <div className="field">
        <label>Σημειώσεις</label>
        <textarea name="notes" rows={2} placeholder="Ελεύθερες σημειώσεις…" />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Άκυρο
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Καταχώριση…' : 'Καταχώριση ενέργειας'}
        </button>
      </div>
    </form>
  );
}
