import * as XLSX from 'xlsx';
import { PARTNER_TYPE } from '@/lib/labels';

// Αντιστοίχιση: κεφαλίδα Excel → πεδίο συνεργάτη. Χαλαρή σύγκριση (χωρίς τόνους/κενά).
const COLUMN_MAP = {
  κωδικος: 'erp_code',
  'κωδικος erp': 'erp_code',
  ονοματεπωνυμο: 'full_name',
  ονομα: 'full_name',
  επωνυμια: 'company_name',
  εταιρεια: 'company_name',
  'επωνυμια / εταιρεια': 'company_name',
  'επωνυμια/εταιρεια': 'company_name',
  τηλεφωνο: 'phone',
  κινητο: 'mobile',
  email: 'email',
  'e-mail': 'email',
  διευθυνση: 'address',
  προμηθευτης: 'main_supplier',
  'κυριος προμηθευτης': 'main_supplier',
  τυπος: 'type',
  'τυπος συνεργατη': 'type',
  ρολος: 'type',
  παρατηρησεις: 'notes',
  πωλητης: 'salesperson_name',
  υπευθυνος: 'salesperson_name',
  'υπευθυνος πωλητης': 'salesperson_name',
};

function normalizeHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

// Αντίστροφος χάρτης: ελληνική ετικέτα τύπου → key
const TYPE_BY_LABEL = {};
for (const [key, label] of Object.entries(PARTNER_TYPE)) {
  TYPE_BY_LABEL[normalizeHeader(label)] = key;
}
const TYPE_KEYS = new Set(Object.keys(PARTNER_TYPE));

function resolveType(v) {
  if (v === null || v === undefined || v === '') return 'crew';
  const n = normalizeHeader(v);
  if (TYPE_KEYS.has(n)) return n; // ήδη key (π.χ. 'engineer')
  return TYPE_BY_LABEL[n] || 'crew'; // ελληνική ετικέτα → key
}

function cleanVal(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && Number.isInteger(v)) return String(v);
  return String(v).trim() || null;
}

// Διαβάζει buffer Excel και επιστρέφει { rows, unmatched }.
export function parsePartnersExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
  if (!raw.length) return { rows: [], unmatched: [] };

  const headerRow = raw[0];
  const colToField = {};
  const unmatched = [];
  headerRow.forEach((h, idx) => {
    const f = COLUMN_MAP[normalizeHeader(h)];
    if (f) colToField[idx] = f;
    else if (h) unmatched.push(String(h).trim());
  });

  const rows = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.every((c) => c === null || c === '')) continue;

    const p = {};
    for (const [idx, field] of Object.entries(colToField)) {
      const val = r[idx];
      if (field === 'type') p.type = resolveType(val);
      else p[field] = cleanVal(val);
    }
    if (!p.type) p.type = 'crew';

    // Έγκυρη γραμμή: τουλάχιστον ονοματεπώνυμο ή επωνυμία.
    if (p.full_name || p.company_name) rows.push(p);
  }

  return { rows, unmatched };
}
