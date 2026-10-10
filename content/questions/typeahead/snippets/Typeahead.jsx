// Typeahead.jsx: WAI-ARIA combobox with a listbox popup
import { useId, useState } from 'react';
import { useTypeahead } from './useTypeahead.js';
import { Highlight } from './Highlight.jsx';

export function Typeahead({ fetchSuggestions, onSelect, label = 'Search' }) {
  const { query, setQuery, status, items } = useTypeahead(fetchSuggestions);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const id = useId();
  const expanded = open && items.length > 0;

  const choose = item => { onSelect(item); setQuery(item.label); setOpen(false); setActive(-1); };
  const onKeyDown = e => {
    if (e.nativeEvent.isComposing) return;                           // IME: let the user finish composing
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && expanded && active >= 0) { e.preventDefault(); choose(items[active]); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
  };

  return (
    <div className="typeahead">
      <label htmlFor={`${id}-input`}>{label}</label>
      <input id={`${id}-input`} role="combobox" aria-expanded={expanded} aria-controls={`${id}-list`}
        aria-autocomplete="list" aria-activedescendant={expanded && active >= 0 ? `${id}-opt-${active}` : undefined}
        value={query} autoComplete="off" enterKeyHint="search"
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={onKeyDown} onBlur={() => setOpen(false)} />
      <ul id={`${id}-list`} role="listbox" hidden={!expanded}>
        {items.map((item, i) => (
          <li key={item.id} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}
            onMouseDown={e => e.preventDefault()}                     // keep focus in the input
            onClick={() => choose(item)}>
            <Highlight text={item.label} query={query} />
          </li>
        ))}
      </ul>
      <div aria-live="polite" className="sr-only">
        {status === 'error' ? 'Suggestions unavailable' : expanded ? `${items.length} suggestions` : ''}
      </div>
    </div>
  );
}
