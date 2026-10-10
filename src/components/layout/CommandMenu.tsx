"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import MiniSearch from "minisearch";
import { BookOpen, Boxes, FileQuestion, Library } from "lucide-react";

type Doc = { id: string; title: string; section: string; summary: string; tags: string; body: string };

let indexPromise: Promise<MiniSearch<Doc>> | null = null;
function loadIndex() {
  indexPromise ??= fetch("/search-index.json")
    .then((r) => r.json())
    .then((docs: Doc[]) => {
      const ms = new MiniSearch<Doc>({
        fields: ["title", "tags", "summary", "body"],
        storeFields: ["title", "section", "summary"],
        searchOptions: { boost: { title: 4, tags: 2, summary: 1.5 }, prefix: true, fuzzy: 0.2 },
      });
      ms.addAll(docs);
      return ms;
    });
  return indexPromise;
}

const ICONS: Record<string, typeof BookOpen> = { Learn: BookOpen, "Deep dives": Library, Questions: FileQuestion, Reference: Boxes };

export function CommandMenu({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<MiniSearch<Doc> | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch(() => setIndex(null));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    if (!index) return [];
    if (!q.trim()) {
      return index.search(MiniSearch.wildcard, {}).slice(0, 30);
    }
    return index.search(q).slice(0, 20);
  }, [index, q]);

  return (
    <div className="cmdk-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmdk-panel" role="dialog" aria-modal="true" aria-label="Search">
        <Command shouldFilter={false} label="Search lessons, deep dives and questions">
          <Command.Input autoFocus value={q} onValueChange={setQ} placeholder="Search lessons, deep dives, questions…" />
          <Command.List>
            <Command.Empty>{index ? "No results." : "Loading…"}</Command.Empty>
            {results.map((r) => {
              const Icon = ICONS[r.section as string] ?? BookOpen;
              return (
                <Command.Item
                  key={r.id}
                  value={String(r.id)}
                  onSelect={() => {
                    onClose();
                    router.push(String(r.id));
                  }}
                >
                  <Icon size={16} aria-hidden />
                  <span>{r.title as string}</span>
                  <small>{r.section as string}</small>
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
