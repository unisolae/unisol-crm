import * as XLSX from 'xlsx';

// Αντιστοίχιση: κεφαλίδα Excel  →  πεδίο βάσης.
// Καλύπτει τη γραμμογράφηση του αρχείου αδειών (ΥΔΟΜ). Οι κεφαλίδες
// συγκρίνονται "χαλαρά" (αγνοώντας κενά/τόνους) ώστε μικρές διαφορές να μην χαλάνε το import.
const COLUMN_MAP = {
  'a/a αιτησης': 'external_ref',
  'κατασταση αιτησης': 'permit_status',
  'υπηρεσια': 'service_office',
  'διαχειριστης αιτησης': 'engineer',
  'περιγραφη εργου/εγκαταστασης': 'project_desc',
  'οδος': 'address_street',
  'αρ. απο': 'address_number',
  'πολη/οικισμος': 'city',
  'τκ': 'postal_code',
  'δημοτικη ενοτητα / περιοχη': 'municipality',
  'ηλ. κλειδι αιτησης': 'permit_key',
  'τυπος πραξης': 'permit_type',
  'ημ/νια εκδοσης πραξης': 'permit_date',
  'ισχυει εως': 'permit_valid_until',
};

// Κανονικοποίηση κεφαλίδας: πεζά, χωρίς τόνους, χωρίς διπλά κενά.
function normalizeHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // αφαίρεση τόνων
    .replace(/\s+/g, ' ');
}

// Μετατροπή τιμής Excel σε καθαρό string ή null.
function cleanVal(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && Number.isInteger(v)) return String(v);
  return String(v).trim() || null;
}

// Μετατροπή ημερομηνίας Excel (serial ή string) σε YYYY-MM-DD ή null.
function toDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  // string τύπου "13/10/2025"
  const m = String(v).match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const [, dd, mm, yy] = m;
    const year = yy.length === 2 ? '20' + yy : yy;
    return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return null;
}

const DATE_FIELDS = new Set(['permit_date', 'permit_valid_until']);

// Διαβάζει buffer Excel και επιστρέφει { rows, headers, unmatched }.
export function parseLeadsExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });

  if (!raw.length) return { rows: [], headers: [], unmatched: [] };

  const headerRow = raw[0];
  const headers = headerRow.map((h) => String(h ?? '').trim());

  // Δείκτης στήλης → πεδίο βάσης
  const colToField = {};
  const unmatched = [];
  headerRow.forEach((h, idx) => {
    const field = COLUMN_MAP[normalizeHeader(h)];
    if (field) colToField[idx] = field;
    else if (h) unmatched.push(String(h).trim());
  });

  const rows = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.every((c) => c === null || c === '')) continue;

    const lead = {};
    for (const [idx, field] of Object.entries(colToField)) {
      const val = r[idx];
      lead[field] = DATE_FIELDS.has(field) ? toDate(val) : cleanVal(val);
    }
    // Χρειαζόμαστε τουλάχιστον Α/Α αίτησης για να είναι έγκυρη γραμμή
    if (lead.external_ref) rows.push(lead);
  }

  return { rows, headers, unmatched };
}
