import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClaimGuard Pay — AI Spend Authority for Healthcare Claims',
  description:
    'Ghost enrolments evaporate. AI-powered fraud detection + PayPal payout engine for NHIA healthcare claims.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
