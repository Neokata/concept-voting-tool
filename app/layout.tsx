import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "CompetitorIQ — Concept Voting",
  description: "Run ideation sessions and surface the top concepts.",
};

function Nav() {
  return (
    <header className="bg-zinc-900 text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight text-white"
        >
          Competitor<span className="font-light italic">IQ</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/join"
            className="rounded-md px-3 py-1.5 text-white/90 hover:bg-white/10 hover:text-white"
          >
            Join session
          </Link>
          <Link
            href="/admin"
            className="rounded-md bg-white/10 px-3 py-1.5 font-semibold text-white ring-1 ring-white/30 hover:bg-white/20"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 bg-white py-4 text-center text-xs text-zinc-500">
          POC — data is stored in this browser only
        </footer>
      </body>
    </html>
  );
}