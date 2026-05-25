'use client';

import { useState, useTransition } from 'react';
import { quickUpdateLead } from './actions';

export function InlineStatus({ id, value }) {
  const [val, setVal] = useState(value);
  const [pending, start] = useTransition();

  function onChange(e) {
    const v = e.target.value;
    setVal(v);
    start(() => quickUpdateLead(id, { crm_status: v }));
  }

  return (
    <select
      className={`inline-control inline-status${pending ? ' saving' : ''}`}
      data-st={val}
      value={val}
      onChange={onChange}
      disabled={pending}
    >
      <option value="unknown">Άγνωστη</option>
      <option value="active">Ενεργή</option>
      <option value="closed">Κλειστή</option>
      <option value="negative">Αρνητική</option>
    </select>
  );
}

export function InlineSalesperson({ id, value, salespeople }) {
  const [val, setVal] = useState(value ?? '');
  const [pending, start] = useTransition();

  function onChange(e) {
    const v = e.target.value;
    setVal(v);
    start(() => quickUpdateLead(id, { salesperson_id: v }));
  }

  return (
    <select
      className={`inline-control${pending ? ' saving' : ''}`}
      value={val}
      onChange={onChange}
      disabled={pending}
    >
      <option value="">—</option>
      {salespeople.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

export function InlineSize({ id, value }) {
  const [val, setVal] = useState(value ?? '');
  const [saved, setSaved] = useState(value ?? '');
  const [pending, start] = useTransition();

  function commit() {
    if (String(val) === String(saved)) return; // καμία αλλαγή
    setSaved(val);
    start(() => quickUpdateLead(id, { lead_size_eur: val }));
  }

  return (
    <span className="inline-size-wrap">
      <input
        className={`inline-control inline-size${pending ? ' saving' : ''}`}
        type="text"
        inputMode="decimal"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        placeholder="—"
      />
      {val !== '' && <span className="euro">€</span>}
    </span>
  );
}
