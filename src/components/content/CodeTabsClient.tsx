"use client";
import { useId, useState } from "react";
import { CopyButton } from "./CopyButton";

export function CodeTabsClient({ tabs }: { tabs: { name: string; html: string; raw: string }[] }) {
  const [active, setActive] = useState(0);
  const uid = useId();
  return (
    <div className="code-block code-tabs">
      <div role="tablist" aria-label="Code files">
        {tabs.map((t, i) => (
          <button
            key={t.name}
            role="tab"
            id={`${uid}-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`${uid}-panel-${i}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") setActive((active + 1) % tabs.length);
              if (e.key === "ArrowLeft") setActive((active - 1 + tabs.length) % tabs.length);
            }}
          >
            {t.name}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.name} role="tabpanel" id={`${uid}-panel-${i}`} aria-labelledby={`${uid}-tab-${i}`} hidden={i !== active}>
          <div dangerouslySetInnerHTML={{ __html: t.html }} />
        </div>
      ))}
      <CopyButton text={tabs[active].raw} />
    </div>
  );
}
