"use client";

// Reusable popover-based filter widgets for the concepts page.
//
// SingleSelectPopover — one choice at a time (like the Results filter).
// MultiSelectPopover — many choices (like Category / Shown to).
//
// Each opens a popover with:
//   - a search input at the top
//   - a scrollable list of options below
//   - "All" / "Clear" button to reset
//
// The trigger button shows either the selected label or a placeholder,
// plus a count badge when something is selected.

import { useEffect, useRef, useState } from "react";

type Option = {
  value: string;
  label: string;
  // Optional sub-label rendered as smaller text under the label
  hint?: string;
};

function useOutsideClick(
  open: boolean,
  onClose: () => void,
  ref: React.RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, onClose, ref]);
}

export function SingleSelectPopover({
  label,
  options,
  value,
  onChange,
  allowClear = false,
  placeholder = "Any",
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (next: string) => void;
  allowClear?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(open, () => setOpen(false), ref);

  const selected = options.find((o) => o.value === value);
  const filtered = search.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.hint?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : options;

  return (
    <div className="relative" ref={ref}>
      <FilterTrigger
        label={label}
        active={value !== "" && value !== "_all_"}
        count={value && value !== "_all_" ? 1 : 0}
        onClick={() => setOpen((v) => !v)}
        summary={selected?.label ?? placeholder}
      />
      {open && (
        <Popover onClose={() => setOpen(false)}>
          <FilterSearch value={search} onChange={setSearch} />
          <OptionList>
            {allowClear && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-50"
                >
                  {placeholder}
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-zinc-400">
                No matches
              </li>
            ) : (
              filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-zinc-50 ${
                      value === o.value
                        ? "bg-brand-wine/5 font-semibold text-brand-wine"
                        : "text-zinc-700"
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {value === o.value && <span className="text-xs">✓</span>}
                  </button>
                </li>
              ))
            )}
          </OptionList>
        </Popover>
      )}
    </div>
  );
}

export function MultiSelectPopover({
  label,
  options,
  value,
  onChange,
  placeholder = "Any",
}: {
  label: string;
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(open, () => setOpen(false), ref);

  const filtered = search.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.hint?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : options;

  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  }

  const selectedCount = value.length;
  const summary =
    selectedCount === 0
      ? placeholder
      : selectedCount === 1
        ? options.find((o) => o.value === value[0])?.label ?? "1 selected"
        : `${selectedCount} selected`;

  return (
    <div className="relative" ref={ref}>
      <FilterTrigger
        label={label}
        active={selectedCount > 0}
        count={selectedCount}
        onClick={() => setOpen((v) => !v)}
        summary={summary}
      />
      {open && (
        <Popover onClose={() => setOpen(false)}>
          <FilterSearch value={search} onChange={setSearch} />
          {selectedCount > 0 && (
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-xs">
              <span className="text-zinc-500">
                {selectedCount} selected
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="font-medium text-brand-wine hover:underline"
              >
                Clear
              </button>
            </div>
          )}
          <OptionList>
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-zinc-400">
                No matches
              </li>
            ) : (
              filtered.map((o) => {
                const checked = value.includes(o.value);
                return (
                  <li key={o.value}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(o.value)}
                        className="h-4 w-4 rounded border-zinc-300 text-brand-wine focus:ring-brand-wine"
                      />
                      <span
                        className={`truncate ${
                          checked ? "font-semibold text-zinc-900" : "text-zinc-700"
                        }`}
                      >
                        {o.label}
                      </span>
                      {o.hint && (
                        <span className="ml-auto text-xs text-zinc-400">
                          {o.hint}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })
            )}
          </OptionList>
        </Popover>
      )}
    </div>
  );
}

function FilterTrigger({
  label,
  active,
  count,
  onClick,
  summary,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
  summary: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`mt-1 inline-flex min-w-[160px] items-center gap-2 rounded-md border px-3 py-1.5 text-left text-sm transition ${
          active
            ? "border-brand-wine bg-white text-brand-wine"
            : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        <span className="flex-1 truncate">{summary}</span>
        {count > 0 && (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-wine px-1.5 text-xs font-bold text-white">
            {count}
          </span>
        )}
        <span className="text-zinc-400">▾</span>
      </button>
    </div>
  );
}

function Popover({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-0 shadow-lg">
      {children}
    </div>
  );
}

function FilterSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="border-b border-zinc-100 p-2">
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search…"
        className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm focus:border-brand-wine focus:bg-white focus:outline-none"
      />
    </div>
  );
}

function OptionList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="max-h-72 overflow-y-auto py-1">{children}</ul>
  );
}