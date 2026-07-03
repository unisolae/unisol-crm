'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PARTNER_TYPE } from '@/lib/labels';

export default function PartnersImportClient() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  function onPickFile(e) {
    setFile(e.target.files?.[0] ?? null);
    setPreview(null);
    setDone(null);
    setError(null);
  }

  async function handlePreview() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/partners-import/preview', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Σφάλμα ανάγνωσης.');
      setPreview(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/partners-import/commit', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Σφάλμα εισαγωγής.');
      setDone(data);
      setPreview(null);
      setFile(null);
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const canPreview = file && !busy;
  const canCommit = file && preview && !busy;

  return (
    <div className="page narrow">
      <div className="breadcrumb">
        <Link href="/partners">← Πίσω στους συνεργάτες</Link>
      </div>

      <div className="page-head">
        <h1>Εισαγωγή επαφών από Excel</h1>
        <p>Ανέβασε αρχείο (.xlsx) με συνεργάτες/επαφές. Οι διπλοεγγραφές αγνοούνται (με βάση τον κωδικό ERP ή το όνομα).</p>
      </div>

      <div className="card import-card">
        <div className="field">
          <label>Αρχείο Excel (.xlsx) *</label>
          <input type="file" accept=".xlsx,.xls" onChange={onPickFile} />
        </div>

        <details className="cols-help">
          <summary>Ποιες στήλες αναγνωρίζονται;</summary>
          <p>
            Κεφαλίδες (με ή χωρίς τόνους): <strong>Κωδικός</strong>, <strong>Ονοματεπώνυμο</strong>,{' '}
            <strong>Επωνυμία</strong>, <strong>Τηλέφωνο</strong>, <strong>Κινητό</strong>,{' '}
            <strong>Email</strong>, <strong>Διεύθυνση</strong>, <strong>Προμηθευτής</strong>,{' '}
            <strong>Τύπος</strong>, <strong>Πωλητής</strong>, <strong>Παρατηρήσεις</strong>.
          </p>
          <p>
            Ο <strong>Τύπος</strong> δέχεται: {Object.values(PARTNER_TYPE).join(', ')}. Ο{' '}
            <strong>Πωλητής</strong> αντιστοιχίζεται με το όνομα χρήστη. Χρειάζεται τουλάχιστον
            ονοματεπώνυμο ή επωνυμία σε κάθε γραμμή.
          </p>
        </details>

        {error && <div className="error">{error}</div>}

        {!preview && !done && (
          <button className="btn-primary" onClick={handlePreview} disabled={!canPreview}>
            {busy ? 'Έλεγχος…' : 'Έλεγχος αρχείου'}
          </button>
        )}

        {preview && (
          <div className="preview-box">
            <h3>Προεπισκόπηση</h3>
            <div className="preview-stats">
              <div><strong>{preview.total}</strong><span>γραμμές</span></div>
              <div className="ok"><strong>{preview.newCount}</strong><span>νέες</span></div>
              <div className="muted"><strong>{preview.duplicateCount}</strong><span>ήδη υπάρχουν</span></div>
            </div>

            {preview.sample?.length > 0 && (
              <ul className="preview-sample">
                {preview.sample.map((s, i) => (
                  <li key={i}>
                    {s.name} <span className="muted">· {PARTNER_TYPE[s.type] || s.type}</span>
                    {s.phone && <span className="muted"> · {s.phone}</span>}
                  </li>
                ))}
              </ul>
            )}

            {preview.unmatched?.length > 0 && (
              <p className="preview-note">Στήλες που αγνοούνται: {preview.unmatched.join(', ')}</p>
            )}

            <div className="preview-actions">
              <button className="btn-ghost" onClick={() => setPreview(null)} disabled={busy}>
                Άκυρο
              </button>
              <button className="btn-primary" onClick={handleCommit} disabled={!canCommit}>
                {busy ? 'Εισαγωγή…' : `Εισαγωγή ${preview.newCount} νέων`}
              </button>
            </div>
          </div>
        )}

        {done && (
          <div className="done-box">
            <h3>✓ Ολοκληρώθηκε</h3>
            <p>
              Εισήχθησαν <strong>{done.inserted}</strong> επαφές
              {done.skipped > 0 && ` · ${done.skipped} παραλείφθηκαν (υπήρχαν ήδη)`}.
            </p>
            <Link className="btn-primary" href="/partners">Δες τους συνεργάτες →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
