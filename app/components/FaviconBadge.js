'use client';

import { useEffect } from 'react';

// Ζωγραφίζει δυναμικά το favicon: βασικό εικονίδιο «U» στα χρώματα Unisol,
// με κόκκινη κουκκίδα όταν υπάρχουν αδιάβαστες ειδοποιήσεις. Ενημερώνει και
// τον τίτλο της καρτέλας με τον αριθμό, ώστε να φαίνεται από άλλη καρτέλα.
export default function FaviconBadge({ unread = 0 }) {
  useEffect(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Φόντο (σκούρο πράσινο, στρογγυλεμένο)
    ctx.fillStyle = '#0d2622';
    const r = 14;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(size, 0, size, size, r);
    ctx.arcTo(size, size, 0, size, r);
    ctx.arcTo(0, size, 0, 0, r);
    ctx.arcTo(0, 0, size, 0, r);
    ctx.closePath();
    ctx.fill();

    // Γράμμα «U»
    ctx.fillStyle = '#f4f1ea';
    ctx.font = 'bold 42px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('U', size / 2, size / 2 + 3);

    // Κόκκινη κουκκίδα αν υπάρχουν αδιάβαστα
    if (unread > 0) {
      ctx.fillStyle = '#e23b3b';
      ctx.beginPath();
      ctx.arc(size - 16, 16, 14, 0, Math.PI * 2);
      ctx.fill();
      // λεπτό περίγραμμα για αντίθεση
      ctx.strokeStyle = '#0d2622';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const url = canvas.toDataURL('image/png');

    // Εφαρμογή ως favicon (δημιουργία/ενημέρωση του <link rel="icon">)
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = url;

    // Ενημέρωση τίτλου καρτέλας: «(3) Unisol CRM»
    const base = 'Unisol CRM';
    document.title = unread > 0 ? `(${unread > 99 ? '99+' : unread}) ${base}` : base;
  }, [unread]);

  return null;
}
