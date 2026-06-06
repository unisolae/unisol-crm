'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MESSAGE_TYPE } from '@/lib/labels';

const TYPE_CLS = {
  message: 'tag-message',
  callback: 'tag-callback',
  reminder: 'tag-reminder',
  follow_up: 'tag-followup',
};

function fmtDue(due_at) {
  if (!due_at) return 'χωρίς προθεσμία';
  return new Date(due_at).toLocaleString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function bucketOf(due_at) {
  if (!due_at) return 'future';
  const mins = (new Date(due_at).getTime() - Date.now()) / 60000;
  if (mins < 0) return 'overdue';
  if (mins < 60 * 24) return 'today';
  return 'future';
}

const SECTIONS = [
  { key: 'overdue', label: 'Εκπρόθεσμα', cls: 'sec-overdue' },
  { key: 'today', label: 'Σήμερα', cls: 'sec-today' },
  { key: 'future', label: 'Προσεχώς', cls: 'sec-future' },
];

export default function DashboardTasks({ tasks }) {
  const [tab, setTab] = useState('all');

  const groups = {
    overdue: tasks.filter((t) => bucketOf(t.due_at) === 'overdue'),
    today: tasks.filter((t) => bucketOf(t.due_at) === 'today'),
    future: tasks.filter((t) => bucketOf(t.due_at) === 'future'),
  };

  const TABS = [
    { key: 'all', label: `Όλες (${tasks.length})` },
    { key: 'overdue', label: `Εκπρόθεσμα (${groups.overdue.length})` },
    { key: 'today', label: `Σήμερα (${groups.today.length})` },
    { key: 'future', label: `Προσεχώς (${groups.future.length})` },
  ];

  // Ποιες ενότητες να δείξω ανάλογα το tab
  const visibleSections =
    tab === 'all' ? SECTIONS : SECTIONS.filter((s) => s.key === tab);

  if (tasks.length === 0) {
    return <div className="dash-empty">Δεν έχεις ανοιχτές εκκρεμότητες. 👍</div>;
  }

  function renderTask(t) {
    return (
      <Link key={t.id} href="/inbox" className="dash-task">
        <span className={`msg-tag ${TYPE_CLS[t.type] || ''}`}>
          {MESSAGE_TYPE[t.type] || t.type}
        </span>
        <span className="dash-task-body">{t.body || '—'}</span>
        <span className="dash-task-meta">
          {t.lead?.project_desc ? (
            <span className="chip">{t.lead.project_desc.slice(0, 30)}</span>
          ) : null}
          {t.sender?.name && <span className="chip">από {t.sender.name}</span>}
        </span>
        <span className={`dash-task-due bucket-${bucketOf(t.due_at)}`}>
          {fmtDue(t.due_at)}
        </span>
      </Link>
    );
  }

  return (
    <>
      <div className="seg-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'seg-tab on' : 'seg-tab'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visibleSections.every((s) => groups[s.key].length === 0) ? (
        <div className="dash-empty">Καμία εκκρεμότητα σε αυτή την κατηγορία.</div>
      ) : (
        visibleSections.map((sec) =>
          groups[sec.key].length === 0 ? null : (
            <div key={sec.key} className="dash-sec">
              {tab === 'all' && (
                <div className={`dash-sec-label ${sec.cls}`}>
                  {sec.label} <span className="dash-sec-cnt">{groups[sec.key].length}</span>
                </div>
              )}
              {groups[sec.key].map(renderTask)}
            </div>
          )
        )
      )}
    </>
  );
}
