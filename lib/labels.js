// Κοινές ετικέτες (ελληνικά) για τα enums των leads.

export const CRM_STATUS = {
  unknown: 'Άγνωστη',
  active: 'Ενεργή',
  closed: 'Κλειστή',
  negative: 'Αρνητική',
};

export const PRIORITY = {
  low: 'Χαμηλή',
  medium: 'Μέτρια',
  high: 'Υψηλή',
};

export const LEAD_TYPE = {
  commercial: 'Εμπορικό',
  technical: 'Τεχνικό',
  industrial: 'Βιομηχανικό',
};

// Λόγος αρνητικής έκβασης — συμπληρώνεται μόνο όταν crm_status = 'negative'.
export const NEGATIVE_REASON = {
  completed: 'Ολοκληρωμένη',
  other_offer: 'Άλλη προσφορά',
  other_partner: 'Άλλη συνεργασία',
  not_unisol: 'Όχι Unisol',
};

export const toOptions = (map) =>
  Object.entries(map).map(([value, label]) => ({ value, label }));

// --- Συνεργάτες ---
// Η σειρά εδώ είναι και η σειρά εμφάνισης στα dropdown.
export const PARTNER_TYPE = {
  crew: 'Συνεργείο',
  engineer: 'Μηχανικός',
  manufacturer: 'Κατασκευαστής',
  contractor: 'Εργολάβος',
  tech_company: 'Τεχνική εταιρεία',
  merchant: 'Έμπορος',
  individual: 'Ιδιώτης',
};

// Όνομα εμφάνισης συνεργάτη: προτεραιότητα στο ονοματεπώνυμο, μετά επωνυμία.
export const partnerName = (p) =>
  (p?.full_name && p.full_name.trim()) ||
  (p?.company_name && p.company_name.trim()) ||
  'Χωρίς όνομα';

// --- Μηνύματα / Εκκρεμότητες ---

export const MESSAGE_TYPE = {
  message: 'Μήνυμα',
  callback: 'Επιστροφή κλήσης',
  reminder: 'Υπενθύμιση',
  follow_up: 'Follow-up',
};

export const MESSAGE_STATUS = {
  new: 'Νέα',
  in_progress: 'Σε εξέλιξη',
  done: 'Ολοκληρωμένη',
  cancelled: 'Ακυρωμένη',
};

export const MESSAGE_PRIORITY = {
  low: 'Χαμηλή',
  medium: 'Μέτρια',
  high: 'Υψηλή',
};

// Ομάδες-παραλήπτες. 'salespeople' = όλοι οι πωλητές (is_salesperson).
export const RECIPIENT_GROUP = {
  salespeople: 'Προς Πωλητές',
  management: 'Προς Management',
  marketing: 'Προς Marketing',
  sales: 'Προς Sales',
  sales_support: 'Προς Sales support',
};
