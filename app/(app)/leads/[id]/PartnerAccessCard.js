'use client';

import { useState, useTransition } from 'react';

// Εμφανίζεται μόνο σε εσωτερικούς χρήστες, σε leads που έχουν ανατεθεί σε
// συνεργαζόμενη εταιρεία. Επιτρέπει απόσυρση/επαναφορά της ορατότητας του
// συνεργάτη (π.χ. όταν το αναλάβει αποκλειστικά κάποιος δικός μας).
export default function PartnerAccessCard({ leadId, orgName, revoked, action }) {
  const [isRevoked, setIsRevoked] = useState(!!revoked);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState(null);

  function toggle() {
    const next = !isRevoked;
    const msg = next
      ? `Απόσυρση της πρόσβασης της «${orgName}» από αυτό το lead; Θα σταματήσει να το βλέπει.`
      : `Επαναφορά της πρόσβασης της «${orgName}» σε αυτό το lead;`;
    if (!window.confirm(msg)) return;
    setErr(null);
    startTransition(async () => {
      const res = await action(leadId, next);
      if (res?.error) {
        setErr(res.error);
        return;
      }
      setIsRevoked(next);
    });
  }

  return (
    <section className={`partner-access ${isRevoked ? 'is-revoked' : 'is-active'}`}>
      <div className="pa-main">
        <span className="pa-badge">
          <i className="ti ti-building-community" aria-hidden="true" /> {orgName}
        </span>
        <span className="pa-state">
          {isRevoked
            ? 'Η πρόσβαση του συνεργάτη είναι ανασταλμένη — εσωτερικός χειρισμός.'
            : 'Ο συνεργάτης βλέπει και επεξεργάζεται αυτό το lead.'}
        </span>
      </div>
      <div className="pa-actions">
        <button
          type="button"
          className={isRevoked ? 'btn-primary' : 'btn-ghost'}
          onClick={toggle}
          disabled={pending}
        >
          <i className={`ti ${isRevoked ? 'ti-eye' : 'ti-eye-off'}`} aria-hidden="true" />
          {pending ? '…' : isRevoked ? 'Επαναφορά πρόσβασης' : 'Απόσυρση πρόσβασης'}
        </button>
      </div>
      {err && <div className="error pa-err">{err}</div>}
    </section>
  );
}
