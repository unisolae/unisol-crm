'use client';

import { useState, useTransition } from 'react';

// Κάρτα πρόσβασης συνεργαζόμενης εταιρείας (π.χ. Baumit) πάνω στην καρτέλα του lead.
// Εμφανίζεται μόνο σε εσωτερικούς χρήστες. Τρεις καταστάσεις:
//   1) Χωρίς ανάθεση        → (μόνο admin) picker/κουμπί «Κοινοποίηση σε συνεργάτη».
//   2) Ανατεθειμένο & ενεργό → ο συνεργάτης το βλέπει· κουμπί «Απόσυρση πρόσβασης».
//   3) Ανατεθειμένο & ανασταλμένο → κουμπί «Επαναφορά πρόσβασης».
// Είναι το ίδιο που κάνει η μαζική εισαγωγή από Excel, αλλά επιλεκτικά, για ένα
// lead που είναι ήδη μέσα στην εφαρμογή.
export default function PartnerAccessCard({
  leadId,
  currentOrgId = '',
  orgName,
  revoked,
  canShare = false,
  partnerOrgs = [],
  shareAction,
  accessAction,
}) {
  const [orgId, setOrgId] = useState(currentOrgId);
  const [isRevoked, setIsRevoked] = useState(!!revoked);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState(null);
  // Επιλογή dropdown όταν υπάρχουν πολλές εταιρείες και το lead δεν έχει ανάθεση.
  const [pick, setPick] = useState(partnerOrgs.length === 1 ? partnerOrgs[0].id : '');

  const assigned = !!orgId;

  // Μη-admin εσωτερικός χρήστης σε lead χωρίς ανάθεση: δεν έχει τι να δει/κάνει.
  if (!assigned && !canShare) return null;

  // ── Κοινοποίηση (αρχική ανάθεση) ──────────────────────────────────────────
  function share(targetOrgId) {
    if (!targetOrgId) {
      setErr('Επιλέξτε συνεργαζόμενη εταιρεία.');
      return;
    }
    const org = partnerOrgs.find((o) => o.id === targetOrgId);
    const label = org?.name || 'τον συνεργάτη';
    if (
      !window.confirm(
        `Κοινοποίηση αυτού του lead στη/στον «${label}»; Θα μπορεί να το βλέπει και να το επεξεργάζεται.`
      )
    )
      return;
    setErr(null);
    startTransition(async () => {
      const res = await shareAction(leadId, targetOrgId);
      if (res?.error) {
        setErr(res.error);
        return;
      }
      setOrgId(targetOrgId);
      setIsRevoked(false);
    });
  }

  // ── Απόσυρση / επαναφορά ορατότητας (soft — κρατά την ανάθεση) ─────────────
  function toggleRevoke() {
    const next = !isRevoked;
    const msg = next
      ? `Απόσυρση της πρόσβασης της «${orgName}» από αυτό το lead; Θα σταματήσει να το βλέπει.`
      : `Επαναφορά της πρόσβασης της «${orgName}» σε αυτό το lead;`;
    if (!window.confirm(msg)) return;
    setErr(null);
    startTransition(async () => {
      const res = await accessAction(leadId, next);
      if (res?.error) {
        setErr(res.error);
        return;
      }
      setIsRevoked(next);
    });
  }

  // ── Αφαίρεση ανάθεσης εντελώς (hard — μόνο admin, ξανα-κοινοποιήσιμο) ──────
  function unassign() {
    if (
      !window.confirm(
        `Αφαίρεση της ανάθεσης «${orgName}» από αυτό το lead; Θα μπορείτε να το ξανα-κοινοποιήσετε αργότερα.`
      )
    )
      return;
    setErr(null);
    startTransition(async () => {
      const res = await shareAction(leadId, '');
      if (res?.error) {
        setErr(res.error);
        return;
      }
      setOrgId('');
      setIsRevoked(false);
      setPick(partnerOrgs.length === 1 ? partnerOrgs[0].id : '');
    });
  }

  // ── UI: ΧΩΡΙΣ ανάθεση (μόνο admin φτάνει εδώ) ─────────────────────────────
  if (!assigned) {
    const single = partnerOrgs.length === 1 ? partnerOrgs[0] : null;
    return (
      <section className="partner-access is-unassigned">
        <div className="pa-main">
          <span className="pa-title">
            <i className="ti ti-share" aria-hidden="true" /> Κοινοποίηση σε συνεργάτη
          </span>
          <span className="pa-state">
            Δώστε σε εξωτερική συνεργαζόμενη εταιρεία πρόσβαση να βλέπει και να χειρίζεται αυτό το lead.
          </span>
        </div>
        <div className="pa-actions">
          {partnerOrgs.length === 0 ? (
            <span className="pa-state">Δεν υπάρχουν ενεργές συνεργαζόμενες εταιρείες.</span>
          ) : single ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => share(single.id)}
              disabled={pending}
            >
              <i className="ti ti-share" aria-hidden="true" />
              {pending ? '…' : `Κοινοποίηση στη/στον ${single.name}`}
            </button>
          ) : (
            <div className="pa-picker">
              <select value={pick} onChange={(e) => setPick(e.target.value)} disabled={pending}>
                <option value="">— Επιλέξτε εταιρεία —</option>
                {partnerOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-primary"
                onClick={() => share(pick)}
                disabled={pending || !pick}
              >
                <i className="ti ti-share" aria-hidden="true" />
                {pending ? '…' : 'Κοινοποίηση'}
              </button>
            </div>
          )}
        </div>
        {err && <div className="error pa-err">{err}</div>}
      </section>
    );
  }

  // ── UI: ΑΝΑΤΕΘΕΙΜΕΝΟ (ενεργό ή ανασταλμένο) ───────────────────────────────
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
          onClick={toggleRevoke}
          disabled={pending}
        >
          <i className={`ti ${isRevoked ? 'ti-eye' : 'ti-eye-off'}`} aria-hidden="true" />
          {pending ? '…' : isRevoked ? 'Επαναφορά πρόσβασης' : 'Απόσυρση πρόσβασης'}
        </button>
        {canShare && (
          <button
            type="button"
            className="btn-ghost danger pa-unassign"
            onClick={unassign}
            disabled={pending}
            title="Αφαίρεση ανάθεσης"
          >
            <i className="ti ti-x" aria-hidden="true" /> Αφαίρεση
          </button>
        )}
      </div>
      {err && <div className="error pa-err">{err}</div>}
    </section>
  );
}
