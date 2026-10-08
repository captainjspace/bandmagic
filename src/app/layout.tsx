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
      <body className="min-inline-screen relative isolate bg-neutral-950 font-mono text-neutral-100 antialiased">
        <PlayerProvider>
          <AppHeader />
          <div className="pointer-events-none fixed inset-0 z-[-10]">
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
          <main className="z-[10] mx-auto max-w-5xl px-6 pt-6 pb-24">
            {children}
          </main>
          <FooterPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
