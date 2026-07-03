// Κοινές βοηθητικές για ημερομηνίες σε μορφή ηη/μμ/εεεε (με προαιρετική ώρα ωω:λλ).
// Χρησιμοποιούνται τόσο σε server actions όσο και στο πεδίο GreekDateTime.

// Είσοδος (ελληνική μορφή ή ISO) → ISO string για αποθήκευση, ή null.
export function toTimestamp(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '') return null;

  // ISO από native input ή από τη βάση: 2026-12-25T14:30(...)
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) return s.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + 'T00:00:00';

  // Ελληνική μορφή: ηη/μμ/εεεε [ωω:λλ]
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const yyyy = m[3];
    const hh = (m[4] ?? '00').padStart(2, '0');
    const mi = m[5] ?? '00';
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00`;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ISO/DB → "ηη/μμ/εεεε" ή "ηη/μμ/εεεε ωω:λλ" (τοπική ώρα), για αρχικοποίηση πεδίου.
export function isoToGreekInput(iso, withTime = true) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  const date = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (!withTime) return date;
  return `${date} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
