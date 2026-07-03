import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import DashboardTasks from './DashboardTasks';

function startOfWeek() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Δευτέρα = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const firstName = (me?.full_name || '').split(' ').slice(-1)[0] || '';

  // --- Μετρήσεις leads ---
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
  const { count: unassignedLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .is('salesperson_id', null);

  const { data: pipeline } = await supabase
    .from('leads')
    .select('lead_size_eur')
    .not('lead_size_eur', 'is', null);
  const pipelineSum = (pipeline ?? []).reduce(
    (acc, r) => acc + Number(r.lead_size_eur || 0),
    0
  );

  // --- Οι εκκρεμότητές μου (ανοιχτά μηνύματα όπου είμαι παραλήπτης) ---
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

  // --- "Με μια ματιά" νούμερα ---
  const { count: myActionsWeek } = await supabase
    .from('actions')
    .select('*', { count: 'exact', head: true })
    .eq('salesperson_id', user.id)
    .gte('acted_at', startOfWeek());

  const { count: unreadMsgs } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  // εκπρόθεσμα + σήμερα (από τα δικά μου tasks)
  const now = Date.now();
  const overdueCount = tasks.filter(
    (t) => t.due_at && new Date(t.due_at).getTime() < now
  ).length;
  const todayCount = tasks.filter((t) => {
    if (!t.due_at) return false;
    const mins = (new Date(t.due_at).getTime() - now) / 60000;
    return mins >= 0 && mins < 60 * 24;
  }).length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Καλημέρα';
    if (h < 18) return 'Καλό απόγευμα';
    return 'Καλησπέρα';
  })();

  const summaryBits = [];
  if (overdueCount > 0) summaryBits.push(`${overdueCount} εκπρόθεσμες εκκρεμότητες`);
  if (activeLeads) summaryBits.push(`${activeLeads} ενεργά leads`);
  const summary = summaryBits.length
    ? `Έχεις ${summaryBits.join(' και ')}.`
    : 'Δεν έχεις εκκρεμότητες αυτή τη στιγμή.';

  const pct = totalLeads ? Math.round((activeLeads / totalLeads) * 100) : 0;
  const unkPct = totalLeads ? Math.round((unknownLeads / totalLeads) * 100) : 0;

  const STATS = [
    { label: 'Σύνολο leads', icon: 'ti-target', value: totalLeads ?? 0, barW: 100, barC: '#0b5468' },
    { label: 'Ενεργά', icon: 'ti-flame', value: activeLeads ?? 0, sub: `${pct}% του συνόλου`, subC: '#0f6e56', barW: pct, barC: '#1d9e75' },
    { label: 'Αδιερεύνητα', icon: 'ti-search', value: unknownLeads ?? 0, sub: 'χρειάζονται έλεγχο', subC: '#db0032', barW: unkPct, barC: '#db0032' },
    { label: 'Pipeline', icon: 'ti-coin-euro', value: `${(pipelineSum / 1000).toLocaleString('el-GR', { maximumFractionDigits: 0 })}k€`, sub: 'εκτιμώμενη αξία', subC: '#64757c', barW: 70, barC: '#d6a829' },
  ];

  // Προγραμματισμένες ενέργειές μου που είναι εκπρόθεσμες ή λήγουν σήμερα
  const { data: myPlanned } = await supabase
    .from('actions')
    .select('scheduled_at')
    .eq('salesperson_id', user.id)
    .eq('status', 'planned')
    .not('scheduled_at', 'is', null);
  const plannedDueCount = (myPlanned ?? []).filter((a) => {
    const mins = (new Date(a.scheduled_at).getTime() - Date.now()) / 60000;
    return mins < 60 * 24; // εκπρόθεσμες + επόμενες 24 ώρες
  }).length;

  const GLANCE = [
    { icon: 'ti-checkbox', bg: '#dcefe4', fg: '#0f6e56', n: myActionsWeek ?? 0, text: 'ενέργειες αυτή την εβδομάδα' },
    { icon: 'ti-calendar-clock', bg: '#e6eef1', fg: '#003d4c', n: plannedDueCount, text: 'προγραμματισμένες ενέργειες λήγουν' },
    { icon: 'ti-clock', bg: '#faeeda', fg: '#633806', n: todayCount, text: 'εκκρεμότητες λήγουν σήμερα' },
    { icon: 'ti-inbox', bg: '#d6ecf4', fg: '#0c5a77', n: unreadMsgs ?? 0, text: 'αδιάβαστα μηνύματα' },
    { icon: 'ti-user-plus', bg: '#fbe4ea', fg: '#b00230', n: unassignedLeads ?? 0, text: 'αδιάθετα leads στην ομάδα' },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <h1>
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p>{summary}</p>
      </div>

      <div className="stat-grid">
        {STATS.map((s) => (
          <div key={s.label} className="stat stat-rich">
            <i className={`ti ${s.icon} stat-ic`} aria-hidden="true" />
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
            {s.sub && <div className="stat-sub" style={{ color: s.subC }}>{s.sub}</div>}
            <div className="stat-bar">
              <i style={{ width: `${s.barW}%`, background: s.barC }} />
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="dash-tasks card">
          <div className="dash-tasks-head">
            <h2>Οι εκκρεμότητές μου</h2>
            <Link className="btn-inline" href="/inbox">
              Όλα τα εισερχόμενα →
            </Link>
          </div>
          <DashboardTasks tasks={tasks} />
        </div>

        <div className="dash-glance card">
          <div className="dash-tasks-head">
            <h2>Με μια ματιά</h2>
          </div>
          <div className="glance-list">
            {GLANCE.map((g, i) => (
              <div key={i} className="glance-row">
                <span className="glance-ic" style={{ background: g.bg, color: g.fg }}>
                  <i className={`ti ${g.icon}`} aria-hidden="true" />
                </span>
                <div>
                  <b>{g.n}</b> {g.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
