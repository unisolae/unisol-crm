'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];
const WEEKDAYS = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'];

// Κατηγορία → χρωματική κλάση (κουκκίδα)
function dotClass(ev) {
  if (ev.kind === 'planned') return 'cal-dot-planned'; // μωβ — θα γίνει
  if (ev.kind === 'action') return 'cal-dot-action'; // πράσινο — τι έκανα
  if (ev.type === 'callback') return 'cal-dot-callback'; // πορτοκαλί
  if (ev.type === 'reminder') return 'cal-dot-reminder'; // κίτρινο
  return 'cal-dot-task'; // μπλε — μήνυμα/follow-up
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export default function CalendarClient({ events }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(ymd(today));

  // Ομαδοποίηση events ανά ημέρα (YYYY-MM-DD)
  const byDay = useMemo(() => {
    const map = {};
    for (const ev of events) {
      if (!ev.date) continue;
      const key = ymd(new Date(ev.date));
      (map[key] ||= []).push(ev);
    }
    return map;
  }, [events]);

  // Υπολογισμός των κελιών του μήνα (ξεκινώντας Δευτέρα)
  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    // 0=Κυ..6=Σα → θέλουμε Δε=0
    let startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < startPad; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(new Date(year, month, d));
    }
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const todayKey = ymd(today);
  const selectedEvents = (byDay[selected] || []).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  function shiftMonth(delta) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  function fmtTime(d) {
    return new Date(d).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="cal-wrap">
      <div className="cal-main card">
        <div className="cal-head">
          <button className="btn-ghost" onClick={() => shiftMonth(-1)} aria-label="Προηγούμενος">
            ‹
          </button>
          <div className="cal-title">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </div>
          <button className="btn-ghost" onClick={() => shiftMonth(1)} aria-label="Επόμενος">
            ›
          </button>
          <button
            className="btn-inline cal-today-btn"
            onClick={() => {
              setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
              setSelected(todayKey);
            }}
          >
            Σήμερα
          </button>
        </div>

        <div className="cal-grid cal-weekdays">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-weekday">
              {w}
            </div>
          ))}
        </div>

        <div className="cal-grid">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="cal-cell cal-empty" />;
            const key = ymd(d);
            const evs = byDay[key] || [];
            const isToday = key === todayKey;
            const isSel = key === selected;
            return (
              <button
                key={i}
                className={
                  'cal-cell' + (isToday ? ' cal-today' : '') + (isSel ? ' cal-selected' : '')
                }
                onClick={() => setSelected(key)}
              >
                <span className="cal-daynum">{d.getDate()}</span>
                {evs.length > 0 && (
                  <span className="cal-dots">
                    {evs.slice(0, 4).map((ev) => (
                      <span key={ev.id} className={`cal-dot ${dotClass(ev)}`} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="cal-legend">
          <span><span className="cal-dot cal-dot-task" /> Μήνυμα / follow-up</span>
          <span><span className="cal-dot cal-dot-callback" /> Callback</span>
          <span><span className="cal-dot cal-dot-reminder" /> Υπενθύμιση</span>
          <span><span className="cal-dot cal-dot-action" /> Ενέργεια</span>
          <span><span className="cal-dot cal-dot-planned" /> Προγραμματισμένη</span>
        </div>
      </div>

      <div className="cal-side card">
        <div className="cal-side-head">
          <h2 className="cal-side-title">
            {new Date(selected).toLocaleDateString('el-GR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h2>
          <Link className="btn-inline" href="/inbox/new">
            + Νέα εκκρεμότητα
          </Link>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="dash-empty">Καμία εγγραφή αυτή την ημέρα.</div>
        ) : (
          <ul className="cal-list">
            {selectedEvents.map((ev) => (
              <li key={ev.id} className={'cal-item' + (ev.done ? ' cal-item-done' : '')}>
                <span className={`cal-dot ${dotClass(ev)}`} />
                <Link href={ev.href} className="cal-item-link">
                  <span className="cal-item-time">{fmtTime(ev.date)}</span>
                  <span className="cal-item-title">{ev.title}</span>
                  {ev.lead && <span className="chip">{ev.lead.slice(0, 30)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
