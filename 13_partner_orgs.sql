-- ============================================================================
-- Migration 13 — Συνεργαζόμενες Εταιρείες (Partner Orgs) / Φάση 2 πρόσβασης
-- ----------------------------------------------------------------------------
-- Δίνει σε εξωτερικές συνεργαζόμενες εταιρείες (π.χ. Baumit) περιορισμένη
-- πρόσβαση: βλέπουν & επεξεργάζονται ΜΟΝΟ τα leads που τους έχουν ανατεθεί,
-- με πλήρη λειτουργικότητα CRM πάνω σε αυτά. Οι εσωτερικοί χρήστες Unisol
-- ΔΕΝ επηρεάζονται — βλέπουν και χειρίζονται τα πάντα, όπως και πριν.
--
-- Στρατηγική ασφάλειας: προσθέτουμε RESTRICTIVE policies, που συνδυάζονται
-- με AND πάνω στις υπάρχουσες permissive policies. Έτσι ΔΕΝ χρειάζεται να
-- πειράξουμε ή να ξέρουμε τα ονόματα των υπαρχόντων policies — τα αφήνουμε
-- ανέπαφα και απλώς «στενεύουμε» την πρόσβαση για τους partner χρήστες.
--
-- ΠΡΟΣΟΧΗ (γιατί χρειάζεται και έλεγχος στον κώδικα): τα write server actions
-- τρέχουν με το session (anon key) → το RLS ισχύει. ΟΜΩΣ το import route τρέχει
-- με service role, που ΠΑΡΑΚΑΜΠΤΕΙ το RLS — γι' αυτό η ανάθεση σε partner γίνεται
-- μόνο από εμάς (admin) και τα ευαίσθητα πεδία προστατεύονται και στον κώδικα.
--
-- Idempotent: μπορεί να ξανατρέξει χωρίς σφάλμα.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Πίνακας συνεργαζόμενων εταιρειών
--    (ΔΙΑΦΟΡΕΤΙΚΟΣ από τον πίνακα «partners» = ετικέτες μηχανικών/συνεργείων
--     που κολλάμε στα leads· εδώ μιλάμε για εταιρείες που κάνουν login.)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists partner_orgs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '00000000-0000-0000-0000-000000000001',
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Ο χρήστης ανήκει (ή όχι) σε συνεργαζόμενη εταιρεία. NULL = εσωτερικός Unisol.
alter table profiles add column if not exists partner_org_id uuid references partner_orgs(id);

-- 3) Ανάθεση lead σε συνεργαζόμενη εταιρεία + διακόπτης απόσυρσης ορατότητας.
--    partner_access_revoked = true → το lead «κρύβεται» από τον συνεργάτη
--    (π.χ. όταν το αναλάβει αποκλειστικά κάποιος δικός μας), χωρίς να χαθεί
--    η ιστορική πληροφορία ότι ήταν lead της Baumit (αναστρέψιμο).
alter table leads add column if not exists partner_org_id uuid references partner_orgs(id);
alter table leads add column if not exists partner_access_revoked boolean not null default false;

create index if not exists idx_leads_partner_org
  on leads(partner_org_id) where partner_org_id is not null;

-- 4) Seed: Baumit
insert into partner_orgs (name)
select 'Baumit'
where not exists (select 1 from partner_orgs where name = 'Baumit');

-- ============================================================================
-- Helper functions — security definer ώστε να διαβάζουν profiles/leads ΧΩΡΙΣ
-- να ενεργοποιούν ξανά τα policies (αποφυγή άπειρης αναδρομής).
-- ============================================================================
create or replace function public.my_partner_org_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select partner_org_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_internal_user()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select partner_org_id is null from public.profiles where id = auth.uid()),
    false  -- κανένα προφίλ → θεωρείται ΜΗ εσωτερικός (fail-closed)
  )
$$;

-- Έχει ο τρέχων χρήστης πρόσβαση στο συγκεκριμένο lead;
create or replace function public.can_access_lead(p_lead_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.leads l
    where l.id = p_lead_id
      and (
        public.is_internal_user()
        or (l.partner_org_id = public.my_partner_org_id() and l.partner_access_revoked = false)
      )
  )
$$;

-- ============================================================================
-- RLS: partner_orgs (νέος πίνακας → ενεργοποιούμε RLS με ασφάλεια, αφού
-- δεν υπάρχει προϋπάρχουσα πρόσβαση να «σπάσουμε»).
-- ============================================================================
alter table partner_orgs enable row level security;

drop policy if exists partner_orgs_select on partner_orgs;
create policy partner_orgs_select on partner_orgs
  for select to authenticated
  using (company_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ============================================================================
-- RESTRICTIVE policies — «στενεύουν» την πρόσβαση για partner χρήστες.
-- Οι εσωτερικοί χρήστες περνούν πάντα μέσω is_internal_user() = true.
-- ============================================================================

-- ── LEADS ────────────────────────────────────────────────────────────────
-- Βλέπουν μόνο τα δικά τους, μη-αποσυρμένα.
drop policy if exists leads_partner_scope_sel on leads;
create policy leads_partner_scope_sel on leads
  as restrictive for select to authenticated
  using (
    is_internal_user()
    or (partner_org_id = my_partner_org_id() and partner_access_revoked = false)
  );

-- Επεξεργάζονται μόνο τα δικά τους — και ΔΕΝ μπορούν να αλλάξουν ανάθεση/
-- απόσυρση: το WITH CHECK στη ΝΕΑ εγγραφή απορρίπτει κάθε τέτοια αλλαγή.
drop policy if exists leads_partner_scope_upd on leads;
create policy leads_partner_scope_upd on leads
  as restrictive for update to authenticated
  using (
    is_internal_user()
    or (partner_org_id = my_partner_org_id() and partner_access_revoked = false)
  )
  with check (
    is_internal_user()
    or (partner_org_id = my_partner_org_id() and partner_access_revoked = false)
  );

-- ── ACTIONS ──────────────────────────────────────────────────────────────
-- Βλέπουν/γράφουν ενέργειες μόνο για προσβάσιμα leads.
-- Αυτόνομες ενέργειες (lead_id IS NULL) → μόνο εσωτερικοί.
drop policy if exists actions_partner_scope_sel on actions;
create policy actions_partner_scope_sel on actions
  as restrictive for select to authenticated
  using ( is_internal_user() or (lead_id is not null and can_access_lead(lead_id)) );

drop policy if exists actions_partner_scope_ins on actions;
create policy actions_partner_scope_ins on actions
  as restrictive for insert to authenticated
  with check ( is_internal_user() or (lead_id is not null and can_access_lead(lead_id)) );

drop policy if exists actions_partner_scope_upd on actions;
create policy actions_partner_scope_upd on actions
  as restrictive for update to authenticated
  using ( is_internal_user() or (lead_id is not null and can_access_lead(lead_id)) )
  with check ( is_internal_user() or (lead_id is not null and can_access_lead(lead_id)) );

-- ── LEAD_PARTNERS (ετικέτες συνεργατών ανά lead) ─────────────────────────
-- Ο συνεργάτης διαχειρίζεται ετικέτες μόνο στα δικά του leads.
drop policy if exists lead_partners_partner_scope_sel on lead_partners;
create policy lead_partners_partner_scope_sel on lead_partners
  as restrictive for select to authenticated
  using ( can_access_lead(lead_id) );

drop policy if exists lead_partners_partner_scope_ins on lead_partners;
create policy lead_partners_partner_scope_ins on lead_partners
  as restrictive for insert to authenticated
  with check ( can_access_lead(lead_id) );

drop policy if exists lead_partners_partner_scope_del on lead_partners;
create policy lead_partners_partner_scope_del on lead_partners
  as restrictive for delete to authenticated
  using ( can_access_lead(lead_id) );

-- ── MESSAGES & NOTIFICATIONS ─────────────────────────────────────────────
-- Το εσωτερικό messaging της Unisol ΔΕΝ αφορά τους συνεργάτες (όπως στον
-- αρχικό σχεδιασμό). Κλειδώνονται εντελώς για partner χρήστες.
drop policy if exists messages_internal_only on messages;
create policy messages_internal_only on messages
  as restrictive for all to authenticated
  using ( is_internal_user() ) with check ( is_internal_user() );

drop policy if exists notifications_internal_only on notifications;
create policy notifications_internal_only on notifications
  as restrictive for all to authenticated
  using ( is_internal_user() ) with check ( is_internal_user() );

-- ── ENGINEERS (μητρώο μηχανικών) ─────────────────────────────────────────
-- Ο συνεργάτης βλέπει το όνομα μηχανικού πάνω στο lead (αποθηκευμένο πεδίο),
-- αλλά ΔΕΝ έχει πρόσβαση στο μητρώο μηχανικών (που δείχνει άδειες όλων των
-- leads, και εσωτερικών). Κλειδώνεται σε εσωτερικούς.
drop policy if exists engineers_internal_only on engineers;
create policy engineers_internal_only on engineers
  as restrictive for select to authenticated
  using ( is_internal_user() );

-- ============================================================================
-- ΤΕΛΕΥΤΑΙΟ ΒΗΜΑ — τρέξ' το ΑΦΟΥ δημιουργήσεις τον χρήστη baumit@baumit.gr
-- στο Supabase Auth (Authentication → Users → Add user). Συνδέει το προφίλ
-- του με τη Baumit και τον ορίζει ως partner:
-- ----------------------------------------------------------------------------
-- update profiles
--    set partner_org_id = (select id from partner_orgs where name = 'Baumit'),
--        role           = 'partner',
--        is_salesperson = false
--  where id = (select id from auth.users where email = 'baumit@baumit.gr');
--
-- (Αν το profiles row δεν έχει δημιουργηθεί αυτόματα με τον χρήστη, δημιούργησέ
--  το πρώτα με το σχετικό trigger/flow που ήδη χρησιμοποιείς για νέους χρήστες.)
-- ============================================================================
