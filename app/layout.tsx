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
  title: "Concept Voting Tool",
  description: "Run ideation sessions and surface the top concepts.",
};

function Nav() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Concept Voting
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/join" className="text-zinc-700 hover:text-zinc-900">
            Join session
          </Link>
          <Link
            href="/admin"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-700"
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
