"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, PanelLeftOpen, X } from "lucide-react";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";

/**
 * The list of pages in this track ("Questions", "HLD path"…), in a drawer that slides in from the left, so the
 * lesson keeps the full width. Built on the Popover API: the button opens it without JS, and clicking outside or
 * pressing Escape closes it. <PageDrawerButton> sits in the reader bar; <PageDrawer> once per page.
 */
const DRAWER_ID = "page-drawer";

/** hidePopover() throws once the element has left the document, so only hide one that is open. */
function hide(el: HTMLElement | null) {
  if (el?.isConnected && el.matches(":popover-open")) el.hidePopover();
}

export interface DrawerItem {
  href: string;
  label: string;
}

export function PageDrawerButton({ title, items }: { title: string; items: DrawerItem[] }) {
  const pathname = usePathname();
  const at = items.findIndex((it) => it.href === pathname);
  return (
    <button type="button" className="rb-pages" popoverTarget={DRAWER_ID} title={`All ${title.toLowerCase()}`}>
      <PanelLeftOpen size={16} aria-hidden />
      <span className="rb-pages-label">{title}</span>
      {at >= 0 && (
        <span className="rb-pages-n">
          <span className="sr-only">, page </span>
          {at + 1}
          <span aria-hidden>/</span>
          <span className="sr-only"> of </span>
          {items.length}
        </span>
      )}
    </button>
  );
}

export function PageDrawer({
  title,
  items,
  prev,
  next,
}: {
  title: string;
  items: DrawerItem[];
  prev?: { href: string; title: string };
  next?: { href: string; title: string };
}) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const done = useProgress((s) => s.done);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => hide(ref.current);

  // Opening moves focus to the page you're on, so Tab and Enter work from there.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState !== "open") return;
      const here = el.querySelector<HTMLElement>("[aria-current=page]") ?? el.querySelector<HTMLElement>("a, button");
      here?.focus({ preventScroll: true });
      here?.scrollIntoView({ block: "nearest" });
    };
    el.addEventListener("toggle", onToggle);
    return () => el.removeEventListener("toggle", onToggle);
  }, []);

  // A transient panel: never still open after moving to another page.
  useEffect(() => {
    const el = ref.current;
    return () => hide(el);
  }, [pathname]);

  return (
    <div ref={ref} id={DRAWER_ID} popover="auto" className="page-drawer no-print" role="dialog" aria-labelledby="page-drawer-title">
      <div className="pd-head">
        <h2 id="page-drawer-title">{title}</h2>
        <button type="button" className="icon-btn" popoverTarget={DRAWER_ID} popoverTargetAction="hide" aria-label="Close">
          <X size={18} aria-hidden />
        </button>
      </div>
      <nav aria-labelledby="page-drawer-title">
        <ol className="pd-list">
          {items.map((it, i) => {
            const here = pathname === it.href;
            const ticked = hydrated && !!done[it.href];
            return (
              <li key={it.href}>
                <Link href={it.href} aria-current={here ? "page" : undefined} onNavigate={close}>
                  <span className="dot-n" data-done={ticked}>
                    {ticked ? <Check size={12} strokeWidth={3} aria-label="Completed" /> : i + 1}
                  </span>
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
      {(prev || next) && (
        <div className="pd-foot">
          {prev ? (
            <Link href={prev.href} className="btn btn-sm" onNavigate={close}>
              <ArrowLeft size={14} aria-hidden /> Previous
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={next.href} className="btn btn-sm btn-primary" onNavigate={close}>
              Next <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
