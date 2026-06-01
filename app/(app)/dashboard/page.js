import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MESSAGE_TYPE } from '@/lib/labels';

const STATUS_LABELS = {
  unknown: 'Άγνωστη',
  active: 'Ενεργή',
  closed: 'Κλειστή',
  negative: 'Αρνητική',
};

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

// Ομαδοποίηση εκκρεμοτήτων κατά επείγον
function bucketOf(due_at) {
  if (!due_at) return 'future';
  const mins = (new Date(due_at).getTime() - Date.now()) / 60000;
  if (mins < 0) return 'overdue';
  if (mins < 60 * 24) return 'today';
  return 'future';
}

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  const { count: activeLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('crm_status', 'active');

  const { count: unknownLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('crm_status', 'unknown');

  const { data: pipeline } = await supabase
    .from('leads')
    .select('lead_size_eur')
    .not('lead_size_eur', 'is', null);

  const pipelineSum = (pipeline ?? []).reduce(
    (acc, r) => acc + Number(r.lead_size_eur || 0),
    0
  );

  // --- Οι εκκρεμότητές μου: ανοιχτά μηνύματα όπου είμαι ο παραλήπτης ---
  const { data: myTasks } = await supabase
    .from('messages')
    .select(
      'id, type, status, priority, body, due_at, ' +
        'sender:profiles!messages_sender_id_fkey(name:full_name), ' +
        'lead:leads(project_desc, city)'
    )
    .eq('recipient_user_id', user.id)
    .in('status', ['new', 'in_progress'])
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(50);

  const tasks = myTasks ?? [];
  const groups = {
    overdue: tasks.filter((t) => bucketOf(t.due_at) === 'overdue'),
    today: tasks.filter((t) => bucketOf(t.due_at) === 'today'),
    future: tasks.filter((t) => bucketOf(t.due_at) === 'future'),
  };

  const SECTIONS = [
    { key: 'overdue', label: 'Εκπρόθεσμα', cls: 'sec-overdue' },
    { key: 'today', label: 'Σήμερα', cls: 'sec-today' },
    { key: 'future', label: 'Προσεχώς', cls: 'sec-future' },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Επισκόπηση</h1>
        <p>Καλωσήρθες στο σύστημα διαχείρισης ευκαιριών πωλήσεων.</p>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="label">Σύνολο leads</div>
          <div className="value">{totalLeads ?? 0}</div>
        </div>
        <div className="stat">
          <div className="label">Ενεργά</div>
          <div className="value">{activeLeads ?? 0}</div>
          <div className="hint">{STATUS_LABELS.active}</div>
        </div>
        <div className="stat">
          <div className="label">Αδιερεύνητα</div>
          <div className="value">{unknownLeads ?? 0}</div>
          <div className="hint">Χρειάζονται έλεγχο</div>
        </div>
        <div className="stat">
          <div className="label">Αξία pipeline</div>
          <div className="value">{pipelineSum.toLocaleString('el-GR')}€</div>
        </div>
      </div>

      <div className="dash-tasks card">
        <div className="dash-tasks-head">
          <h2>Οι εκκρεμότητές μου</h2>
          <Link className="btn-inline" href="/inbox">
            Όλα τα εισερχόμενα →
          </Link>
        </div>

        {tasks.length === 0 ? (
          <div className="dash-empty">Δεν έχεις ανοιχτές εκκρεμότητες. 👍</div>
        ) : (
          SECTIONS.map((sec) =>
            groups[sec.key].length === 0 ? null : (
              <div key={sec.key} className="dash-sec">
                <div className={`dash-sec-label ${sec.cls}`}>
                  {sec.label} <span className="dash-sec-cnt">{groups[sec.key].length}</span>
                </div>
                {groups[sec.key].map((t) => (
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
                ))}
              </div>
            )
          )
        )}
      </div>

      <div className="cta-row">
        <Link className="btn-inline" href="/leads">
          Δες όλα τα leads →
        </Link>
      </div>
    </div>
  );
}
