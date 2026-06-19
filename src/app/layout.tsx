import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import backgroundImage from "#img/rollingblackoutlogo-fs-png.png";

const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Rolling Blackout",
  description: "Band portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="isolate relative bg-neutral-950 text-neutral-100 min-inline-screen font-mono antialiased">
        <header className="border-b -z+10 border-neutral-800 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-agincourt text-rbyellow-500 text-2xl sm:text-4xl md:text-feature-title leading-none tracking-wide">
            Rolling Blackout
          </Link>
          <nav className="flex gap-6 text-xs text-neutral-400">
            <Link href="/" className="hover:text-neutral-100 transition-colors">Releases</Link>
            <Link href="/browse" className="hover:text-neutral-100 transition-colors">Browse</Link>
            <Link href="/admin" className="hover:text-neutral-100 transition-colors">Admin</Link>
          </nav>
        </header>
        <div className="fixed inset-0 z-[-10] pointer-events-none">
          <Image
            src={backgroundImage}
            alt=""
            priority
            fill
            sizes="100vw"
            className="object-cover object-center brightness-[0.15]"
            quality={75}
          />
        </div>
        <main className="max-w-5xl mx-auto z-[10] px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
