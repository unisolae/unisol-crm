'use client';

import { useState, useRef, useEffect } from 'react';

export default function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function toggle(value) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const summary =
    selected.length === 0
      ? label
      : `${label}: ${selected.length}`;

  return (
    <div className="ms" ref={ref}>
      <button
        type="button"
        className={`ms-trigger${selected.length ? ' has-sel' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        {summary}
        <span className="ms-caret">▾</span>
      </button>
      {open && (
        <div className="ms-pop">
          {selected.length > 0 && (
            <button type="button" className="ms-clear" onClick={() => onChange([])}>
              Καθαρισμός
            </button>
          )}
          {options.map((opt) => (
            <label key={opt.value} className="ms-item">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
