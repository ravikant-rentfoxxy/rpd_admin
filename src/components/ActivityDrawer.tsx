'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { ACTIVITY_STATUS, activityType, dash, mapsUrl, mobile, when } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { ActivityDetail } from '@/lib/types';
import { Icon } from './icons';
import { useCounts } from './session';
import { Alert, Avatar, Badge, Button, Drawer, Field, KeyValues, Modal, Skeleton, useToast } from './ui';

export function ActivityDrawer({
  activityId,
  onClose,
  onReviewed,
}: {
  activityId: string | null;
  onClose: () => void;
  onReviewed?: () => void;
}) {
  const { data, error, loading, reload } = useApi<{ activity: ActivityDetail }>(activityId ? `/admin/activities/${activityId}` : null);
  const activity = activityId && data?.activity.id === activityId ? data.activity : null;

  return (
    <Drawer
      open={Boolean(activityId)}
      title={activity ? activityType(activity.type) : 'Activity'}
      onClose={onClose}
      footer={
        activity?.canReview ? (
          <ReviewActions
            activityId={activity.id}
            onDone={() => {
              reload();
              onReviewed?.();
            }}
          />
        ) : undefined
      }
    >
      {error ? <Alert>{error}</Alert> : null}
      {!activity ? (
        loading || !error ? (
          <div className="stack">
            <Skeleton height={60} />
            <Skeleton height={120} />
            <Skeleton height={80} />
          </div>
        ) : null
      ) : (
        <ActivityBody activity={activity} />
      )}
    </Drawer>
  );
}

function ActivityBody({ activity }: { activity: ActivityDetail }) {
  const status = ACTIVITY_STATUS[activity.status];
  const map = mapsUrl(activity.latitude, activity.longitude);
  return (
    <>
      <div className="between">
        <div className="who">
          <Avatar name={activity.actor.fullName} url={activity.actor.photoUrl} size={42} />
          <div style={{ minWidth: 0 }}>
            <Link href={`/members/${activity.actor.id}`} className="cell-main link truncate" style={{ display: 'block' }}>
              {activity.actor.fullName}
            </Link>
            <div className="cell-sub">
              {dash(activity.actor.membershipNumber)} · {mobile(activity.actor.mobile)}
            </div>
          </div>
        </div>
        {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
      </div>

      {activity.reviewFlag ? (
        <Alert tone="warn">
          Flagged for a closer look
          {activity.farAwayReason ? ` — recorded away from the booth: “${activity.farAwayReason}”` : '.'}
        </Alert>
      ) : null}

      <div>
        <p className="section-title">Details</p>
        <KeyValues
          items={[
            ['When', when(activity.occurredAt)],
            ['Recorded', when(activity.createdAt)],
            ['Booth', activity.booth ? `${activity.booth.code} · ${activity.booth.name}` : null],
            ['Village', activity.booth?.village],
            ['Attendees', activity.attendeeCount ? String(activity.attendeeCount) : null],
            ['Homes covered', activity.homesCovered != null ? String(activity.homesCovered) : null],
            ['Distance from booth', activity.distanceMetres != null ? `${activity.distanceMetres} m` : null],
            [
              'Location',
              map ? (
                <a href={map} target="_blank" rel="noreferrer" className="link">
                  Open in Maps
                </a>
              ) : null,
            ],
          ]}
        />
      </div>

      {activity.notes ? (
        <div>
          <p className="section-title">Notes</p>
          <div style={{ whiteSpace: 'pre-wrap' }}>{activity.notes}</div>
        </div>
      ) : null}

      {activity.backdateReason ? (
        <div>
          <p className="section-title">Recorded late because</p>
          <div>{activity.backdateReason}</div>
        </div>
      ) : null}

      <div>
        <p className="section-title">Photos ({activity.photos.length})</p>
        {activity.photos.length ? (
          <div className="photos">
            {activity.photos.map((photo) =>
              photo.url ? (
                <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" title={when(photo.capturedAt)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`${photo.kind} photo`} loading="lazy" />
                </a>
              ) : null,
            )}
          </div>
        ) : (
          <div className="muted">No photos attached.</div>
        )}
      </div>

      {activity.attendees.length ? (
        <div>
          <p className="section-title">Attendees ({activity.attendees.length})</p>
          <div className="chips">
            {activity.attendees.map((person) =>
              person.memberId ? (
                <Link key={person.id} href={`/members/${person.memberId}`} className="chip">
                  {person.name}
                  {person.membershipNumber ? <small>{person.membershipNumber}</small> : null}
                </Link>
              ) : (
                <span key={person.id} className="chip">
                  {person.name}
                </span>
              ),
            )}
          </div>
        </div>
      ) : null}

      {activity.reviews.length ? (
        <div>
          <p className="section-title">Review history</p>
          <ul className="timeline">
            {activity.reviews.map((review) => (
              <li key={review.id}>
                <div>
                  <b>{review.decision === 'VERIFIED' ? 'Verified' : 'Rejected'}</b> by {review.reviewerName}
                  <div className="cell-sub">{when(review.createdAt)}</div>
                  {review.reason ? <div style={{ marginTop: 2 }}>“{review.reason}”</div> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

/** Verify / reject buttons with the reject-reason dialog. */
export function ReviewActions({ activityId, onDone, compact }: { activityId: string; onDone: () => void; compact?: boolean }) {
  const toast = useToast();
  const { refreshCounts } = useCounts();
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  async function accept() {
    setBusy('accept');
    try {
      await api(`/admin/verification/${activityId}/accept`, { method: 'POST' });
      toast('Activity verified');
      refreshCounts();
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not verify', 'bad');
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (reason.trim().length < 4) return;
    setBusy('reject');
    try {
      await api(`/admin/verification/${activityId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      toast('Activity rejected');
      setRejecting(false);
      setReason('');
      refreshCounts();
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not reject', 'bad');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Button variant="danger" size={compact ? 'sm' : 'md'} icon={<Icon.X />} disabled={busy !== null} onClick={() => setRejecting(true)}>
        Reject
      </Button>
      <Button variant="success" size={compact ? 'sm' : 'md'} icon={<Icon.Check />} loading={busy === 'accept'} disabled={busy !== null} onClick={accept}>
        Verify
      </Button>
      <Modal
        open={rejecting}
        title="Reject activity"
        onClose={() => setRejecting(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(false)} disabled={busy === 'reject'}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy === 'reject'} disabled={reason.trim().length < 4} onClick={reject}>
              Reject activity
            </Button>
          </>
        }
      >
        <Field label="Reason" hint="Saved in the activity's review history. At least 4 characters.">
          <textarea
            className="textarea"
            value={reason}
            maxLength={600}
            autoFocus
            placeholder="e.g. Photo does not show the meeting"
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </Modal>
    </>
  );
}
