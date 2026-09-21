'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { withQuery } from '@/lib/api';
import { ago, bandLabel, bandTone, num } from '@/lib/format';
import { useApi, useDebounced } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
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
  const t = useT();
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
              { value: 'OPEN', label: openCount === null ? t('gr_open') : t('gr_open_count', { n: num(openCount) }) },
              { value: 'RESOLVED', label: t('gr_resolved') },
              { value: 'ALL', label: t('gr_all') },
            ]}
          />
          {!mine ? (
            <select className="select" value={assigned} onChange={(e) => setAssigned(e.target.value as AssignFilter)} aria-label={t('gr_assignment')}>
              <option value="all">{t('gr_assigned_or_not')}</option>
              <option value="no">{t('gr_unassigned')}</option>
              <option value="yes">{t('gr_assigned')}</option>
            </select>
          ) : null}
          <SearchInput value={q} onChange={setQ} placeholder={t('gr_search')} />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('col_issue')}</th>
                <th>{t('col_place')}</th>
                <th>{mine ? t('col_assigned_by') : t('col_assigned_to')}</th>
                <th>{t('col_status')}</th>
                <th>{mine ? t('col_assigned') : t('col_raised')}</th>
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
                          <div className="cell-sub clamp-2">{row.description || (row.subIssueName ? row.issueName : t('gr_no_description'))}</div>
                        </div>
                      </div>
                    </td>
                    <td className="cell-sub">{row.regionLabel ?? '—'}</td>
                    <td>
                      {mine || row.isAssignedToMe ? (
                        <span className="cell-sub">
                          {mine ? '' : t('gr_you_by')}
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
                        <Badge tone="warn">{t('gr_unassigned')}</Badge>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{row.status === 'RESOLVED' ? <Badge tone="ok">{t('gr_resolved')}</Badge> : <Badge tone="accent" dot>{t('gr_open')}</Badge>}</td>
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
                  ? t('gr_empty_mine_open')
                  : t('gr_empty_nothing')
                : status === 'OPEN'
                  ? t('gr_empty_open')
                  : t('gr_empty_nothing')
            }
            text={
              mine
                ? t('gr_empty_mine_sub')
                : status === 'OPEN'
                  ? t('gr_empty_open_sub')
                  : t('gr_empty_filter_sub')
            }
          />
        ) : null}
        {data ? <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} /> : null}
      </Card>
    </>
  );
}
