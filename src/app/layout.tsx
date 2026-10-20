import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import backgroundImage from "#img/rollingblackoutlogo-fs-png.png";
import { AppHeader } from "@/components/AppHeader";
import { PlayerBar } from "@/components/PlayerBar";
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
      <body className="relative isolate bg-neutral-950 font-mono text-neutral-100 antialiased min-inline-screen">
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
          <main className="z-[10] mx-auto max-w-5xl px-4 pt-4 pb-10 sm:px-6 sm:pt-6 md:pb-28">
            {children}
          </main>
          <PlayerBar placement="footer" />
        </PlayerProvider>
      </body>
    </html>
  );
}
