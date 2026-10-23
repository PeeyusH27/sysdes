import Link from "next/link";
import { ArrowRight, Binary, Network } from "lucide-react";
import { getPattern } from "@content/dsa/registry";
import { allPages } from "@content/registry";
import { patternsFor, systemsFor } from "@content/bridges";

/** "In real systems" block on a pattern page: the system design pages where the pattern is doing the work. */
export function PatternInSystems({ slug }: { slug: string }) {
  const items = systemsFor(slug);
  if (!items.length) return null;
  const pages = allPages();
  return (
    <section className="bridges" data-track="sd" aria-labelledby="in-real-systems">
      <h2 id="in-real-systems">In real systems</h2>
      <p>This pattern is not only for coding rounds. Here is where it does the work in a design interview.</p>
      <ul className="bridge-list">
        {items.map((b) => (
          <li key={b.to}>
            <Link href={b.to} className="bridge card-link">
              <span className="bridge-icon">
                <Network size={16} aria-hidden />
              </span>
              <span className="bridge-title">{pages.find((p) => p.href === b.to)?.title ?? b.to}</span>
              <span className="bridge-why">{b.why}</span>
              <ArrowRight size={15} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Patterns behind this" block at the end of a system design page: the DSA patterns it relies on. */
export function PatternsBehind({ href }: { href: string }) {
  const items = patternsFor(href);
  if (!items.length) return null;
  return (
    <section className="bridges" data-track="dsa" aria-labelledby="patterns-behind">
      <h2 id="patterns-behind">Patterns behind this</h2>
      <p>The coding patterns this design is built on. Practise them and the design questions get easier.</p>
      <ul className="bridge-list">
        {items.map((b) => (
          <li key={b.pattern}>
            <Link href={`/dsa/patterns/${b.pattern}`} className="bridge card-link">
              <span className="bridge-icon">
                <Binary size={16} aria-hidden />
              </span>
              <span className="bridge-title">{getPattern(b.pattern)?.title ?? b.pattern}</span>
              <span className="bridge-why">{b.why}</span>
              <ArrowRight size={15} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
