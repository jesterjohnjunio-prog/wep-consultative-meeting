import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Barangay Consultative Meeting · MWSS RO Water Efficiency Program',
  description:
    'Registration for the Barangay Consultative Meeting of the MWSS Regulatory Office Water Efficiency Program — October 27, 2026, 1:00–5:00 PM, Manila Water Lakbayan Center.',
  icons: { icon: '/wep-logo.png', apple: '/wep-logo.png' },
  openGraph: {
    title: 'Barangay Consultative Meeting — MWSS RO Water Efficiency Program',
    description: 'Register your barangay for the WEP Consultative Meeting on October 27, 2026.',
    images: ['/wep-logo.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#04407f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fil" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
