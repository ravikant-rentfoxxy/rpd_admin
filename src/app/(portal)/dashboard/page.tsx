'use client';

import Link from 'next/link';
import { ActivityMix, TrendChart } from '@/components/charts';
import { Icon } from '@/components/icons';
import { useSession } from '@/components/session';
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Skeleton, StatCard } from '@/components/ui';
import { ACTIVITY_COLORS, ACTIVITY_STATUS, AREA_LEVEL, activityType, ago, dateRange, EVENT_PHASE, num, pct, plural } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { Overview } from '@/lib/types';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const me = useSession();
  const { data, error, loading, reload } = useApi<Overview>('/admin/overview');
  const firstName = (me.member.fullName || 'Officer').split(' ')[0];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={`Here is what is happening across ${me.area.name} (${AREA_LEVEL[me.area.level] ?? me.area.level}).`}
        actions={
          <Button icon={<Icon.Refresh />} onClick={reload} loading={loading && Boolean(data)}>
            Refresh
          </Button>
        }
      />

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid-stats">
        <StatCard
          label="Members"
          icon={<Icon.Users />}
          tone="brand"
          href="/members"
          loading={!data}
          value={num(data?.members.total)}
          hint={data ? `${num(data.members.newThisMonth)} joined this month · ${pct(data.members.verified, data.members.total)}% verified` : ' '}
        />
        <StatCard
          label="Awaiting review"
          icon={<Icon.CheckShield />}
          tone={data && data.activities.awaitingReview > 0 ? 'warn' : 'ok'}
          href="/verification"
          loading={!data}
          value={num(data?.activities.awaitingReview)}
          hint={data ? `${plural(data.activities.last30Days, 'activity', 'activities')} in the last 30 days` : ' '}
        />
        <StatCard
          label="Open grievances"
          icon={<Icon.Megaphone />}
          tone={data && data.grievances.unassigned > 0 ? 'bad' : 'accent'}
          href="/grievances"
          loading={!data}
          value={num(data?.grievances.open)}
          hint={data ? `${num(data.grievances.unassigned)} unassigned · ${num(data.grievances.resolvedThisMonth)} resolved this month` : ' '}
        />
        <StatCard
          label="Events"
          icon={<Icon.Calendar />}
          tone="ok"
          href="/events"
          loading={!data}
          value={num((data?.events.live ?? 0) + (data?.events.upcoming ?? 0))}
          hint={data ? `${num(data.events.live)} live now · ${plural(data.events.checkInsThisMonth, 'check-in')} this month` : ' '}
        />
      </div>

      <div className="grid-main">
        <Card title="Activity trend" subtitle="Last 30 days in your area">
          {data ? <TrendChart points={data.trend} /> : <Skeleton height={220} />}
        </Card>
        <Card title="Activity mix" subtitle="Share of activities, last 30 days">
          {!data ? (
            <div className="stack">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : data.activityMix.length ? (
            <ActivityMix rows={data.activityMix} />
          ) : (
            <EmptyState icon={<Icon.Activity />} title="No activity yet" text="Recorded activities will show here." />
          )}
        </Card>
      </div>

      <div className="grid-2 mt">
        <Card
          title="Recent activities"
          flush
          action={
            <Link href="/activities" className="link small">
              View all
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
                const status = ACTIVITY_STATUS[row.status];
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
            <EmptyState icon={<Icon.Activity />} title="No activities yet" />
          )}
        </Card>

        <Card
          title="Upcoming events"
          flush
          action={
            <Link href="/events" className="link small">
              View all
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
                const phase = EVENT_PHASE[row.phase];
                const start = new Date(row.startsAt);
                return (
                  <li key={row.id}>
                    <Link href={`/events/${row.id}`} className="list-item">
                      <span className="event-date">
                        <small>{start.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</small>
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
                        <div className="cell-sub num">{row.joined} joined</div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<Icon.Calendar />} title="No upcoming events" text="Events created in the app appear here." />
          )}
        </Card>
      </div>
    </>
  );
}
