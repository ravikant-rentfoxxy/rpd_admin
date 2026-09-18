'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { PersonSelect } from '@/components/PersonSelect';
import { XPostCard } from '@/components/XPostCard';
import { useCounts, useSession } from '@/components/session';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  KeyValues,
  PageHeader,
  Skeleton,
  useToast,
} from '@/components/ui';
import { api } from '@/lib/api';
import { ago, bandLabel, bandTone, mapsUrl, mobile, postTitle, when } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { Assignee, Grievance } from '@/lib/types';

export default function GrievanceDetailPage() {
  const params = useParams<{ id: string }>();
  const me = useSession();
  const toast = useToast();
  const { refreshCounts } = useCounts();
  const { data, error, reload } = useApi<{ post: Grievance }>(`/admin/region-posts/${params.id}`);
  const post = data?.post;
  const [busy, setBusy] = useState(false);

  async function setResolved(resolved: boolean) {
    if (!post) return;
    setBusy(true);
    try {
      await api(`/posts/${post.serverId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ status: resolved ? 'RESOLVED' : 'OPEN' }),
      });
      toast(resolved ? 'Grievance marked resolved' : 'Grievance reopened');
      refreshCounts();
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update', 'bad');
    } finally {
      setBusy(false);
    }
  }

  if (error && !post) {
    return (
      <>
        <PageHeader title="Grievance" back={{ href: '/grievances', label: 'Grievances' }} />
        <Alert>{error}</Alert>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <PageHeader title={<Skeleton width={280} height={26} />} back={{ href: '/grievances', label: 'Grievances' }} />
        <div className="grid-main">
          <Card>
            <Skeleton height={300} />
          </Card>
          <Card>
            <Skeleton height={300} />
          </Card>
        </div>
      </>
    );
  }

  const map = mapsUrl(post.latitude, post.longitude);
  const mine = post.authorId === me.member.id;
  const assignedToMe = Boolean(post.isAssignedToMe || (post.assignedToId && post.assignedToId === me.member.id));

  return (
    <>
      <PageHeader
        back={{ href: '/grievances', label: 'Grievances' }}
        title={
          <span className="row" style={{ gap: 10 }}>
            {post.subIssueName ?? post.issueName}
            {post.status === 'RESOLVED' ? <Badge tone="ok">Resolved</Badge> : <Badge tone="accent" dot>Open</Badge>}
          </span>
        }
        subtitle={`Raised ${ago(post.createdAt)}${post.regionLabel ? ` · ${post.regionLabel}` : ''}`}
        actions={
          post.canResolve ? (
            post.status === 'OPEN' ? (
              <Button variant="success" icon={<Icon.Check />} loading={busy} onClick={() => setResolved(true)}>
                Mark resolved
              </Button>
            ) : (
              <Button loading={busy} onClick={() => setResolved(false)}>
                Reopen
              </Button>
            )
          ) : undefined
        }
      />

      <div className="grid-main">
        <div className="stack">
          {post.mediaUrl ? (
            <div className="media-frame">
              {post.mediaType === 'video' ? (
                <video src={post.mediaUrl} controls poster={post.thumbnailUrl ?? undefined} />
              ) : post.mediaType === 'audio' ? (
                <audio src={post.mediaUrl} controls />
              ) : (
                <a href={post.mediaUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.mediaUrl} alt="Grievance photo" />
                </a>
              )}
            </div>
          ) : null}

          <Card title="What was reported">
            <div className="row" style={{ marginBottom: 12 }}>
              <Badge tone={bandTone(post.issueBand)}>{bandLabel(post.issueBand)}</Badge>
              {post.subIssueName ? <Badge>{post.issueName}</Badge> : null}
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{post.description || <span className="muted">No description was added.</span>}</div>
          </Card>

          {post.canSummarise ? <XPostCard postId={post.serverId} /> : null}

          <Card title="Details">
            <KeyValues
              items={[
                ['Raised on', when(post.createdAt)],
                ['Place', post.regionLabel],
                [
                  'Raised by',
                  post.canSeeAuthor && post.authorName
                    ? `${post.authorName}${post.authorPost ? ` · ${postTitle(post.authorPost)}` : ''}`
                    : 'Hidden (senior member)',
                ],
                ['Mobile', post.canSeeAuthor ? mobile(post.authorMobile) : null],
                [
                  'Location',
                  map ? (
                    <a href={map} target="_blank" rel="noreferrer" className="link">
                      Open in Maps
                    </a>
                  ) : null,
                ],
                ['Resolved', post.resolvedAt ? `${when(post.resolvedAt)}${post.resolvedByName ? ` by ${post.resolvedByName}` : ''}` : null],
              ]}
            />
          </Card>
        </div>

        <div className="stack">
          <AssignmentPanel
            post={post}
            mine={mine}
            assignedToMe={assignedToMe}
            onAssigned={async (message) => {
              toast(message);
              refreshCounts();
              await reload();
            }}
          />
          <Card title="Timeline">
            <ul className="timeline">
              <li>
                <div>
                  <b>Raised</b>
                  <div className="cell-sub">{when(post.createdAt)}</div>
                </div>
              </li>
              {post.assignedAt ? (
                <li>
                  <div>
                    <b>{assignedToMe ? 'Assigned to you' : `Assigned to ${post.assigneeName}`}</b>
                    <div className="cell-sub">
                      {when(post.assignedAt)}
                      {post.assignedByName ? ` · by ${post.assignedByName}` : ''}
                    </div>
                  </div>
                </li>
              ) : null}
              {post.resolvedAt ? (
                <li>
                  <div>
                    <b>Resolved</b>
                    <div className="cell-sub">
                      {when(post.resolvedAt)}
                      {post.resolvedByName ? ` · by ${post.resolvedByName}` : ''}
                    </div>
                  </div>
                </li>
              ) : null}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function AssignmentPanel({
  post,
  mine,
  assignedToMe,
  onAssigned,
}: {
  post: Grievance;
  mine: boolean;
  assignedToMe: boolean;
  onAssigned: (message: string) => Promise<void>;
}) {
  const toast = useToast();
  const canPick = post.canAssign && post.status === 'OPEN';
  const { data, error, loading, reload } = useApi<{ members: Assignee[] }>(canPick ? `/posts/${post.serverId}/assignees` : null);
  const [selected, setSelected] = useState<string>('');
  const [busy, setBusy] = useState<'assign' | 'clear' | null>(null);

  useEffect(() => setSelected(post.assignedToId ?? ''), [post.assignedToId]);

  const chosen = data?.members.find((row) => row.id === selected) ?? null;

  async function assign(memberId: string | null) {
    setBusy(memberId ? 'assign' : 'clear');
    try {
      await api(`/posts/${post.serverId}/assign`, { method: 'POST', body: JSON.stringify({ memberId }) });
      await onAssigned(memberId ? `Assigned to ${chosen?.fullName ?? 'the selected person'}` : 'Assignment removed');
      void reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not assign', 'bad');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card title="Assignment" subtitle={canPick ? 'Hand this grievance to an office bearer below you in your area.' : undefined}>
      <div className="stack" style={{ gap: 14 }}>
        {assignedToMe ? (
          // The assignee knows it's theirs; show who handed it over instead of their own name.
          <div className="current-assignee">
            <Avatar name={post.assignedByName || 'Assigned'} size={40} />
            <div className="grow">
              <div className="cell-sub">Assigned to you by</div>
              <div className="cell-main">{post.assignedByName ?? 'A senior office bearer'}</div>
              <div className="cell-sub">
                {post.assignedByPostLabel}
                {post.assignedAt ? `${post.assignedByPostLabel ? ' · ' : ''}${ago(post.assignedAt)}` : ''}
              </div>
            </div>
          </div>
        ) : post.assigneeName ? (
          <div className="current-assignee">
            <Avatar name={post.assigneeName} size={40} />
            <div className="grow">
              <div className="cell-main">{post.assigneeName}</div>
              <div className="cell-sub">
                {post.assigneePostLabel}
                {post.assignedAt ? ` · assigned ${ago(post.assignedAt)}` : ''}
                {post.assignedByName ? ` by ${post.assignedByName}` : ''}
              </div>
            </div>
            {canPick ? (
              <Button size="sm" variant="ghost" loading={busy === 'clear'} disabled={busy !== null} onClick={() => assign(null)}>
                Remove
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="current-assignee">
            <span className="list-icon tone-warn">
              <Icon.UserPlus />
            </span>
            <div>
              <div className="cell-main">Not assigned yet</div>
              <div className="cell-sub">No one is following up on this grievance.</div>
            </div>
          </div>
        )}

        {!canPick ? (
          <Alert tone="info">
            {post.status === 'RESOLVED'
              ? 'This grievance is resolved. Reopen it to change who follows it up.'
              : assignedToMe
                ? 'This grievance was handed to you to follow up.'
                : mine
                ? 'You raised this grievance, so someone senior to you assigns it.'
                : 'Only someone senior to the person who raised this grievance can assign it.'}
          </Alert>
        ) : (
          <>
            {error ? <Alert>{error}</Alert> : null}
            {loading && !data ? (
              <div className="stack" style={{ gap: 8 }}>
                <Skeleton height={52} />
                <Skeleton height={52} />
                <Skeleton height={52} />
              </div>
            ) : (data?.members.length ?? 0) === 0 ? (
              <EmptyState
                icon={<Icon.Users />}
                title="No one to assign"
                text={
                  <>
                    There is no office bearer below your post in your area yet.{' '}
                    <Link href="/members" className="link">
                      Assign a post
                    </Link>{' '}
                    to a member first.
                  </>
                }
              />
            ) : (
              <>
                <div className="field">
                  <span>Assign to</span>
                  <PersonSelect
                    people={data?.members ?? []}
                    value={selected}
                    currentId={post.assignedToId}
                    onChange={setSelected}
                    disabled={busy !== null}
                  />
                </div>
                <Button
                  variant="primary"
                  icon={<Icon.UserPlus />}
                  loading={busy === 'assign'}
                  disabled={!chosen || selected === post.assignedToId || busy !== null}
                  onClick={() => assign(selected)}
                >
                  {chosen && selected !== post.assignedToId
                    ? `${post.assigneeName ? 'Reassign' : 'Assign'} to ${chosen.fullName}`
                    : 'Choose a person'}
                </Button>
                <div className="cell-sub">They get a notification in the app. The “open” count is how many open grievances they already hold.</div>
              </>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
