'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import GreekDateTime from '@/app/components/GreekDateTime';

// Χρησιμοποιείται και σε lead και σε συνεργάτη — δέχεται το server action ως prop.
export default function ActionForm({ action }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [kind, setKind] = useState('done'); // 'done' | 'planned'
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
      setKind('done');
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

  const planned = kind === 'planned';

  return (
    <form action={onSubmit} className="action-form">
      <input type="hidden" name="kind" value={kind} />

      <div className="af-toggle">
        <button
          type="button"
          className={!planned ? 'on' : ''}
          onClick={() => setKind('done')}
        >
          Καταγραφή (έγινε)
        </button>
        <button
          type="button"
          className={planned ? 'on' : ''}
          onClick={() => setKind('planned')}
        >
          Προγραμματισμός (θα γίνει)
        </button>
      </div>

      <div className="field">
        <label>{planned ? 'Τι θα γίνει' : 'Τι έγινε'}</label>
        <input
          name="description"
          type="text"
          placeholder={
            planned
              ? 'π.χ. Τηλέφωνο, επίσκεψη, αποστολή προσφοράς…'
              : 'π.χ. Τηλεφωνική επικοινωνία, αποστολή προσφοράς…'
          }
          required
        />
      </div>

      {planned ? (
        <div className="field">
          <label>Πότε — ημ/ώρα</label>
          <GreekDateTime name="scheduled_at" required />
          <span className="field-hint">
            Θα εμφανιστεί ως επερχόμενη στο ημερολόγιο και στο χρονολόγιο.
          </span>
        </div>
      ) : (
        <>
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
              <GreekDateTime name="next_action_at" />
              <span className="field-hint">
                Θα δημιουργηθεί αυτόματα υπενθύμιση στα εισερχόμενά σου.
              </span>
            </div>
          )}
        </>
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
          {pending ? 'Καταχώριση…' : planned ? 'Προγραμματισμός' : 'Καταχώριση ενέργειας'}
        </button>
      </div>
    </form>
  );
}
