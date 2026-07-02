'use client';

import { useState, useMemo, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createPartnerInline,
  linkPartner,
  unlinkPartner,
} from '@/app/(app)/partners/actions';
import { PARTNER_TYPE, partnerName, toOptions } from '@/lib/labels';

const TYPE_OPTIONS = toOptions(PARTNER_TYPE);

export default function LeadPartners({ leadId, linked, all }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [newType, setNewType] = useState('crew');
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const linkedIds = useMemo(() => new Set(linked.map((p) => p.id)), [linked]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter(
      (p) =>
        !linkedIds.has(p.id) &&
        (t === '' ||
          partnerName(p).toLowerCase().includes(t) ||
          (p.company_name || '').toLowerCase().includes(t))
    );
  }, [q, all, linkedIds]);

  const exactExists = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t !== '' && all.some((p) => partnerName(p).toLowerCase() === t);
  }, [q, all]);

  function doLink(partnerId) {
    start(async () => {
      const res = await linkPartner(leadId, partnerId);
      if (res?.error) return alert('Σφάλμα: ' + res.error);
      setQ('');
      setOpen(false);
      router.refresh();
    });
  }

  function doUnlink(partnerId) {
    start(async () => {
      const res = await unlinkPartner(leadId, partnerId);
      if (res?.error) return alert('Σφάλμα: ' + res.error);
      router.refresh();
    });
  }

  function doCreate() {
    const name = q.trim();
    if (!name) return;
    start(async () => {
      const res = await createPartnerInline(name, newType);
      if (res?.error) return alert('Σφάλμα: ' + res.error);
      const link = await linkPartner(leadId, res.partner.id);
      if (link?.error) return alert('Σφάλμα: ' + link.error);
      setQ('');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="lp" ref={ref}>
      <div className="lp-chips">
        {linked.length === 0 && <span className="lp-empty">Κανένας συνεργάτης ακόμη.</span>}
        {linked.map((p) => (
          <span key={p.id} className="lp-chip">
            <a href={`/partners/${p.id}`}>{partnerName(p)}</a>
            <small>{PARTNER_TYPE[p.type] || ''}</small>
            <button type="button" onClick={() => doUnlink(p.id)} disabled={pending} aria-label="Αφαίρεση">
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="lp-add">
        <input
          type="text"
          value={q}
          placeholder="Πρόσθεσε συνεργάτη — γράψε όνομα…"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
        />
        {open && (
          <div className="lp-pop">
            {filtered.slice(0, 8).map((p) => (
              <button
                type="button"
                key={p.id}
                className="lp-opt"
                onClick={() => doLink(p.id)}
                disabled={pending}
              >
                <span>{partnerName(p)}</span>
                <small>{PARTNER_TYPE[p.type] || ''}</small>
              </button>
            ))}

            {q.trim() !== '' && !exactExists && (
              <div className="lp-create">
                <span>Νέος: «{q.trim()}»</span>
                <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-inline" onClick={doCreate} disabled={pending}>
                  + Δημιουργία & σύνδεση
                </button>
              </div>
            )}

            {filtered.length === 0 && q.trim() === '' && (
              <div className="lp-hint">Γράψε για αναζήτηση ή δημιουργία νέου συνεργάτη.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
