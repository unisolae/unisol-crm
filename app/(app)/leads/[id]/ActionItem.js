'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import GreekDateTime from '@/app/components/GreekDateTime';

export default function ActionItem({ action, updateAction, deleteAction, completeAction }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [hasNext, setHasNext] = useState(!!action.next_action_at);
  const router = useRouter();

  const planned = action.status === 'planned';

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

  function onComplete() {
    start(async () => {
      const res = await completeAction(action.id);
      if (res?.error) {
        alert('Σφάλμα: ' + res.error);
        return;
      }
      router.refresh();
    });
  }

  // -------- Λειτουργία επεξεργασίας --------
  if (editing) {
    return (
      <li className="timeline-item">
        <span className={'timeline-dot' + (planned ? ' dot-planned' : '')} aria-hidden="true" />
        <form action={onSave} className="action-form" style={{ flex: 1 }}>
          <input type="hidden" name="form_kind" value={planned ? 'planned' : 'done'} />

          <div className="field">
            <label>{planned ? 'Τι θα γίνει' : 'Τι έγινε'}</label>
            <input name="description" type="text" defaultValue={action.description || ''} required />
          </div>

          {planned ? (
            <div className="field">
              <label>Πότε — ημ/ώρα</label>
              <GreekDateTime name="scheduled_at" defaultValue={action.scheduled_at} required />
            </div>
          ) : (
            <>
              <div className="field">
                <label>Πότε έγινε — ημ/ώρα</label>
                <GreekDateTime name="acted_at" defaultValue={action.acted_at} />
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
                  <GreekDateTime name="next_action_at" defaultValue={action.next_action_at} />
                </div>
              )}
            </>
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

  // -------- Προγραμματισμένη (θα γίνει) --------
  if (planned) {
    return (
      <li className="timeline-item">
        <span className="timeline-dot dot-planned" aria-hidden="true" />
        <div className="timeline-body">
          <div className="timeline-top">
            <span className="badge badge-planned">προγραμματισμένη</span>
            <span className="timeline-when">⏳ {fmtDateTime(action.scheduled_at)}</span>
            {action.salesperson?.name && (
              <span className="timeline-who">· {action.salesperson.name}</span>
            )}
            <span className="timeline-tools">
              <button className="btn-mini btn-mini-go" onClick={onComplete} disabled={pending}>
                Ολοκληρώθηκε
              </button>
              <button className="btn-mini" onClick={() => setEditing(true)}>
                Επεξεργασία
              </button>
              <button className="btn-mini" onClick={onDelete} disabled={pending}>
                Διαγραφή
              </button>
            </span>
          </div>
          {action.description && <div className="timeline-desc">{action.description}</div>}
          {action.notes && <div className="timeline-notes">{action.notes}</div>}
        </div>
      </li>
    );
  }

  // -------- Ολοκληρωμένη (έγινε) --------
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
