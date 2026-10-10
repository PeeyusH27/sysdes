import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/layout/Providers";
import { SiteNav } from "@/components/layout/SiteNav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "System Design Suite", template: "%s · System Design Suite" },
  description: "Learn high-level system design with animated diagrams, interactive simulators, detailed interview answers in JavaScript, and a drag-and-drop HLD playground.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <SiteNav />
          <main id="main">{children}</main>
          <footer className="container no-print" style={{ padding: "48px 20px 40px", color: "var(--muted)", fontSize: 14, borderTop: "1px solid var(--border)", marginTop: 48 }}>
            System Design Suite · Learn it, then practise it. ·{" "}
            <Link href="/cheatsheet" className="link">Cheatsheet</Link> · <Link href="/glossary" className="link">Glossary</Link> ·{" "}
            <Link href="/playground" className="link">Playground</Link>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
