import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createLead } from '../actions';

export default async function NewLeadPage() {
  const supabase = await createClient();
  const { data: salespeople } = await supabase
    .from('salespeople')
    .select('id, name')
    .order('name');

  return (
    <div className="page narrow">
      <div className="breadcrumb">
        <Link href="/leads">← Πίσω στα leads</Link>
      </div>

      <div className="page-head">
        <h1>Νέο lead</h1>
        <p>Χειροκίνητη καταχώρηση — συνήθως για έργα που μαθαίνουμε από συνεργάτες.</p>
      </div>

      <form action={createLead} className="edit-form card">
        <div className="form-grid">
          <div className="field full">
            <label>Περιγραφή έργου *</label>
            <input name="project_desc" type="text" required placeholder="π.χ. Νέα διώροφη κατοικία με θερμομόνωση" />
          </div>

          <div className="field full highlight">
            <label>Συνεργάτης που έφερε τη δουλειά</label>
            <input name="associate" type="text" placeholder="Όνομα συνεργάτη εμπορικού δικτύου" />
            <span className="field-hint">
              Σημαντικό: αν ρωτήσει δεύτερος συνεργάτης για το ίδιο έργο, ξέρουμε ποιος το έφερε πρώτος.
            </span>
          </div>

          <div className="field">
            <label>Πόλη</label>
            <input name="city" type="text" placeholder="π.χ. Ραφήνα" />
          </div>

          <div className="field">
            <label>Περιοχή</label>
            <input name="municipality" type="text" placeholder="π.χ. Πικέρμι" />
          </div>

          <div className="field full">
            <label>Διεύθυνση</label>
            <input name="address_street" type="text" placeholder="Οδός" />
          </div>

          <div className="field">
            <label>Πωλητής</label>
            <select name="salesperson_id" defaultValue="">
              <option value="">— Χωρίς ανάθεση —</option>
              {(salespeople ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Κατάσταση</label>
            <select name="crm_status" defaultValue="unknown">
              <option value="unknown">Άγνωστη</option>
              <option value="active">Ενεργή</option>
              <option value="closed">Κλειστή</option>
              <option value="negative">Αρνητική</option>
            </select>
          </div>

          <div className="field">
            <label>Μέγεθος lead (€)</label>
            <input name="lead_size_eur" type="text" inputMode="decimal" placeholder="π.χ. 15000" />
          </div>

          <div className="field full">
            <label>Ανάγκες</label>
            <textarea name="needs" rows={3} placeholder="Τι χρειάζεται ο πελάτης…" />
          </div>

          <div className="field full">
            <label>Σημειώσεις</label>
            <textarea name="notes" rows={2} />
          </div>
        </div>

        <div className="form-actions">
          <Link className="btn-ghost" href="/leads">Άκυρο</Link>
          <button className="btn-primary" type="submit">Δημιουργία lead</button>
        </div>
      </form>
    </div>
  );
}
