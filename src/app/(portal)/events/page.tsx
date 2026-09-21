'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { Alert, Badge, Card, EmptyState, PageHeader, Pagination, Progress, Segmented, Skeleton } from '@/components/ui';
import { withQuery } from '@/lib/api';
import { activityType, dateRange, EVENT_PHASE, pct, plural } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { intlLocale, useT } from '@/lib/i18n';
import type { EventRow, Paged } from '@/lib/types';

const PAGE_SIZE = 24;
type Phase = 'UPCOMING' | 'LIVE' | 'ENDED';

export default function EventsPage() {
  const t = useT();
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
      <PageHeader title={t('ev_title')} subtitle={t('ev_subtitle')} />
      {error ? <Alert>{error}</Alert> : null}

      <Card flush>
        <div className="toolbar">
          <Segmented<Phase>
            value={phase}
            onChange={setPhase}
            options={[
              { value: 'UPCOMING', label: t('phase_upcoming') },
              { value: 'LIVE', label: t('phase_live') },
              { value: 'ENDED', label: t('ev_past') },
            ]}
          />
          <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label={t('ev_type_label')}>
            <option value="">{t('act_all_types')}</option>
            <option value="MEETING">{t('activity_MEETING')}</option>
            <option value="GRIHA_SAMPARK">{t('activity_GRIHA_SAMPARK')}</option>
            <option value="PUBLIC_PROGRAMME">{t('activity_PUBLIC_PROGRAMME')}</option>
            <option value="TRAINING">{t('activity_TRAINING')}</option>
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
            title={phase === 'LIVE' ? t('ev_empty_live') : phase === 'UPCOMING' ? t('ev_empty_upcoming') : t('ev_empty_past')}
            text={t('ev_empty_sub')}
          />
        ) : (
          <div className="event-grid">
            {rows.map((row) => {
              const badge = EVENT_PHASE()[row.phase];
              const start = new Date(row.startsAt);
              const rate = pct(row.checkedIn, row.joined);
              return (
                <Link key={row.id} href={`/events/${row.id}`} className="event-card">
                  <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                    <span className="event-date">
                      <small>{start.toLocaleDateString(intlLocale(), { month: 'short' }).toUpperCase()}</small>
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
                  <div className="event-meta">
                    <span className="event-meta-icon"><Icon.Clock /></span>
                    <span className="truncate">{dateRange(row.startsAt, row.endsAt)}</span>
                    <span className="event-meta-icon"><Icon.Pin /></span>
                    <span className="event-meta-wrap">{row.venue}</span>
                    <span className="event-meta-icon"><Icon.Users /></span>
                    <span className="truncate">
                      {row.hostName} · {row.hostPost}
                    </span>
                  </div>
                  <div>
                    <div className="between small" style={{ marginBottom: 6 }}>
                      <span>
                        <b className="num">{row.checkedIn}</b> <span className="muted">{t('ev_of')}</span>{' '}
                        <b className="num">{row.joined}</b> <span className="muted">{t('ev_checked_in_label')}</span>
                      </span>
                      <span className="num muted">{row.joined ? `${rate}%` : '—'}</span>
                    </div>
                    <Progress value={rate} color={row.phase === 'LIVE' ? 'var(--ok)' : undefined} />
                  </div>
                  {!row.hasLocation ? (
                    <div className="small" style={{ color: 'var(--warn)' }}>
                      {t('ev_venue_not_pinned')}
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
