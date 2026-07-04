'use client';

import { useState, useMemo, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createPartnerInline,
  linkPartner,
  unlinkPartner,
  searchPartners,
} from '@/app/(app)/partners/actions';
import { PARTNER_TYPE, partnerName, toOptions } from '@/lib/labels';

const TYPE_OPTIONS = toOptions(PARTNER_TYPE);

export default function LeadPartners({ leadId, linked }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [newType, setNewType] = useState('crew');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Αναζήτηση στον server (debounced), με προστασία από stale απαντήσεις
  useEffect(() => {
    const term = q.trim();
    if (term === '') {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++reqIdRef.current;
    const t = setTimeout(async () => {
      const res = await searchPartners(term);
      if (id !== reqIdRef.current) return; // ήρθε νεότερο ερώτημα
      setLoading(false);
      setResults(res?.error ? [] : res.partners || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const linkedIds = useMemo(() => new Set(linked.map((p) => p.id)), [linked]);
  const shown = results.filter((p) => !linkedIds.has(p.id)).slice(0, 12);
  const exactExists =
    q.trim() !== '' &&
    results.some((p) => partnerName(p).toLowerCase() === q.trim().toLowerCase());

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
          placeholder="Πρόσθεσε συνεργάτη — όνομα, επωνυμία ή κωδικός…"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
        />
        {open && (
          <div className="lp-pop">
            {loading && <div className="lp-hint">Αναζήτηση…</div>}

            {!loading &&
              shown.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="lp-opt"
                  onClick={() => doLink(p.id)}
                  disabled={pending}
                >
                  <span>{partnerName(p)}</span>
                  <small>
                    {PARTNER_TYPE[p.type] || ''}
                    {p.erp_code ? ` · ${p.erp_code}` : ''}
                  </small>
                </button>
              ))}

            {!loading && q.trim() !== '' && shown.length === 0 && (
              <div className="lp-hint">Δεν βρέθηκε συνεργάτης «{q.trim()}».</div>
            )}

            {!loading && q.trim() !== '' && !exactExists && (
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

            {q.trim() === '' && (
              <div className="lp-hint">Γράψε όνομα, επωνυμία ή κωδικό ERP για αναζήτηση.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
