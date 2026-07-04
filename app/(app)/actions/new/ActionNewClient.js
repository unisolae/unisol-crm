'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ActionForm from '@/app/(app)/leads/[id]/ActionForm';
import { createAction, createPartnerAction } from '../actions';
import { searchPartners } from '@/app/(app)/partners/actions';
import { PARTNER_TYPE, partnerName } from '@/lib/labels';

export default function ActionNewClient({ leads }) {
  const router = useRouter();
  const [kind, setKind] = useState('lead'); // 'lead' | 'partner'
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null); // { id, label, sub }

  // Αποτελέσματα αναζήτησης συνεργατών (server-side)
  const [pResults, setPResults] = useState([]);
  const [pLoading, setPLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (kind !== 'partner') return;
    setPLoading(true);
    const id = ++reqIdRef.current;
    const t = setTimeout(async () => {
      const res = await searchPartners(q.trim());
      if (id !== reqIdRef.current) return;
      setPLoading(false);
      setPResults(res?.error ? [] : res.partners || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, kind]);

  // Leads: φιλτράρισμα από τα προφορτωμένα
  const leadOptions = useMemo(() => {
    const t = q.trim().toLowerCase();
    return leads
      .filter(
        (l) =>
          t === '' ||
          (l.project_desc || '').toLowerCase().includes(t) ||
          (l.city || '').toLowerCase().includes(t)
      )
      .slice(0, 10)
      .map((l) => ({ id: l.id, label: l.project_desc || 'Lead', sub: l.city || '' }));
  }, [q, leads]);

  const partnerOptions = pResults.map((p) => ({
    id: p.id,
    label: partnerName(p),
    sub: (PARTNER_TYPE[p.type] || '') + (p.erp_code ? ` · ${p.erp_code}` : ''),
  }));

  const options = kind === 'lead' ? leadOptions : partnerOptions;

  function pickKind(k) {
    setKind(k);
    setSel(null);
    setQ('');
    setPResults([]);
  }

  const submit = (formData) =>
    kind === 'lead' ? createAction(sel.id, formData) : createPartnerAction(sel.id, formData);

  const goBack = () =>
    router.push(kind === 'lead' ? `/leads/${sel.id}` : `/partners/${sel.id}`);

  return (
    <div className="anew">
      <div className="af-toggle">
        <button type="button" className={kind === 'lead' ? 'on' : ''} onClick={() => pickKind('lead')}>
          Για lead
        </button>
        <button type="button" className={kind === 'partner' ? 'on' : ''} onClick={() => pickKind('partner')}>
          Για συνεργάτη (επαφή)
        </button>
      </div>

      {!sel ? (
        <div className="anew-pick">
          <input
            type="search"
            placeholder={
              kind === 'lead'
                ? 'Αναζήτηση lead — περιγραφή ή πόλη…'
                : 'Αναζήτηση συνεργάτη — όνομα, επωνυμία ή κωδικός…'
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <div className="anew-list">
            {kind === 'partner' && pLoading && <div className="anew-empty">Αναζήτηση…</div>}

            {(kind !== 'partner' || !pLoading) &&
              options.map((o) => (
                <button key={o.id} type="button" className="anew-opt" onClick={() => setSel(o)}>
                  <span className="anew-opt-t">{o.label}</span>
                  {o.sub && <span className="anew-opt-s">{o.sub}</span>}
                </button>
              ))}

            {(kind !== 'partner' || !pLoading) && options.length === 0 && (
              <div className="anew-empty">
                Τίποτα δεν βρέθηκε.{' '}
                {kind === 'partner' && <a href="/partners/new">Δημιούργησε νέο συνεργάτη →</a>}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="anew-sel">
            <span>
              <b>{sel.label}</b>
              {sel.sub && <small> · {sel.sub}</small>}
            </span>
            <button type="button" className="btn-mini" onClick={() => setSel(null)}>
              Αλλαγή
            </button>
          </div>
          <ActionForm action={submit} afterSubmit={goBack} startOpen />
        </>
      )}
    </div>
  );
}
