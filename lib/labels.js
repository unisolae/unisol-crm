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

export const toOptions = (map) =>
  Object.entries(map).map(([value, label]) => ({ value, label }));
