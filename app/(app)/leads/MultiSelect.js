'use client';

import { useState, useRef, useEffect, useTransition } from 'react';

export default function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // Τοπική κατάσταση για ΑΜΕΣΟ τσεκάρισμα (η πλοήγηση/URL ενημερώνεται στο παρασκήνιο).
  const [local, setLocal] = useState(selected);
  const ref = useRef(null);

  // Συγχρονισμός με το URL μόλις ολοκληρωθεί η πλοήγηση.
  useEffect(() => {
    setLocal(selected);
  }, [selected]);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function apply(next) {
    setLocal(next); // άμεση ενημέρωση UI
    startTransition(() => onChange(next)); // πλοήγηση ως transition (μη-μπλοκάρουσα)
  }

  function toggle(value) {
    apply(local.includes(value) ? local.filter((v) => v !== value) : [...local, value]);
  }

  const summary = local.length === 0 ? label : `${label}: ${local.length}`;

  return (
    <div className={`ms${pending ? ' ms-pending' : ''}`} ref={ref}>
      <button
        type="button"
        className={`ms-trigger${local.length ? ' has-sel' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        {summary}
        <span className={`ms-caret${pending ? ' ms-spin' : ''}`}>{pending ? '↻' : '▾'}</span>
      </button>
      {open && (
        <>
          <div className="ms-scrim" onClick={() => setOpen(false)} />
          <div className="ms-pop">
            <div className="ms-head">
              <span>{label}</span>
              <button type="button" className="ms-done" onClick={() => setOpen(false)}>
                Έτοιμο
              </button>
            </div>
            {local.length > 0 && (
              <button type="button" className="ms-clear" onClick={() => apply([])}>
                Καθαρισμός
              </button>
            )}
            {options.map((opt) => (
              <label key={opt.value} className="ms-item">
                <input
                  type="checkbox"
                  checked={local.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
