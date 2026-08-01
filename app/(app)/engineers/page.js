import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAccess } from '@/lib/access';
import { normalizeName } from '@/lib/engineers';
import EngineersFilters from './EngineersFilters';

export default async function EngineersPage({ searchParams }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();

  const supabase = await createClient();
  // Προσβάσιμο και σε συνεργάτες: το RLS περιορίζει αυτόματα τη λίστα στους
  // μηχανικούς των αδειών που τους έχουν κοινοποιηθεί.
  const acc = await getAccess(supabase);
  if (!acc.user) redirect('/login');
  const isPartner = acc.isPartner;

  let query = supabase
    .from('engineers')
    .select('id, full_name, tee_number, specialty, registry_year, leads(count)')
    .limit(1000);

  if (q) {
    // Καθαρισμός χαρακτήρων που «σπάνε» το .or() του PostgREST
    const safe = q.replace(/[(),]/g, ' ').trim();
    const like = `%${safe}%`;
    const likeNorm = `%${normalizeName(safe)}%`;
    query = query.or(
      `full_name.ilike.${like},tee_number.ilike.${like},specialty.ilike.${like},normalized_name.like.${likeNorm}`
    );
  }

  const { data } = await query;

  // Ταξινόμηση: περισσότερες άδειες πρώτα, μετά αλφαβητικά
  const engineers = (data ?? [])
    .map((e) => ({ ...e, leadsCount: e.leads?.[0]?.count ?? 0 }))
    .sort(
      (a, b) =>
        b.leadsCount - a.leadsCount ||
        (a.full_name || '').localeCompare(b.full_name || '', 'el')
    );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Μηχανικοί</h1>
          <p>
            {engineers.length} εγγραφές ·{' '}
            {isPartner
              ? 'μηχανικοί των αδειών που σας έχουν κοινοποιηθεί'
              : 'ενημερώνεται αυτόματα από την εισαγωγή αδειών'}
          </p>
        </div>
      </div>

      <EngineersFilters />

      <div className="table-wrap d-only">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Μηχανικός</th>
              <th>Ειδικότητα</th>
              <th>Α.Μ. ΤΕΕ</th>
              <th>Άδειες</th>
            </tr>
          </thead>
          <tbody>
            {engineers.map((e) => (
              <tr key={e.id} className="row-link">
                <td className="cell-main">
                  <Link href={`/engineers/${e.id}`}>{e.full_name}</Link>
                  {e.registry_year && (
                    <span className="cell-sub">Μητρώο {e.registry_year}</span>
                  )}
                </td>
                <td className="cell-sub">{e.specialty || '—'}</td>
                <td className="cell-sub">{e.tee_number || '—'}</td>
                <td>{e.leadsCount}</td>
              </tr>
            ))}
            {engineers.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-row">
                  {q
                    ? 'Δεν βρέθηκαν μηχανικοί με αυτά τα κριτήρια.'
                    : 'Δεν υπάρχουν μηχανικοί ακόμη — θα εμφανιστούν αυτόματα με την πρώτη εισαγωγή αδειών.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Κινητό: λίστα-κάρτες */}
      <div className="m-cards m-only">
        {engineers.map((e) => (
          <Link key={e.id} href={`/engineers/${e.id}`} className="m-card">
            <div className="m-card-main">
              <div className="m-card-t">{e.full_name}</div>
              <div className="m-card-s">
                {[e.specialty, e.tee_number ? `ΤΕΕ ${e.tee_number}` : null]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </div>
            </div>
            <div className="m-card-side">
              <span className="m-card-cnt">
                {e.leadsCount} {e.leadsCount === 1 ? 'άδεια' : 'άδειες'}
              </span>
            </div>
          </Link>
        ))}
        {engineers.length === 0 && (
          <div className="m-card-empty">
            {q
              ? 'Δεν βρέθηκαν μηχανικοί με αυτά τα κριτήρια.'
              : 'Δεν υπάρχουν μηχανικοί ακόμη — θα εμφανιστούν αυτόματα με την πρώτη εισαγωγή αδειών.'}
          </div>
        )}
      </div>
    </div>
  );
}
