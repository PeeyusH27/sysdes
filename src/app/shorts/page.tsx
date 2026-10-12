import { allPages } from "@content/registry";
import { shorts } from "@content/shorts";
import { ShortsDeck, type ShortItem } from "@/components/shorts/ShortsDeck";
import { highlight } from "@/lib/shiki";

export const metadata = {
  title: "Shorts",
  description: "One-minute bullet-point cards on system design, building blocks like Bloom filters and gossip, DSA patterns and JavaScript. Swipe for the next idea, scroll down to go deeper.",
  alternates: { canonical: "/shorts" },
};

export default async function ShortsPage() {
  const pages = allPages();
  const titleOf = (href: string) => (pages.find((p) => p.href === href) ?? pages.find((p) => p.href === href.split("#")[0]))?.title ?? "The full lesson";
  const items: ShortItem[] = await Promise.all(
    shorts.map(async (s) => ({ ...s, sourceTitle: s.source && titleOf(s.source), codeHtml: s.code ? await highlight(s.code, "js") : undefined })),
  );
  return (
    <>
      <h1 className="sr-only">Shorts</h1>
      <ShortsDeck items={items} />
    </>
  );
}
