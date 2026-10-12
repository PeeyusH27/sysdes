import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/layout/Providers";
import { SiteNav } from "@/components/layout/SiteNav";
import { Spotlight } from "@/components/layout/Spotlight";
import "./globals.css";
import "./dsa.css";
import "./reader.css";
import "./home.css";
import "./shorts.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "DSA & System Design", template: "%s · DSA & System Design" },
  description: "Prepare for coding and system design interviews: DSA patterns with step-by-step animations and an in-browser JavaScript editor, plus animated system design lessons and a graded HLD playground.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <Spotlight />
          <SiteNav />
          <main id="main">{children}</main>
          <footer className="container no-print site-footer" style={{ padding: "48px 20px 40px", color: "var(--muted)", fontSize: 14, borderTop: "1px solid var(--border)", marginTop: 48 }}>
            DSA &amp; System Design · Learn it, then practise it. · <Link href="/shorts" className="link">Shorts</Link> · <Link href="/dsa/js" className="link">JS cheat sheet</Link> ·{" "}
            <Link href="/dsa/problems" className="link">Problems</Link> · <Link href="/cheatsheet" className="link">System design cheatsheet</Link> ·{" "}
            <Link href="/glossary" className="link">Glossary</Link> · <Link href="/playground" className="link">Playground</Link>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
