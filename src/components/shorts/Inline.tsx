/** Renders the only inline formatting shorts allow: `code` and **bold** (which may contain `code`). */
export function Inline({ text }: { text: string }) {
  return <>{format(text, true)}</>;
}

function format(text: string, allowBold: boolean): React.ReactNode[] {
  const pattern = allowBold ? /(\*\*[^*]+\*\*|`[^`]+`)/g : /(`[^`]+`)/g;
  return text.split(pattern).map((part, i) => {
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    if (allowBold && part.length > 4 && part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{format(part.slice(2, -2), false)}</strong>;
    return part;
  });
}
