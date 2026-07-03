'use client';

import { useState } from 'react';
import { isoToGreekInput } from '@/lib/datetime';

// Πεδίο ημερομηνίας/ώρας σε μορφή ηη/μμ/εεεε (εγγυημένα, ανεξάρτητα από το locale του browser).
// Υποβάλλει το κείμενο ως έχει· ο server το μετατρέπει με το toTimestamp().
export default function GreekDateTime({
  name,
  defaultValue = '',
  required = false,
  withTime = true,
}) {
  const [val, setVal] = useState(() =>
    /^\d{4}-\d{2}-\d{2}/.test(String(defaultValue))
      ? isoToGreekInput(defaultValue, withTime)
      : defaultValue || ''
  );

  function onChange(e) {
    let digits = e.target.value.replace(/[^\d]/g, '');
    const maxLen = withTime ? 12 : 8; // ΗΗΜΜΕΕΕΕ[ΩΩΛΛ]
    digits = digits.slice(0, maxLen);

    let out = digits.slice(0, 2);
    if (digits.length >= 3) out += '/' + digits.slice(2, 4);
    if (digits.length >= 5) out += '/' + digits.slice(4, 8);
    if (withTime && digits.length >= 9) out += ' ' + digits.slice(8, 10);
    if (withTime && digits.length >= 11) out += ':' + digits.slice(10, 12);

    setVal(out);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      name={name}
      value={val}
      onChange={onChange}
      required={required}
      placeholder={withTime ? 'ηη/μμ/εεεε ωω:λλ' : 'ηη/μμ/εεεε'}
      autoComplete="off"
    />
  );
}
