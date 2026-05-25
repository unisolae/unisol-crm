'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PREFECTURES } from '@/lib/prefectures';

export default function ImportClient() {
  const router = useRouter();
  const [prefecture, setPrefecture] = useState('');
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
      const res = await fetch('/api/import/preview', { method: 'POST', body: fd });
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
    if (!file || !prefecture) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('prefecture', prefecture);
      const res = await fetch('/api/import/commit', { method: 'POST', body: fd });
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
  const canCommit = file && prefecture && preview && !busy;

  return (
    <div className="page narrow">
      <div className="breadcrumb">
        <Link href="/leads">← Πίσω στα leads</Link>
      </div>

      <div className="page-head">
        <h1>Εισαγωγή από Excel</h1>
        <p>Ανέβασε αρχείο αδειών. Κάθε αρχείο αφορά έναν νομό, που ανατίθεται αυτόματα σε όλες τις εγγραφές.</p>
      </div>

      <div className="card import-card">
        <div className="field">
          <label>1. Νομός αρχείου *</label>
          <select value={prefecture} onChange={(e) => setPrefecture(e.target.value)}>
            <option value="">— Επιλογή νομού —</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <span className="field-hint">Όλες οι εγγραφές του αρχείου θα πάρουν αυτόν τον νομό.</span>
        </div>

        <div className="field">
          <label>2. Αρχείο Excel (.xlsx) *</label>
          <input type="file" accept=".xlsx,.xls" onChange={onPickFile} />
        </div>

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
            {preview.unmatched?.length > 0 && (
              <p className="preview-note">
                Στήλες που αγνοούνται: {preview.unmatched.join(', ')}
              </p>
            )}
            {!prefecture && (
              <p className="preview-note warn">Επίλεξε νομό για να συνεχίσεις.</p>
            )}
            <div className="preview-actions">
              <button className="btn-ghost" onClick={() => { setPreview(null); }} disabled={busy}>
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
              Εισήχθησαν <strong>{done.inserted}</strong> νέες εγγραφές
              {done.skipped > 0 && ` · ${done.skipped} παραλείφθηκαν (υπήρχαν ήδη)`}.
            </p>
            <Link className="btn-primary" href="/leads">Δες τα leads →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
