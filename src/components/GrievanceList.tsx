'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { withQuery } from '@/lib/api';
import { ago, bandLabel, bandTone, num } from '@/lib/format';
import { useApi, useDebounced } from '@/lib/hooks';
import type { Grievance, Paged } from '@/lib/types';
import { Icon } from './icons';
import { Alert, Avatar, Badge, Card, EmptyState, Pagination, SearchInput, Segmented, TableSkeleton } from './ui';

const PAGE_SIZE = 20;

type StatusFilter = 'OPEN' | 'RESOLVED' | 'ALL';
type AssignFilter = 'all' | 'no' | 'yes';

function MediaIcon({ type }: { type: string }) {
  if (type === 'video') return <Icon.Video />;
  if (type === 'audio') return <Icon.Mic />;
  return <Icon.Image />;
}

/** Grievance table. With `mine`, it lists only grievances handed to the signed-in officer. */
export function GrievanceList({ mine }: { mine?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>('OPEN');
  const [assigned, setAssigned] = useState<AssignFilter>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);

  useEffect(() => setPage(1), [status, assigned, search]);

  const { data, error, loading } = useApi<Paged & { open: number; mineOpen: number; posts: Grievance[] }>(
    withQuery('/admin/region-posts', {
      mine: mine ? 1 : '',
      status: status === 'ALL' ? '' : status,
      assigned: mine || assigned === 'all' ? '' : assigned,
      q: search,
      page,
      limit: PAGE_SIZE,
    }),
  );
  const rows = data?.posts ?? [];
  const openCount = data ? (mine ? data.mineOpen : data.open) : null;

  return (
    <>
      {error ? <Alert>{error}</Alert> : null}
      <Card flush>
        <div className="toolbar">
          <Segmented<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { value: 'OPEN', label: `Open${openCount === null ? '' : ` · ${num(openCount)}`}` },
              { value: 'RESOLVED', label: 'Resolved' },
              { value: 'ALL', label: 'All' },
            ]}
          />
          {!mine ? (
            <select className="select" value={assigned} onChange={(e) => setAssigned(e.target.value as AssignFilter)} aria-label="Assignment">
              <option value="all">Assigned or not</option>
              <option value="no">Unassigned</option>
              <option value="yes">Assigned</option>
            </select>
          ) : null}
          <SearchInput value={q} onChange={setQ} placeholder="Search issue, place or description" />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Place</th>
                <th>{mine ? 'Assigned by' : 'Assigned to'}</th>
                <th>Status</th>
                <th>{mine ? 'Assigned' : 'Raised'}</th>
              </tr>
            </thead>
            {!data && loading ? (
              <TableSkeleton cols={5} />
            ) : (
              <tbody>
                {rows.map((row) => (
                  <tr key={row.serverId} className="clickable" onClick={() => router.push(`/grievances/${row.serverId}`)}>
                    <td style={{ maxWidth: 380 }}>
                      <div className="who" style={{ alignItems: 'flex-start' }}>
                        {row.thumbnailUrl || (row.mediaType === 'image' && row.mediaUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="thumb" src={row.thumbnailUrl ?? row.mediaUrl ?? ''} alt="" loading="lazy" />
                        ) : (
                          <span className="thumb">
                            <MediaIcon type={row.mediaType} />
                          </span>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div className="row" style={{ gap: 6 }}>
                            <span className="cell-main">{row.subIssueName ?? row.issueName}</span>
                            <Badge tone={bandTone(row.issueBand)}>{bandLabel(row.issueBand)}</Badge>
                          </div>
                          <div className="cell-sub clamp-2">{row.description || (row.subIssueName ? row.issueName : 'No description')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="cell-sub">{row.regionLabel ?? '—'}</td>
                    <td>
                      {mine || row.isAssignedToMe ? (
                        <span className="cell-sub">
                          {mine ? '' : 'You · by '}
                          {row.assignedByName ?? '—'}
                        </span>
                      ) : row.assigneeName ? (
                        <div className="who">
                          <Avatar name={row.assigneeName} size={28} />
                          <div style={{ minWidth: 0 }}>
                            <div className="cell-main truncate" style={{ fontWeight: 550 }}>
                              {row.assigneeName}
                            </div>
                            <div className="cell-sub">{row.assigneePostLabel}</div>
                          </div>
                        </div>
                      ) : row.status === 'OPEN' ? (
                        <Badge tone="warn">Unassigned</Badge>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{row.status === 'RESOLVED' ? <Badge tone="ok">Resolved</Badge> : <Badge tone="accent" dot>Open</Badge>}</td>
                    <td className="cell-sub nowrap">{ago(mine ? row.assignedAt ?? row.createdAt : row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {data && rows.length === 0 ? (
          <EmptyState
            icon={<Icon.Megaphone />}
            title={
              mine
                ? status === 'OPEN'
                  ? 'Nothing assigned to you'
                  : 'Nothing to show'
                : status === 'OPEN'
                  ? 'No open grievances'
                  : 'Nothing to show'
            }
            text={
              mine
                ? 'Grievances handed to you by a senior office bearer appear here.'
                : status === 'OPEN'
                  ? 'Every grievance in your area has been handled.'
                  : 'Try another filter.'
            }
          />
        ) : null}
        {data ? <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} /> : null}
      </Card>
    </>
  );
}
