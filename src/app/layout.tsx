import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { getAppShellContext } from "@/server/foundation";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Guild Exchange",
    template: "%s · Guild Exchange",
  },
  description:
    "Локальный alpha-ready этап браузерной idle/management RPG на Next.js, TypeScript, Prisma и SQLite.",
};

export const runtime = "nodejs";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shellContext = await getAppShellContext();

  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="app-body">
        <a className="skip-link" href="#main-content">
          Перейти к основному содержимому
        </a>
        <AppShell shellContext={shellContext}>{children}</AppShell>
      </body>
    </html>
  );
}
