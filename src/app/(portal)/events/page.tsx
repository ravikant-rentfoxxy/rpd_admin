'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { Alert, Badge, Card, EmptyState, PageHeader, Pagination, Progress, Segmented, Skeleton } from '@/components/ui';
import { withQuery } from '@/lib/api';
import { activityType, dateRange, EVENT_PHASE, pct, plural } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { EventRow, Paged } from '@/lib/types';

const PAGE_SIZE = 24;
type Phase = 'UPCOMING' | 'LIVE' | 'ENDED';

export default function EventsPage() {
  const [phase, setPhase] = useState<Phase>('UPCOMING');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [phase, type]);

  const { data, error, loading } = useApi<Paged & { events: EventRow[] }>(
    withQuery('/admin/events', { phase, type, page, limit: PAGE_SIZE }),
  );
  const rows = data?.events ?? [];

  return (
    <>
      <PageHeader title="Events" subtitle="Meetings and programmes hosted in your area, with who joined and who checked in at the venue." />
      {error ? <Alert>{error}</Alert> : null}

      <Card flush>
        <div className="toolbar">
          <Segmented<Phase>
            value={phase}
            onChange={setPhase}
            options={[
              { value: 'UPCOMING', label: 'Upcoming' },
              { value: 'LIVE', label: 'Live now' },
              { value: 'ENDED', label: 'Past' },
            ]}
          />
          <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Event type">
            <option value="">All types</option>
            <option value="MEETING">Meeting</option>
            <option value="GRIHA_SAMPARK">Griha sampark</option>
            <option value="PUBLIC_PROGRAMME">Public programme</option>
            <option value="TRAINING">Training</option>
          </select>
          {data ? <span className="muted small num" style={{ marginLeft: 'auto' }}>{plural(data.total, 'event')}</span> : null}
        </div>

        {!data && loading ? (
          <div className="event-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="event-card">
                <Skeleton height={120} />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Icon.Calendar />}
            title={phase === 'LIVE' ? 'Nothing is live right now' : phase === 'UPCOMING' ? 'No upcoming events' : 'No past events'}
            text="Office bearers create events from the RPD app."
          />
        ) : (
          <div className="event-grid">
            {rows.map((row) => {
              const badge = EVENT_PHASE[row.phase];
              const start = new Date(row.startsAt);
              const rate = pct(row.checkedIn, row.joined);
              return (
                <Link key={row.id} href={`/events/${row.id}`} className="event-card">
                  <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                    <span className="event-date">
                      <small>{start.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</small>
                      <b className="num">{start.getDate()}</b>
                    </span>
                    <div className="grow">
                      <div className="between" style={{ alignItems: 'flex-start' }}>
                        <span className="cell-main clamp-2">{row.title}</span>
                        {badge ? (
                          <Badge tone={badge.tone} dot={row.phase === 'LIVE'}>
                            {badge.label}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="cell-sub">{activityType(row.type)}</div>
                    </div>
                  </div>
                  <div className="cell-sub" style={{ display: 'grid', gap: 3 }}>
                    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <span style={{ width: 14, flex: 'none' }}><Icon.Clock /></span>
                      <span className="truncate">{dateRange(row.startsAt, row.endsAt)}</span>
                    </span>
                    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <span style={{ width: 14, flex: 'none' }}><Icon.Pin /></span>
                      <span className="truncate">{row.venue}</span>
                    </span>
                    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <span style={{ width: 14, flex: 'none' }}><Icon.Users /></span>
                      <span className="truncate">
                        {row.hostName} · {row.hostPost}
                      </span>
                    </span>
                  </div>
                  <div>
                    <div className="between small" style={{ marginBottom: 6 }}>
                      <span>
                        <b className="num">{row.checkedIn}</b> <span className="muted">of</span> <b className="num">{row.joined}</b>{' '}
                        <span className="muted">checked in</span>
                      </span>
                      <span className="num muted">{row.joined ? `${rate}%` : '—'}</span>
                    </div>
                    <Progress value={rate} color={row.phase === 'LIVE' ? 'var(--ok)' : undefined} />
                  </div>
                  {!row.hasLocation ? (
                    <div className="small" style={{ color: 'var(--warn)' }}>
                      Venue not pinned — check-in uses a looked-up address.
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
        {data ? <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} /> : null}
      </Card>
    </>
  );
}
