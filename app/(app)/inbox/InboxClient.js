'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { MESSAGE_TYPE, MESSAGE_STATUS, RECIPIENT_GROUP } from '@/lib/labels';
import { completeMessage, claimMessage, convertToAction } from './actions';

const TYPE_CLS = {
  message: 'tag-message',
  callback: 'tag-callback',
  reminder: 'tag-reminder',
  follow_up: 'tag-followup',
};

const STATUS_CLS = {
  new: 'st-msg-new',
  in_progress: 'st-msg-prog',
  done: 'st-msg-done',
  cancelled: 'st-msg-cancel',
};

// Πόσο "επείγον" είναι ένα due (λεπτά από τώρα· αρνητικό = εκπρόθεσμο)
function urgencyMinutes(due_at) {
  if (!due_at) return Number.POSITIVE_INFINITY;
  return (new Date(due_at).getTime() - Date.now()) / 60000;
}

function fmtDue(due_at) {
  if (!due_at) return '—';
  const d = new Date(due_at);
  return d.toLocaleString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Σε ποιο "κουτί" ανήκει ένα μήνυμα για τον τρέχοντα χρήστη
function boxOf(m, me) {
  if (!me) return 'all';
  if (m.sender_id === me.id) return 'out';
  if (m.recipient_user_id === me.id) return 'in';
  // ομάδα: αν δεν έχει συγκεκριμένο παραλήπτη, είναι group
  if (!m.recipient_user_id && m.recipient_group) return 'group';
  return 'all';
}

export default function InboxClient({ messages, me }) {
  const [box, setBox] = useState('in');
  const [statusFilter, setStatusFilter] = useState('open'); // open = εκτός done/cancelled
  const [sortBy, setSortBy] = useState('urgency');
  const [pending, start] = useTransition();
  const [rows, setRows] = useState(messages);

  function runAction(fn, id) {
    start(async () => {
      const res = await fn(id);
      if (res?.error) {
        alert('Σφάλμα: ' + res.error);
        return;
      }
      // Αισιόδοξη ενημέρωση τοπικά
      setRows((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: fn === claimMessage ? 'in_progress' : 'done' }
            : m
        )
      );
    });
  }

  const counts = {
    in: rows.filter((m) => boxOf(m, me) === 'in').length,
    group: rows.filter((m) => boxOf(m, me) === 'group').length,
    out: rows.filter((m) => boxOf(m, me) === 'out').length,
  };

  let view = rows.filter((m) => boxOf(m, me) === box);

  if (statusFilter === 'open') {
    view = view.filter((m) => m.status !== 'done' && m.status !== 'cancelled');
  } else if (statusFilter !== 'all') {
    view = view.filter((m) => m.status === statusFilter);
  }

  view = [...view].sort((a, b) => {
    if (sortBy === 'recent')
      return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'priority') {
      const rank = { high: 3, medium: 2, low: 1 };
      const d = (rank[b.priority] || 0) - (rank[a.priority] || 0);
      return d !== 0 ? d : urgencyMinutes(a.due_at) - urgencyMinutes(b.due_at);
    }
    if (sortBy === 'lead') {
      const al = a.lead?.project_desc || 'ωωω';
      const bl = b.lead?.project_desc || 'ωωω';
      const c = al.localeCompare(bl, 'el');
      return c !== 0 ? c : urgencyMinutes(a.due_at) - urgencyMinutes(b.due_at);
    }
    return urgencyMinutes(a.due_at) - urgencyMinutes(b.due_at); // urgency
  });

  return (
    <>
      <div className="inbox-toolbar">
        <div className="inbox-tabs">
          <button
            className={box === 'in' ? 'inbox-tab active' : 'inbox-tab'}
            onClick={() => setBox('in')}
          >
            Εισερχόμενα <span className="cnt">{counts.in}</span>
          </button>
          <button
            className={box === 'group' ? 'inbox-tab active' : 'inbox-tab'}
            onClick={() => setBox('group')}
          >
            Ομάδα <span className="cnt">{counts.group}</span>
          </button>
          <button
            className={box === 'out' ? 'inbox-tab active' : 'inbox-tab'}
            onClick={() => setBox('out')}
          >
            Εξερχόμενα <span className="cnt">{counts.out}</span>
          </button>
        </div>
        <div className="inbox-controls">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="open">Ανοιχτά</option>
            <option value="all">Όλα</option>
            <option value="new">Νέα</option>
            <option value="in_progress">Σε εξέλιξη</option>
            <option value="done">Ολοκληρωμένα</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="urgency">Επείγον</option>
            <option value="recent">Πιο πρόσφατα</option>
            <option value="priority">Προτεραιότητα</option>
            <option value="lead">Κατά lead</option>
          </select>
          <Link className="btn-primary" href="/inbox/new">
            + Νέο
          </Link>
        </div>
      </div>

      <div className="inbox-list">
        {view.map((m) => {
          const mins = urgencyMinutes(m.due_at);
          const overdue = mins < 0;
          const today = mins >= 0 && mins < 60 * 24;
          const dueCls = overdue ? 'due-over' : today ? 'due-today' : 'due-future';
          return (
            <div key={m.id} className="inbox-row">
              <span className={`msg-tag ${TYPE_CLS[m.type] || ''}`}>
                {MESSAGE_TYPE[m.type] || m.type}
              </span>

              <div className="inbox-main">
                <div className="inbox-body">{m.body || '—'}</div>
                <div className="inbox-meta">
                  {box === 'out' ? (
                    <span className="chip">
                      προς:{' '}
                      {m.recipient?.name ||
                        RECIPIENT_GROUP[m.recipient_group] ||
                        '—'}
                    </span>
                  ) : (
                    <span className="chip">από: {m.sender?.name || '—'}</span>
                  )}
                  {m.lead && (
                    <Link className="chip chip-link" href={`/leads/${m.lead_id}`}>
                      {m.lead.project_desc || 'lead'}
                    </Link>
                  )}
                  {m.third_party_phone && (
                    <span className="chip">☎ {m.third_party_phone}</span>
                  )}
                  {!m.recipient_user_id && m.recipient_group && (
                    <span className="chip chip-group">
                      {RECIPIENT_GROUP[m.recipient_group]}
                    </span>
                  )}
                </div>
              </div>

              <div className="inbox-side">
                <span className={`due ${dueCls}`}>{fmtDue(m.due_at)}</span>
                <span className={`msg-status ${STATUS_CLS[m.status] || ''}`}>
                  {MESSAGE_STATUS[m.status] || m.status}
                </span>
                {m.status !== 'done' && m.status !== 'cancelled' && (
                  <div className="inbox-actions">
                    {box === 'group' ? (
                      <button
                        className="btn-mini"
                        disabled={pending}
                        onClick={() => runAction(claimMessage, m.id)}
                      >
                        Ανάληψη
                      </button>
                    ) : (
                      <>
                        {m.lead_id && (
                          <button
                            className="btn-mini"
                            disabled={pending}
                            onClick={() => runAction(convertToAction, m.id)}
                          >
                            Σε ενέργεια
                          </button>
                        )}
                        <button
                          className="btn-mini"
                          disabled={pending}
                          onClick={() => runAction(completeMessage, m.id)}
                          aria-label="Ολοκλήρωση"
                          title="Ολοκλήρωση"
                        >
                          ✓
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {view.length === 0 && (
          <div className="empty-row" style={{ padding: '24px', textAlign: 'center' }}>
            Καμία εγγραφή σε αυτή την προβολή.
          </div>
        )}
      </div>
    </>
  );
}
