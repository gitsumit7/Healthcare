import { useEffect, useId, useMemo, useRef, useState } from 'react';

const MAX_SHOWN = 200;

/**
 * Text input with a filterable dropdown: type any city, or open the list (▾) and pick one.
 * `options` is [{ value, hint? }]; `onChange(value)` fires on every keystroke and on selection.
 */
export default function CityInput({ value, onChange, options, placeholder = 'Type or choose a city', disabled, required, name, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [typed, setTyped] = useState(false); // filter only after the user types, so ▾ shows the full list
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const matches = useMemo(() => {
    const q = typed ? String(value || '').trim().toLowerCase() : '';
    if (!q) return options;
    const starts = [];
    const contains = [];
    for (const o of options) {
      const v = o.value.toLowerCase();
      if (v.startsWith(q)) starts.push(o);
      else if (v.includes(q)) contains.push(o);
    }
    return [...starts, ...contains];
  }, [options, value, typed]);
  const shown = matches.slice(0, MAX_SHOWN);

  useEffect(() => {
    const close = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (open && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (v) => {
    onChange(v);
    setTyped(false);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && active >= 0 && shown[active]) {
      e.preventDefault();
      choose(shown[active].value);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`city-input ${disabled ? 'disabled' : ''}`} ref={wrapRef}>
      <input
        name={name}
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value);
          setTyped(true);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={80}
        autoComplete="off"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      />
      {value && !disabled && (
        <button type="button" className="city-clear" onClick={() => choose('')} aria-label="Clear city" tabIndex={-1}>
          ×
        </button>
      )}
      <button
        type="button"
        className="city-toggle"
        onClick={() => {
          setTyped(false);
          setOpen((o) => !o);
        }}
        disabled={disabled}
        aria-label="Show all cities"
        tabIndex={-1}
      >
        ▾
      </button>
      {open && !disabled && (
        <ul className="city-list" id={listId} role="listbox" ref={listRef}>
          {shown.length === 0 ? (
            <li className="city-empty">No match — “{value}” will be used as typed</li>
          ) : (
            shown.map((o, i) => (
              <li
                key={`${o.value}|${o.hint || ''}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`${i === active ? 'active' : ''} ${o.value.toLowerCase() === String(value || '').toLowerCase() ? 'selected' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o.value)}
                onMouseEnter={() => setActive(i)}
              >
                <span>{o.value}</span>
                {o.hint && <span className="city-hint">{o.hint}</span>}
              </li>
            ))
          )}
          {matches.length > MAX_SHOWN && <li className="city-empty">Keep typing to narrow {matches.length} cities…</li>}
        </ul>
      )}
    </div>
  );
}
