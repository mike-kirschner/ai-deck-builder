import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Deck Builder',
  description: 'Generate presentations using AI and templates',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

