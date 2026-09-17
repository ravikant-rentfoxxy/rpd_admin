'use client';

import { useEffect, useState } from 'react';
import { ActivityDrawer } from '@/components/ActivityDrawer';
import { Icon } from '@/components/icons';
import { Alert, Badge, Card, EmptyState, PageHeader, Pagination, SearchInput, TableSkeleton } from '@/components/ui';
import { withQuery } from '@/lib/api';
import { ACTIVITY_COLORS, ACTIVITY_STATUS, ACTIVITY_TYPES, activityType, dash, plural, when } from '@/lib/format';
import { useApi, useDebounced } from '@/lib/hooks';
import type { ActivityRow, Paged } from '@/lib/types';

const PAGE_SIZE = 25;

export default function ActivitiesPage() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const search = useDebounced(q);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('open');
    if (id) setOpenId(id);
  }, []);

  useEffect(() => setPage(1), [search, type, status, from, to]);

  const path = withQuery('/admin/activities', {
    q: search,
    type,
    status,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : '',
    to: to ? new Date(`${to}T23:59:59`).toISOString() : '',
    page,
    limit: PAGE_SIZE,
  });
  const { data, error, loading, reload } = useApi<Paged & { activities: ActivityRow[] }>(path);
  const rows = data?.activities ?? [];
  const filtered = Boolean(search || type || status || from || to);

  return (
    <>
      <PageHeader title="Activities" subtitle="Every activity recorded by members in your area." />
      {error ? <Alert>{error}</Alert> : null}

      <Card flush>
        <div className="toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search member, membership no. or notes" />
          <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Activity type">
            <option value="">All types</option>
            {Object.entries(ACTIVITY_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option>
            <option value="AWAITING">Awaiting review</option>
            <option value="VERIFIED">Verified</option>
            <option value="NOT_VERIFIED">Rejected</option>
            <option value="APPEALED">Appealed</option>
          </select>
          <input className="input" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <input className="input" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          {data ? <span className="muted small num" style={{ marginLeft: 'auto' }}>{plural(data.total, 'activity', 'activities')}</span> : null}
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Member</th>
                <th>Booth</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
            </thead>
            {!data && loading ? (
              <TableSkeleton cols={5} />
            ) : (
              <tbody>
                {rows.map((row) => {
                  const badge = ACTIVITY_STATUS[row.status];
                  const color = ACTIVITY_COLORS[row.type] ?? '#9a94a6';
                  const details = [
                    row.attendeeCount ? plural(row.attendeeCount, 'attendee') : '',
                    row.homesCovered ? plural(row.homesCovered, 'home') : '',
                    row.photoCount ? `${row.photoCount} photo${row.photoCount === 1 ? '' : 's'}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <tr key={row.id} className="clickable" onClick={() => setOpenId(row.id)}>
                      <td>
                        <div className="who">
                          <span className="list-icon" style={{ background: `${color}1a`, color }}>
                            <Icon.Activity />
                          </span>
                          <div>
                            <div className="cell-main">{activityType(row.type)}</div>
                            <div className="cell-sub nowrap">{when(row.occurredAt)}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-main">{row.actorName}</div>
                        <div className="cell-sub">{dash(row.actorNumber)}</div>
                      </td>
                      <td>{row.boothName ? <span className="nowrap">{row.boothCode ? `${row.boothCode} · ` : ''}{row.boothName}</span> : <span className="muted">—</span>}</td>
                      <td className="cell-sub">
                        {details || '—'}
                        {row.reviewFlag ? (
                          <span title="Flagged for review" style={{ color: 'var(--warn)', marginLeft: 6, verticalAlign: -3, display: 'inline-block', width: 15 }}>
                            <Icon.Flag />
                          </span>
                        ) : null}
                      </td>
                      <td>{badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : row.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>
        {data && rows.length === 0 ? (
          <EmptyState
            icon={<Icon.Activity />}
            title={filtered ? 'No activities match these filters' : 'No activities yet'}
            text={filtered ? 'Try widening the date range or clearing a filter.' : 'Activities recorded in the RPD app will appear here.'}
          />
        ) : null}
        {data ? <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} /> : null}
      </Card>

      <ActivityDrawer activityId={openId} onClose={() => setOpenId(null)} onReviewed={reload} />
    </>
  );
}
