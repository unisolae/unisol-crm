# Unisol CRM — Φάση 2 (σκελετός εφαρμογής)

Next.js + Supabase. Login με προστατευμένο dashboard. Όλα μέσω GitHub + Railway,
χωρίς τοπικό setup.

---

## Τι κάνει αυτή η εφαρμογή (προς το παρόν)

- Οθόνη **σύνδεσης (login)** που χτυπάει το Supabase Auth.
- **Προστατευμένο dashboard**: αν δεν είσαι συνδεδεμένος, σε στέλνει στο login.
- Δείχνει το όνομα και τον ρόλο σου, με κουμπί **αποσύνδεσης**.

---

## ΒΗΜΑ 1 — Ανέβασε τον κώδικα στο GitHub (μέσω browser)

1. Πήγαινε στο https://github.com/new
2. Δώσε όνομα, π.χ. `unisol-crm`, κράτησέ το **Private**, πάτησε **Create repository**.
3. Στη σελίδα που ανοίγει, κάνε κλικ στο **"uploading an existing file"**.
4. Άνοιξε τον φάκελο `unisol-crm` που σου έδωσα, **διάλεξε όλα τα αρχεία και
   φακέλους μέσα του** (όχι τον ίδιο τον φάκελο) και σύρε τα στο GitHub.
   - Πρόσεξε να ανέβουν και οι φάκελοι `app/` και `lib/`.
5. Πάτησε **Commit changes**.

---

## ΒΗΜΑ 2 — Πάρε τα κλειδιά από το Supabase

Στο Supabase project σου: **Project Settings → API**. Αντίγραψε:

- **Project URL** (π.χ. `https://abcd1234.supabase.co`)
- **anon public** key (μεγάλο string που αρχίζει με `eyJ...`)

Κράτησέ τα πρόχειρα για το επόμενο βήμα.

---

## ΒΗΜΑ 3 — Deploy στο Railway

1. Στο Railway: **New Project → Deploy from GitHub repo** και διάλεξε το
   `unisol-crm`.
2. Το Railway αναγνωρίζει αυτόματα ότι είναι Next.js και ξεκινά build.
3. Πήγαινε στο **Variables** της υπηρεσίας και πρόσθεσε δύο μεταβλητές:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | το Project URL από το Βήμα 2 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | το anon public key από το Βήμα 2 |

4. Μετά την προσθήκη, κάνε **Redeploy** (το Railway συνήθως το κάνει μόνο του).
5. Στο **Settings → Networking → Generate Domain** για να πάρεις μια δημόσια
   διεύθυνση (π.χ. `unisol-crm-production.up.railway.app`).

> Το `leads.myunisol.gr` το συνδέουμε αργότερα — πρώτα δουλεύουμε στο
> προσωρινό railway domain.

---

## ΒΗΜΑ 4 — Δοκίμασε

1. Άνοιξε τη διεύθυνση του Railway.
2. Θα σε στείλει στο `/login`.
3. Μπες με:
   - **Email:** `unisol@myunisol.gr`
   - **Κωδικός:** `unisol-1269`
4. Αν δεις το dashboard με το όνομα και τον ρόλο σου — όλα δουλεύουν. 🎉

---

## Πρόβλημα στη σύνδεση;

- **"Λάθος email ή κωδικός":** βεβαιώσου ότι έφτιαξες τον χρήστη στο Supabase
  (Authentication → Users) και ότι το email/κωδικός ταιριάζουν.
- **Σε γυρνάει συνέχεια στο login:** έλεγξε ότι οι δύο μεταβλητές στο Railway
  είναι σωστές (χωρίς κενά στην αρχή/τέλος) και ότι έκανες Redeploy.
- **Σφάλμα στο build:** συνήθως λείπει κάποιο αρχείο από το upload — βεβαιώσου
  ότι ανέβηκαν οι φάκελοι `app/` και `lib/` ολόκληροι.
