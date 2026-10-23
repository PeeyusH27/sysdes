import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { Caveat, Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/layout/Providers";
import { SiteNav } from "@/components/layout/SiteNav";
import { MockBar } from "@/components/prep/MockBar";
import { SketchDefs } from "@/components/doodle/SketchDefs";
import "./globals.css";
import "./dsa.css";
import "./reader.css";
import "./home.css";
import "./shorts.css";
import "./stage.css";
import "./code.css";
import "./nav.css";
import "./hubs.css";
import "./prep.css";
import "./refresh.css";
import "./story.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// A soft, friendly serif for headings, so a page reads like someone explaining it to you. Body and UI stay in Geist.
const display = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "opsz"], display: "swap" });
// Handwriting for doodles, captions and the sketch style. Loaded with display: swap, so text never waits for it.
const hand = Caveat({ variable: "--font-hand", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "DSA & System Design", template: "%s · DSA & System Design" },
  description: "Prepare for coding and system design interviews: DSA patterns with step-by-step animations and an in-browser JavaScript editor, plus animated system design lessons and a graded HLD playground.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${hand.variable}`} suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <SketchDefs />
          <SiteNav />
          <main id="main">{children}</main>
          <MockBar />
          <footer className="container no-print site-footer">
            <p className="site-footer-line">Learn it, then practise it. Take your time.</p>
            <nav aria-label="Footer">
              <Link href="/shorts">Shorts</Link>
              <Link href="/dsa/js">JS cheat sheet</Link>
              <Link href="/dsa/problems">Problems</Link>
              <Link href="/cheatsheet">Cheatsheet</Link>
              <Link href="/glossary">Glossary</Link>
              <Link href="/playground">Playground</Link>
            </nav>
          </footer>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
