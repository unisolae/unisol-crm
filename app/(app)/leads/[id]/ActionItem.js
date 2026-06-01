'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

function toLocalInput(d) {
  if (!d) return '';
  const dt = new Date(d);
  // μετατροπή σε μορφή datetime-local (YYYY-MM-DDTHH:mm) σε τοπική ώρα
  const off = dt.getTimezoneOffset();
  const local = new Date(dt.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function ActionItem({ action, updateAction, deleteAction }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [hasNext, setHasNext] = useState(!!action.next_action_at);
  const router = useRouter();

  const fmtDateTime = (d) =>
    d
      ? new Date(d).toLocaleString('el-GR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

  function onSave(formData) {
    start(async () => {
      const res = await updateAction(action.id, formData);
      if (res?.error) {
        alert('Σφάλμα: ' + res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirm('Διαγραφή αυτής της ενέργειας;')) return;
    start(async () => {
      const res = await deleteAction(action.id);
      if (res?.error) {
        alert('Σφάλμα: ' + res.error);
        return;
      }
      router.refresh();
    });
  }

  if (editing) {
    return (
      <li className="timeline-item">
        <span className="timeline-dot" aria-hidden="true" />
        <form action={onSave} className="action-form" style={{ flex: 1 }}>
          <div className="field">
            <label>Τι έγινε</label>
            <input name="description" type="text" defaultValue={action.description || ''} required />
          </div>
          <div className="field">
            <label>Αποτέλεσμα</label>
            <input name="result" type="text" defaultValue={action.result || ''} />
          </div>
          <div className="field">
            <label className="check-row">
              <input type="checkbox" name="is_final" defaultChecked={action.is_final} />
              <span>Τελική ενέργεια</span>
            </label>
          </div>
          <div className="field">
            <label className="check-row">
              <input
                type="checkbox"
                checked={hasNext}
                onChange={(e) => setHasNext(e.target.checked)}
              />
              <span>Επόμενη ενέργεια</span>
            </label>
          </div>
          {hasNext && (
            <div className="field">
              <label>Επόμενη ενέργεια — ημ/ώρα</label>
              <input
                name="next_action_at"
                type="datetime-local"
                defaultValue={toLocalInput(action.next_action_at)}
              />
            </div>
          )}
          <div className="field">
            <label>Σημειώσεις</label>
            <textarea name="notes" rows={2} defaultValue={action.notes || ''} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
              Άκυρο
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Αποθήκευση…' : 'Αποθήκευση'}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="timeline-item">
      <span className="timeline-dot" aria-hidden="true" />
      <div className="timeline-body">
        <div className="timeline-top">
          <span className="timeline-when">{fmtDateTime(action.acted_at)}</span>
          {action.salesperson?.name && (
            <span className="timeline-who">· {action.salesperson.name}</span>
          )}
          {action.is_final && <span className="badge st-closed">τελική</span>}
          <span className="timeline-tools">
            <button className="btn-mini" onClick={() => setEditing(true)}>
              Επεξεργασία
            </button>
            <button className="btn-mini" onClick={onDelete} disabled={pending}>
              Διαγραφή
            </button>
          </span>
        </div>
        {action.description && <div className="timeline-desc">{action.description}</div>}
        {action.result && <div className="timeline-result">→ {action.result}</div>}
        {action.notes && <div className="timeline-notes">{action.notes}</div>}
        {action.next_action_at && (
          <div className="timeline-next">⏰ επόμενη ενέργεια: {fmtDateTime(action.next_action_at)}</div>
        )}
      </div>
    </li>
  );
}
