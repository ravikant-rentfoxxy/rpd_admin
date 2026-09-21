'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  KeyValues,
  PageHeader,
  Segmented,
  Skeleton,
  StatCard,
  useToast,
} from '@/components/ui';
import { api } from '@/lib/api';
import { activityType, dateRange, dash, EVENT_PHASE, mapsUrl, mobile, num, pct, plural, timeOnly, when } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import type { EventDetail } from '@/lib/types';

type Filter = 'all' | 'in' | 'out';

export default function EventDetailPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, error } = useApi<{ event: EventDetail }>(`/admin/events/${params.id}`);
  const [filter, setFilter] = useState<Filter>('all');
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const event = data?.event;

  if (error && !event) {
    return (
      <>
        <PageHeader title={t('ed_event')} back={{ href: '/events', label: t('ev_title') }} />
        <Alert>{error}</Alert>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <PageHeader title={<Skeleton width={260} height={26} />} back={{ href: '/events', label: t('ev_title') }} />
        <div className="grid-stats">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton height={60} />
            </Card>
          ))}
        </div>
      </>
    );
  }

  const badge = EVENT_PHASE()[event.phase];
  const checkedIn = event.attendees.filter((row) => row.checkedInAt).length;
  const map = mapsUrl(event.latitude, event.longitude, event.venue);
  const shown = event.attendees.filter((row) => (filter === 'in' ? row.checkedInAt : filter === 'out' ? !row.checkedInAt : true));
  const distances = event.attendees.map((row) => row.checkInMetres).filter((m): m is number => m != null);
  const avgDistance = distances.length ? Math.round(distances.reduce((a, b) => a + b, 0) / distances.length) : null;

  async function cancel() {
    setBusy(true);
    try {
      await api(`/admin/events/${event!.id}`, { method: 'DELETE' });
      toast(t('toast_event_cancelled'));
      router.replace('/events');
    } catch (err) {
      toast(err instanceof Error ? err.message : t('err_could_not_cancel'), 'bad');
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: '/events', label: t('ev_title') }}
        title={
          <span className="row" style={{ gap: 10 }}>
            {event.title}
            {badge ? (
              <Badge tone={badge.tone} dot={event.phase === 'LIVE'}>
                {badge.label}
              </Badge>
            ) : null}
          </span>
        }
        subtitle={`${activityType(event.type)} · ${dateRange(event.startsAt, event.endsAt)}`}
        actions={
          event.canManage && event.phase !== 'ENDED' ? (
            <Button variant="danger" icon={<Icon.Trash />} onClick={() => setCancelling(true)}>
              {t('ed_cancel_event')}
            </Button>
          ) : undefined
        }
      />

      <div className="grid-stats">
        <StatCard label={t('ed_joined')} icon={<Icon.Users />} value={num(event.attendees.length)} hint={t('ed_joined_hint')} />
        <StatCard label={t('ed_checked_in')} icon={<Icon.CheckShield />} tone="ok" value={num(checkedIn)} hint={t('ed_checked_in_hint')} />
        <StatCard
          label={t('ed_attendance')}
          icon={<Icon.Activity />}
          tone="accent"
          value={event.attendees.length ? `${pct(checkedIn, event.attendees.length)}%` : '—'}
          hint={t('ed_attendance_hint')}
        />
        <StatCard
          label={t('ed_avg_distance')}
          icon={<Icon.Pin />}
          tone="neutral"
          value={avgDistance != null ? t('metres_short', { n: avgDistance }) : '—'}
          hint={t('ed_avg_distance_hint')}
        />
      </div>

      <div className="grid-main">
        <Card
          title={t('ed_attendance')}
          subtitle={t('ed_n_joined', { n: event.attendees.length })}
          flush
          action={
            <Segmented<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('gr_all') },
                { value: 'in', label: t('ed_filter_checked_in', { n: checkedIn }) },
                { value: 'out', label: t('ed_filter_not_yet', { n: event.attendees.length - checkedIn }) },
              ]}
            />
          }
        >
          {shown.length === 0 ? (
            <EmptyState
              icon={<Icon.Users />}
              title={event.attendees.length ? t('ed_empty_list') : t('ed_empty_none')}
              text={event.attendees.length ? undefined : t('ed_empty_none_sub')}
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('col_member')}</th>
                    <th>{t('ed_joined')}</th>
                    <th>{t('col_checkin')}</th>
                    <th>{t('col_distance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => (
                    <tr key={row.memberId}>
                      <td>
                        <Link href={`/members/${row.memberId}`} className="who">
                          <Avatar name={row.fullName} />
                          <div style={{ minWidth: 0 }}>
                            <div className="cell-main truncate">{row.fullName}</div>
                            <div className="cell-sub">
                              {dash(row.membershipNumber)} · {mobile(row.mobile)}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="cell-sub nowrap">{when(row.joinedAt)}</td>
                      <td>
                        {row.checkedInAt ? (
                          <Badge tone="ok">
                            <span style={{ width: 12, display: 'inline-flex' }}>
                              <Icon.Check />
                            </span>
                            {timeOnly(row.checkedInAt)}
                          </Badge>
                        ) : (
                          <Badge>{t('ed_not_checked_in')}</Badge>
                        )}
                      </td>
                      <td className="num">{row.checkInMetres != null ? t('metres_short', { n: row.checkInMetres }) : <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="stack">
          {event.imageUrl ? (
            <div className="media-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.imageUrl} alt="" />
            </div>
          ) : null}
          <Card title={t('ed_details')}>
            <KeyValues
              items={[
                [t('kv_starts'), when(event.startsAt)],
                [t('kv_ends'), when(event.endsAt)],
                [t('kv_venue'), event.venue],
                [
                  t('kv_map'),
                  map ? (
                    <a href={map} target="_blank" rel="noreferrer" className="link">
                      {t('open_in_maps')}
                    </a>
                  ) : null,
                ],
                [t('kv_host'), <Link key="host" href={`/members/${event.host.id}`} className="link">{event.host.fullName}</Link>],
                [t('kv_host_post'), event.host.post],
                [t('kv_venue_pinned'), event.latitude != null ? t('yes') : t('ed_no_pin')],
                [t('kv_created'), when(event.createdAt)],
              ]}
            />
            {event.description ? (
              <div className="mt">
                <p className="section-title">{t('section_notes')}</p>
                <div style={{ whiteSpace: 'pre-wrap' }}>{event.description}</div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={cancelling}
        title={t('ed_cancel_q')}
        danger
        busy={busy}
        confirmLabel={t('ed_cancel_event')}
        message={t('ed_cancel_msg', {
          title: event.title,
          members: plural(event.attendees.length, 'member'),
        })}
        onClose={() => setCancelling(false)}
        onConfirm={cancel}
      />
    </>
  );
}
