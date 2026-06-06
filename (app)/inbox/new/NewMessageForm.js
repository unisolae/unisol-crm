'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MESSAGE_TYPE,
  MESSAGE_PRIORITY,
  RECIPIENT_GROUP,
} from '@/lib/labels';

export default function NewMessageForm({ users, leads, action }) {
  // Επιλογή παραλήπτη: 'user' (συγκεκριμένος) ή 'group' (ομάδα/ρόλος)
  const [mode, setMode] = useState('user');

  return (
    <form action={action} className="edit-form card">
      <div className="form-grid">
        <div className="field">
          <label>Τύπος</label>
          <select name="type" defaultValue="message">
            {Object.entries(MESSAGE_TYPE).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Προτεραιότητα</label>
          <select name="priority" defaultValue="medium">
            {Object.entries(MESSAGE_PRIORITY).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="field full">
          <label>Παραλήπτης</label>
          <div className="seg">
            <button
              type="button"
              className={mode === 'user' ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setMode('user')}
            >
              Συγκεκριμένος χρήστης
            </button>
            <button
              type="button"
              className={mode === 'group' ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setMode('group')}
            >
              Ομάδα / ρόλος
            </button>
          </div>
        </div>

        {mode === 'user' ? (
          <div className="field full">
            <label>Προς χρήστη</label>
            <select name="recipient_user_id" defaultValue="">
              <option value="">— Επίλεξε —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                  {u.is_salesperson ? ' (πωλητής)' : ''}
                </option>
              ))}
            </select>
            <span className="field-hint">
              Ο παραλήπτης θα δει το μήνυμα στα εισερχόμενά του και θα λάβει ειδοποίηση.
            </span>
          </div>
        ) : (
          <div className="field full">
            <label>Προς ομάδα</label>
            <select name="recipient_group" defaultValue="salespeople">
              {Object.entries(RECIPIENT_GROUP).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <span className="field-hint">
              Όταν δεν ξέρεις ποιος χειρίζεται την υπόθεση — μπαίνει στο group inbox.
            </span>
          </div>
        )}

        <div className="field full">
          <label>Μήνυμα</label>
          <textarea
            name="body"
            rows={3}
            placeholder="π.χ. Πήρε ο κ. Παπαδόπουλος για την προσφορά θερμομόνωσης…"
          />
        </div>

        <div className="field">
          <label>Όνομα τρίτου (που τηλεφώνησε)</label>
          <input name="third_party_name" type="text" placeholder="π.χ. Παπαδόπουλος" />
        </div>

        <div className="field">
          <label>Τηλέφωνο</label>
          <input name="third_party_phone" type="text" placeholder="π.χ. 694…" />
        </div>

        <div className="field">
          <label>Σύνδεση με lead (προαιρετικό)</label>
          <select name="lead_id" defaultValue="">
            <option value="">— Κανένα —</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {(l.project_desc || 'lead').slice(0, 50)}
                {l.city ? ` — ${l.city}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Υπενθύμιση (ημ/ώρα)</label>
          <input name="due_at" type="datetime-local" />
        </div>
      </div>

      <div className="form-actions">
        <Link className="btn-ghost" href="/inbox">
          Άκυρο
        </Link>
        <button className="btn-primary" type="submit">
          Αποστολή
        </button>
      </div>
    </form>
  );
}
