-- ============================================================================
-- Migration 14 — Μηχανικοί ορατοί στους συνεργάτες (Φάση 2 πρόσβασης)
-- ----------------------------------------------------------------------------
-- Δίνει στις συνεργαζόμενες εταιρείες (π.χ. Baumit) πρόσβαση στο μητρώο
-- μηχανικών, ΑΛΛΑ μόνο για τους μηχανικούς που εμφανίζονται στις άδειες που
-- τους έχουν κοινοποιηθεί (partner_org_id = δικό τους, μη-αποσυρμένο). Οι
-- εσωτερικοί χρήστες Unisol ΔΕΝ επηρεάζονται — βλέπουν όλο το μητρώο, όπως πριν.
--
-- Στη Migration 13 είχαμε κλειδώσει τους μηχανικούς αποκλειστικά σε εσωτερικούς
-- (engineers_internal_only). Εδώ «ανοίγουμε» ελεγχόμενα αυτόν τον περιορισμό.
--
-- Idempotent: μπορεί να ξανατρέξει χωρίς σφάλμα.
-- ============================================================================

-- Έχει ο τρέχων (partner) χρήστης έστω ένα προσβάσιμο lead που δείχνει σε αυτόν
-- τον μηχανικό; security definer ώστε να διαβάζει leads ΧΩΡΙΣ να ξαναενεργοποιεί
-- τα policies (αποφυγή αναδρομής). Για εσωτερικούς επιστρέφει false, γιατί το
-- my_partner_org_id() είναι NULL — δεν πειράζει, οι εσωτερικοί καλύπτονται από
-- το is_internal_user() στα policies.
create or replace function public.partner_can_see_engineer(p_engineer_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.leads l
    where l.engineer_id = p_engineer_id
      and l.partner_org_id = public.my_partner_org_id()
      and l.partner_access_revoked = false
  )
$$;

-- ── RESTRICTIVE: το «στενό» όριο — εσωτερικοί ΟΛΑ, συνεργάτης ΜΟΝΟ τους δικούς
--    του μηχανικούς. Αντικαθιστά το engineers_internal_only της Migration 13.
drop policy if exists engineers_internal_only on engineers;
create policy engineers_internal_only on engineers
  as restrictive for select to authenticated
  using ( is_internal_user() or partner_can_see_engineer(id) );

-- ── PERMISSIVE (additive): εξασφαλίζει ότι ο συνεργάτης ΔΕΝ μπλοκάρεται στο
--    permissive επίπεδο για τους δικούς του μηχανικούς, ανεξάρτητα από το τι
--    επιτρέπουν τα υπάρχοντα permissive policies. Δεν διευρύνει την πρόσβαση:
--    partner_can_see_engineer() είναι false για εσωτερικούς (δεν τους αγγίζει)
--    και για μηχανικούς εκτός εμβέλειας, ενώ το restrictive παραμένει το όριο.
drop policy if exists engineers_partner_scope_sel on engineers;
create policy engineers_partner_scope_sel on engineers
  for select to authenticated
  using ( partner_can_see_engineer(id) );
