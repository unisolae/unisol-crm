import { Literata, Commissioner } from 'next/font/google';
import './globals.css';

const display = Literata({
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
