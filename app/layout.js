import { Commissioner } from 'next/font/google';
import './globals.css';

// Μία οικογένεια παντού (δένει με το γεωμετρικό λογότυπο της Unisol).
// Δύο instances ώστε τα υπάρχοντα var(--font-display)/var(--font-body) να δουλεύουν ως έχουν.
const display = Commissioner({
  subsets: ['latin', 'greek'],
  variable: '--font-display',
});

const body = Commissioner({
  subsets: ['latin', 'greek'],
  variable: '--font-body',
});

export const metadata = {
  title: 'Unisol CRM',
  description: 'Διαχείριση ευκαιριών πωλήσεων',
};

// viewport-fit=cover: επιτρέπει στο κάτω μενού να σέβεται το safe-area των iPhone
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="el" className={`${display.variable} ${body.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.5.0/dist/tabler-icons.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
