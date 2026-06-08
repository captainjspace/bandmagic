import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';

const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Rolling Blackout',
  description: 'Band portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="bg-neutral-950 text-neutral-100 min-h-screen font-mono antialiased">
        <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-green-400 font-bold tracking-widest text-sm uppercase">
            Rolling Blackout
          </a>
          <nav className="flex gap-6 text-xs text-neutral-400">
            <a href="/" className="hover:text-neutral-100 transition-colors">Releases</a>
            <a href="/browse" className="hover:text-neutral-100 transition-colors">Browse</a>
            <a href="/admin" className="hover:text-neutral-100 transition-colors">Admin</a>
          </nav>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
