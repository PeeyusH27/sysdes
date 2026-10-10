/** Every chart has a table twin, so a tooltip is never the only way to read a value. */
export function ChartTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="chart-table">
      <summary>Show data table</summary>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, k) => (k === 0 ? <th key={k} scope="row">{c}</th> : <td key={k}>{c}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Value first (strong), label second; positioned as a fraction of the chart width. */
export function ChartTooltip({ at, rows, title }: { at: number; title?: string; rows: { value: string; label: string; color?: string }[] }) {
  return (
    <div className="chart-tooltip" style={{ left: `${Math.min(Math.max(at * 100, 12), 88)}%` }} role="status">
      {title && <div className="tt-title">{title}</div>}
      {rows.map((r, i) => (
        <div key={i} className="tt-row">
          {r.color && <span className="tt-key" style={{ background: r.color }} aria-hidden />}
          <strong>{r.value}</strong> <span>{r.label}</span>
        </div>
      ))}
    </div>
  );
}

export function StatTiles({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  return (
    <div className="stat-tiles">
      {items.map((it) => (
        <div key={it.label} className="stat-tile">
          <div className="stat-label">{it.label}</div>
          <div className="stat-value">{it.value}</div>
          {it.sub && <div className="stat-sub">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}
