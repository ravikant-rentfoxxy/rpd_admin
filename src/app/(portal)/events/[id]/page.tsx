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
import { activityType, dateRange, dash, EVENT_PHASE, mapsUrl, mobile, num, pct, timeOnly, when } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { EventDetail } from '@/lib/types';

type Filter = 'all' | 'in' | 'out';

export default function EventDetailPage() {
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
        <PageHeader title="Event" back={{ href: '/events', label: 'Events' }} />
        <Alert>{error}</Alert>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <PageHeader title={<Skeleton width={260} height={26} />} back={{ href: '/events', label: 'Events' }} />
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

  const badge = EVENT_PHASE[event.phase];
  const checkedIn = event.attendees.filter((row) => row.checkedInAt).length;
  const map = mapsUrl(event.latitude, event.longitude, event.venue);
  const shown = event.attendees.filter((row) => (filter === 'in' ? row.checkedInAt : filter === 'out' ? !row.checkedInAt : true));
  const distances = event.attendees.map((row) => row.checkInMetres).filter((m): m is number => m != null);
  const avgDistance = distances.length ? Math.round(distances.reduce((a, b) => a + b, 0) / distances.length) : null;

  async function cancel() {
    setBusy(true);
    try {
      await api(`/admin/events/${event!.id}`, { method: 'DELETE' });
      toast('Event cancelled');
      router.replace('/events');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not cancel', 'bad');
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: '/events', label: 'Events' }}
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
              Cancel event
            </Button>
          ) : undefined
        }
      />

      <div className="grid-stats">
        <StatCard label="Joined" icon={<Icon.Users />} value={num(event.attendees.length)} hint="Members who said they will come" />
        <StatCard label="Checked in" icon={<Icon.CheckShield />} tone="ok" value={num(checkedIn)} hint="Verified within 500 m of the venue" />
        <StatCard
          label="Attendance"
          icon={<Icon.Activity />}
          tone="accent"
          value={event.attendees.length ? `${pct(checkedIn, event.attendees.length)}%` : '—'}
          hint="Checked in out of joined"
        />
        <StatCard
          label="Avg. distance"
          icon={<Icon.Pin />}
          tone="neutral"
          value={avgDistance != null ? `${avgDistance} m` : '—'}
          hint="From the venue at check-in"
        />
      </div>

      <div className="grid-main">
        <Card
          title="Attendance"
          subtitle={`${event.attendees.length} joined`}
          flush
          action={
            <Segmented<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'in', label: `Checked in · ${checkedIn}` },
                { value: 'out', label: `Not yet · ${event.attendees.length - checkedIn}` },
              ]}
            />
          }
        >
          {shown.length === 0 ? (
            <EmptyState
              icon={<Icon.Users />}
              title={event.attendees.length ? 'No one in this list' : 'No one has joined yet'}
              text={event.attendees.length ? undefined : 'Members join from Upcoming events in the app.'}
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Joined</th>
                    <th>Check-in</th>
                    <th>Distance</th>
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
                          <Badge>Not checked in</Badge>
                        )}
                      </td>
                      <td className="num">{row.checkInMetres != null ? `${row.checkInMetres} m` : <span className="muted">—</span>}</td>
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
          <Card title="Event details">
            <KeyValues
              items={[
                ['Starts', when(event.startsAt)],
                ['Ends', when(event.endsAt)],
                ['Venue', event.venue],
                [
                  'Map',
                  map ? (
                    <a href={map} target="_blank" rel="noreferrer" className="link">
                      Open in Maps
                    </a>
                  ) : null,
                ],
                ['Host', <Link key="host" href={`/members/${event.host.id}`} className="link">{event.host.fullName}</Link>],
                ['Host post', event.host.post],
                ['Venue pinned', event.latitude != null ? 'Yes' : 'No — address lookup at check-in'],
                ['Created', when(event.createdAt)],
              ]}
            />
            {event.description ? (
              <div className="mt">
                <p className="section-title">Notes</p>
                <div style={{ whiteSpace: 'pre-wrap' }}>{event.description}</div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={cancelling}
        title="Cancel this event?"
        danger
        busy={busy}
        confirmLabel="Cancel event"
        message={
          <>
            <b>{event.title}</b> will be removed from the app for everyone, including the {event.attendees.length} member
            {event.attendees.length === 1 ? '' : 's'} who joined. It cannot be restored from the portal.
          </>
        }
        onClose={() => setCancelling(false)}
        onConfirm={cancel}
      />
    </>
  );
}
