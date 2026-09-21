import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import backgroundImage from "#img/rollingblackoutlogo-fs-png.png";
import { AppHeader } from "@/components/AppHeader";
import { FooterPlayer } from "@/components/FooterPlayer";
import { PlayerProvider } from "@/components/PlayerProvider";

const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Rolling Blackout",
  description: "Band portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="isolate relative bg-neutral-950 text-neutral-100 min-inline-screen font-mono antialiased">
        <PlayerProvider>
          <AppHeader />
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
          <main className="max-w-5xl mx-auto z-[10] px-6 pt-28 pb-24">
            {children}
          </main>
          <FooterPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
