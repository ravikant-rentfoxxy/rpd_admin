'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Assignee } from '@/lib/types';
import { useT } from '@/lib/i18n';
import { Icon } from './icons';
import { Avatar, Badge } from './ui';

function Workload({ count }: { count: number }) {
  const t = useT();
  return <Badge tone={count === 0 ? 'ok' : count >= 5 ? 'warn' : 'neutral'}>{count === 0 ? t('ps_free') : t('ps_open_count', { n: count })}</Badge>;
}

/** Searchable dropdown for choosing who follows up a grievance. */
export function PersonSelect({
  people,
  value,
  currentId,
  onChange,
  disabled,
}: {
  people: Assignee[];
  value: string;
  currentId?: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const selected = people.find((row) => row.id === value) ?? null;

  const options = useMemo(() => {
    const term = q.trim().toLowerCase();
    return people
      .filter((row) =>
        !term ||
        [row.fullName, row.postLabel, row.membershipNumber, row.assemblyName, row.districtName].some((v) => v?.toLowerCase().includes(term)),
      )
      .sort((a, b) => b.rank - a.rank || a.openAssigned - b.openAssigned || a.fullName.localeCompare(b.fullName));
  }, [people, q]);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex((row) => row.id === value)));
    search.current?.focus();
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
    // Only when the menu opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function choose(id: string) {
    onChange(id);
    setOpen(false);
    setQ('');
  }

  function onKey(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter' && options[active]) {
      event.preventDefault();
      choose(options[active].id);
    }
  }

  return (
    <div className="combo" ref={root} onKeyDown={open ? onKey : undefined}>
      <button
        type="button"
        className={`combo-trigger ${open ? 'open' : ''}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {selected ? (
          <>
            <Avatar name={selected.fullName} url={selected.photoUrl} size={30} />
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="cell-main truncate" style={{ display: 'block' }}>
                {selected.fullName}
              </span>
              <span className="cell-sub truncate" style={{ display: 'block' }}>
                {selected.postLabel}
                {selected.assemblyName || selected.districtName ? ` · ${selected.assemblyName ?? selected.districtName}` : ''}
              </span>
            </span>
            <Workload count={selected.openAssigned} />
          </>
        ) : (
          <span className="grow muted">{t('ps_select_person', { n: people.length })}</span>
        )}
        <span className="combo-chevron">
          <Icon.ChevronRight />
        </span>
      </button>

      {open ? (
        <div className="combo-menu" role="listbox">
          <div className="combo-search">
            <Icon.Search />
            <input ref={search} value={q} placeholder={t('ps_search')} onChange={(e) => { setQ(e.target.value); setActive(0); }} />
          </div>
          <div className="combo-options">
            {options.length === 0 ? (
              <div className="muted small" style={{ padding: '10px 12px' }}>
                {t('ps_no_match', { q })}
              </div>
            ) : (
              options.map((row, index) => (
                <button
                  key={row.id}
                  type="button"
                  role="option"
                  aria-selected={row.id === value}
                  className={`combo-option ${index === active ? 'active' : ''} ${row.id === value ? 'selected' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(row.id)}
                >
                  <Avatar name={row.fullName} url={row.photoUrl} size={30} />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <span className="cell-main truncate">{row.fullName}</span>
                      {row.id === currentId ? <Badge tone="accent">{t('ps_current')}</Badge> : null}
                    </span>
                    <span className="cell-sub truncate" style={{ display: 'block' }}>
                      {row.postLabel}
                      {row.membershipNumber ? ` · ${row.membershipNumber}` : ''}
                      {row.assemblyName || row.districtName ? ` · ${row.assemblyName ?? row.districtName}` : ''}
                    </span>
                  </span>
                  <Workload count={row.openAssigned} />
                  {row.id === value ? (
                    <span style={{ width: 16, color: 'var(--brand-mid)', flex: 'none' }}>
                      <Icon.Check />
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
