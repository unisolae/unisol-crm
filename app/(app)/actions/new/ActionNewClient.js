'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ActionForm from '@/app/(app)/leads/[id]/ActionForm';
import { createAction, createPartnerAction } from '../actions';
import { PARTNER_TYPE, partnerName } from '@/lib/labels';

export default function ActionNewClient({ leads, partners }) {
  const router = useRouter();
  const [kind, setKind] = useState('lead'); // 'lead' | 'partner'
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null); // { id, label, sub }

  const options = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (kind === 'lead') {
      return leads
        .filter(
          (l) =>
            t === '' ||
            (l.project_desc || '').toLowerCase().includes(t) ||
            (l.city || '').toLowerCase().includes(t)
        )
        .slice(0, 8)
        .map((l) => ({
          id: l.id,
          label: l.project_desc || 'Lead',
          sub: l.city || '',
        }));
    }
    return partners
      .filter((p) => t === '' || partnerName(p).toLowerCase().includes(t))
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        label: partnerName(p),
        sub: PARTNER_TYPE[p.type] || '',
      }));
  }, [kind, q, leads, partners]);

  function pickKind(k) {
    setKind(k);
    setSel(null);
    setQ('');
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
            placeholder={kind === 'lead' ? 'Αναζήτηση lead — περιγραφή ή πόλη…' : 'Αναζήτηση συνεργάτη…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <div className="anew-list">
            {options.map((o) => (
              <button key={o.id} type="button" className="anew-opt" onClick={() => setSel(o)}>
                <span className="anew-opt-t">{o.label}</span>
                {o.sub && <span className="anew-opt-s">{o.sub}</span>}
              </button>
            ))}
            {options.length === 0 && (
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
