'use client';

import Link from 'next/link';
import { ActivityMix, TrendChart } from '@/components/charts';
import { Icon } from '@/components/icons';
import { useSession } from '@/components/session';
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Skeleton, StatCard } from '@/components/ui';
import { ACTIVITY_COLORS, ACTIVITY_STATUS, AREA_LEVEL, activityType, ago, dateRange, EVENT_PHASE, num, pct, plural } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { intlLocale, useT } from '@/lib/i18n';
import type { Overview } from '@/lib/types';

function greetingKey() {
  const hour = new Date().getHours();
  if (hour < 12) return 'good_morning';
  if (hour < 17) return 'good_afternoon';
  return 'good_evening';
}

export default function DashboardPage() {
  const t = useT();
  const me = useSession();
  const { data, error, loading, reload } = useApi<Overview>('/admin/overview');
  const firstName = (me.member.fullName || t('officer')).split(' ')[0] ?? '';

  return (
    <>
      <PageHeader
        title={t('greeting_name', { greeting: t(greetingKey()), name: firstName })}
        subtitle={t('dash_subtitle', { area: me.area.name, level: AREA_LEVEL()[me.area.level] ?? me.area.level })}
        actions={
          <Button icon={<Icon.Refresh />} onClick={reload} loading={loading && Boolean(data)}>
            {t('refresh')}
          </Button>
        }
      />

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid-stats">
        <StatCard
          label={t('stat_members')}
          icon={<Icon.Users />}
          tone="brand"
          href="/members"
          loading={!data}
          value={num(data?.members.total)}
          hint={data ? t('stat_members_hint', { n: num(data.members.newThisMonth), pct: pct(data.members.verified, data.members.total) }) : ' '}
        />
        <StatCard
          label={t('stat_awaiting_review')}
          icon={<Icon.CheckShield />}
          tone={data && data.activities.awaitingReview > 0 ? 'warn' : 'ok'}
          href="/verification"
          loading={!data}
          value={num(data?.activities.awaitingReview)}
          hint={data ? t('stat_awaiting_hint', { count: plural(data.activities.last30Days, 'activity') }) : ' '}
        />
        <StatCard
          label={t('stat_open_grievances')}
          icon={<Icon.Megaphone />}
          tone={data && data.grievances.unassigned > 0 ? 'bad' : 'accent'}
          href="/grievances"
          loading={!data}
          value={num(data?.grievances.open)}
          hint={data ? t('stat_grievances_hint', { unassigned: num(data.grievances.unassigned), resolved: num(data.grievances.resolvedThisMonth) }) : ' '}
        />
        <StatCard
          label={t('stat_events')}
          icon={<Icon.Calendar />}
          tone="ok"
          href="/events"
          loading={!data}
          value={num((data?.events.live ?? 0) + (data?.events.upcoming ?? 0))}
          hint={data ? t('stat_events_hint', { live: num(data.events.live), checkins: plural(data.events.checkInsThisMonth, 'checkin') }) : ' '}
        />
      </div>

      <div className="grid-main">
        <Card title={t('card_activity_trend')} subtitle={t('card_activity_trend_sub')}>
          {data ? <TrendChart points={data.trend} /> : <Skeleton height={220} />}
        </Card>
        <Card title={t('card_activity_mix')} subtitle={t('card_activity_mix_sub')}>
          {!data ? (
            <div className="stack">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : data.activityMix.length ? (
            <ActivityMix rows={data.activityMix} />
          ) : (
            <EmptyState icon={<Icon.Activity />} title={t('empty_no_activity')} text={t('empty_no_activity_sub')} />
          )}
        </Card>
      </div>

      <div className="grid-2 mt">
        <Card
          title={t('card_recent_activities')}
          flush
          action={
            <Link href="/activities" className="link small">
              {t('view_all')}
            </Link>
          }
        >
          {!data ? (
            <div className="card-body stack">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : data.recentActivities.length ? (
            <ul className="list">
              {data.recentActivities.map((row) => {
                const status = ACTIVITY_STATUS()[row.status];
                const color = ACTIVITY_COLORS[row.type] ?? '#9a94a6';
                return (
                  <li key={row.id}>
                    <Link href={`/activities?open=${row.id}`} className="list-item">
                      <span className="list-icon" style={{ background: `${color}1a`, color }}>
                        <Icon.Activity />
                      </span>
                      <div className="grow">
                        <div className="cell-main truncate">
                          {activityType(row.type)} · {row.actorName}
                        </div>
                        <div className="cell-sub truncate">
                          {row.boothName ? `${row.boothName} · ` : ''}
                          {ago(row.occurredAt)}
                        </div>
                      </div>
                      {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<Icon.Activity />} title={t('empty_no_activities')} />
          )}
        </Card>

        <Card
          title={t('card_upcoming_events')}
          flush
          action={
            <Link href="/events" className="link small">
              {t('view_all')}
            </Link>
          }
        >
          {!data ? (
            <div className="card-body stack">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : data.upcomingEvents.length ? (
            <ul className="list">
              {data.upcomingEvents.map((row) => {
                const phase = EVENT_PHASE()[row.phase];
                const start = new Date(row.startsAt);
                return (
                  <li key={row.id}>
                    <Link href={`/events/${row.id}`} className="list-item">
                      <span className="event-date">
                        <small>{start.toLocaleDateString(intlLocale(), { month: 'short' }).toUpperCase()}</small>
                        <b className="num">{start.getDate()}</b>
                      </span>
                      <div className="grow">
                        <div className="cell-main truncate">{row.title}</div>
                        <div className="cell-sub truncate">
                          {dateRange(row.startsAt, row.endsAt)} · {row.venue}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {phase ? <Badge tone={phase.tone} dot={row.phase === 'LIVE'}>{phase.label}</Badge> : null}
                        <div className="cell-sub num">{t('n_joined', { n: row.joined })}</div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<Icon.Calendar />} title={t('empty_no_upcoming')} text={t('empty_no_upcoming_sub')} />
          )}
        </Card>
      </div>
    </>
  );
}
