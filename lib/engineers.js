// Ανάλυση & αντιστοίχιση μηχανικών από το πεδίο «Διαχειριστής Αίτησης» των αδειών.
// Μορφή πηγής: 'ΕΠΩΝΥΜΟ ΟΝΟΜΑ (A.M. TEE:12345), ΕΙΔΙΚΟΤΗΤΑ[2004]'
// Κλειδί αντιστοίχισης: Α.Μ. ΤΕΕ όταν υπάρχει, αλλιώς κανονικοποιημένο όνομα.

// Κανονικοποίηση ονόματος: trim → NFD → αφαίρεση τόνων → μονά κενά → ΚΕΦΑΛΑΙΑ.
// Ίδια λογική με τη norm_name() στη βάση (migration 11) — πρέπει να μένουν συγχρονισμένες.
export function normalizeName(s) {
  return String(s || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

// Το «ΤΕΕ» εμφανίζεται άλλοτε με λατινικούς κι άλλοτε με ελληνικούς χαρακτήρες (T/Τ, E/Ε).
const TEE_RE = /[TΤ][EΕ][EΕ][^0-9]*([0-9]+)/;

// Επιστρέφει { name, tee, specialty, registryYear, norm } ή null αν το πεδίο είναι κενό.
export function parseEngineer(raw) {
  const t = String(raw || '').trim();
  if (!t) return null;

  const name = t.split('(')[0].replace(/\s+/g, ' ').trim();
  if (!name) return null;

  const tee = (t.match(TEE_RE) || [])[1] || null;

  // Ειδικότητα: ό,τι ακολουθεί μετά το «),» — χωρίς το [έτος] στο τέλος
  let specialty = null;
  let registryYear = null;
  const after = t.match(/\)\s*,\s*(.*)$/);
  if (after) {
    const y = after[1].match(/\[(\d{4})\]\s*$/);
    if (y) registryYear = Number(y[1]);
    specialty = after[1].replace(/\[\d{4}\]\s*$/, '').trim() || null;
  }

  return { name, tee, specialty, registryYear, norm: normalizeName(name) };
}

/**
 * Εξασφαλίζει ότι υπάρχουν εγγραφές μηχανικών για όλα τα δοσμένα raw strings
 * (δημιουργεί όσους λείπουν) και επιστρέφει Map: raw string → engineer_id.
 *
 * Αντιστοίχιση: πρώτα με Α.Μ. ΤΕΕ· αλλιώς με κανονικοποιημένο όνομα.
 * Αν υπάρχων μηχανικός χωρίς ΤΕΕ ταιριάξει σε εγγραφή που φέρνει ΤΕΕ,
 * η εγγραφή του εμπλουτίζεται (ΤΕΕ/ειδικότητα/έτος).
 */
export async function ensureEngineers(supabase, companyId, rawList) {
  // 1) Ανάλυση & dedup μέσα στο batch
  const rawToKey = new Map(); // raw → dedup key
  const byKey = new Map(); // dedup key → parsed
  for (const raw of rawList || []) {
    const p = parseEngineer(raw);
    if (!p) continue;
    const key = p.tee ? `t:${p.tee}` : `n:${p.norm}`;
    rawToKey.set(raw, key);
    if (!byKey.has(key)) byKey.set(key, p);
  }
  if (!byKey.size) return new Map();

  const parsedList = [...byKey.values()];
  const tees = [...new Set(parsedList.filter((p) => p.tee).map((p) => p.tee))];
  const norms = [...new Set(parsedList.map((p) => p.norm))];

  // 2) Υπάρχοντες μηχανικοί (με ΤΕΕ ή με ίδιο όνομα)
  async function fetchExisting() {
    const found = [];
    if (tees.length) {
      const { data } = await supabase
        .from('engineers')
        .select('id, tee_number, normalized_name')
        .eq('company_id', companyId)
        .in('tee_number', tees);
      found.push(...(data ?? []));
    }
    if (norms.length) {
      const { data } = await supabase
        .from('engineers')
        .select('id, tee_number, normalized_name')
        .eq('company_id', companyId)
        .in('normalized_name', norms);
      found.push(...(data ?? []));
    }
    return found;
  }

  const byTee = new Map();
  const byNorm = new Map();
  function indexExisting(list) {
    for (const e of list) {
      if (e.tee_number) byTee.set(e.tee_number, e);
      if (!byNorm.has(e.normalized_name)) byNorm.set(e.normalized_name, []);
      byNorm.get(e.normalized_name).push(e);
    }
  }
  indexExisting(await fetchExisting());

  // 3) Αντιστοίχιση κάθε key σε id — ό,τι δεν βρεθεί, μπαίνει για δημιουργία
  const keyToId = new Map();
  const toInsert = [];
  const enrich = []; // υπάρχοντες χωρίς ΤΕΕ που τώρα αποκτούν ΤΕΕ/ειδικότητα

  for (const [key, p] of byKey) {
    let match = (p.tee && byTee.get(p.tee)) || null;

    if (!match) {
      const cands = byNorm.get(p.norm) ?? [];
      if (p.tee) {
        // Ίδιο όνομα χωρίς ΤΕΕ → ίδιος μηχανικός· εμπλουτίζεται.
        // (Ίδιο όνομα με ΔΙΑΦΟΡΕΤΙΚΟ ΤΕΕ = άλλο πρόσωπο → νέα εγγραφή.)
        match = cands.find((c) => !c.tee_number) ?? null;
        if (match) {
          enrich.push({
            id: match.id,
            patch: { tee_number: p.tee, specialty: p.specialty, registry_year: p.registryYear },
          });
          match.tee_number = p.tee; // in-memory, ώστε να μη γίνει διπλό enrich
          byTee.set(p.tee, match);
        }
      } else {
        match = cands[0] ?? null;
      }
    }

    if (match) keyToId.set(key, match.id);
    else {
      toInsert.push({
        key,
        row: {
          company_id: companyId,
          full_name: p.name,
          normalized_name: p.norm,
          tee_number: p.tee,
          specialty: p.specialty,
          registry_year: p.registryYear,
        },
      });
    }
  }

  // 4) Δημιουργία όσων λείπουν
  if (toInsert.length) {
    const { data, error } = await supabase
      .from('engineers')
      .insert(toInsert.map((t) => t.row))
      .select('id, tee_number, normalized_name');

    if (error && error.code === '23505') {
      // Σπάνιο race: κάποιος δημιουργήθηκε στο μεταξύ — ξαναδιαβάζουμε και ταιριάζουμε.
      indexExisting(await fetchExisting());
      for (const t of toInsert) {
        const m = t.row.tee_number
          ? byTee.get(t.row.tee_number)
          : (byNorm.get(t.row.normalized_name) ?? [])[0];
        if (m) keyToId.set(t.key, m.id);
      }
    } else if (error) {
      throw error;
    } else {
      for (const t of toInsert) {
        const row = (data ?? []).find((d) =>
          t.row.tee_number
            ? d.tee_number === t.row.tee_number
            : !d.tee_number && d.normalized_name === t.row.normalized_name
        );
        if (row) keyToId.set(t.key, row.id);
      }
    }
  }

  // 5) Εμπλουτισμός υπαρχόντων (ΤΕΕ/ειδικότητα/έτος) — δεν μπλοκάρει το import
  for (const e of enrich) {
    const patch = { updated_at: new Date().toISOString() };
    if (e.patch.tee_number) patch.tee_number = e.patch.tee_number;
    if (e.patch.specialty) patch.specialty = e.patch.specialty;
    if (e.patch.registry_year) patch.registry_year = e.patch.registry_year;
    await supabase.from('engineers').update(patch).eq('id', e.id);
  }

  // 6) Τελικό αποτέλεσμα: raw string → engineer_id
  const res = new Map();
  for (const [raw, key] of rawToKey) res.set(raw, keyToId.get(key) ?? null);
  return res;
}
