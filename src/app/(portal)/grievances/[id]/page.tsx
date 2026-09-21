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
import { useT } from '@/lib/i18n';
import type { Assignee, Grievance } from '@/lib/types';

export default function GrievanceDetailPage() {
  const t = useT();
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
      toast(resolved ? t('toast_resolved') : t('toast_reopened'));
      refreshCounts();
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('err_could_not_update'), 'bad');
    } finally {
      setBusy(false);
    }
  }

  if (error && !post) {
    return (
      <>
        <PageHeader title={t('gd_grievance')} back={{ href: '/grievances', label: t('gr_title') }} />
        <Alert>{error}</Alert>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <PageHeader title={<Skeleton width={280} height={26} />} back={{ href: '/grievances', label: t('gr_title') }} />
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
        back={{ href: '/grievances', label: t('gr_title') }}
        title={
          <span className="row" style={{ gap: 10 }}>
            {post.subIssueName ?? post.issueName}
            {post.status === 'RESOLVED' ? <Badge tone="ok">{t('gr_resolved')}</Badge> : <Badge tone="accent" dot>{t('gr_open')}</Badge>}
          </span>
        }
        subtitle={`${t('gd_raised_ago', { ago: ago(post.createdAt) })}${post.regionLabel ? ` · ${post.regionLabel}` : ''}`}
        actions={
          post.canResolve ? (
            post.status === 'OPEN' ? (
              <Button variant="success" icon={<Icon.Check />} loading={busy} onClick={() => setResolved(true)}>
                {t('gd_mark_resolved')}
              </Button>
            ) : (
              <Button loading={busy} onClick={() => setResolved(false)}>
                {t('gd_reopen')}
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
                  <img src={post.mediaUrl} alt={t('grievance_photo')} />
                </a>
              )}
            </div>
          ) : null}

          <Card title={t('gd_what_reported')}>
            <div className="row" style={{ marginBottom: 12 }}>
              <Badge tone={bandTone(post.issueBand)}>{bandLabel(post.issueBand)}</Badge>
              {post.subIssueName ? <Badge>{post.issueName}</Badge> : null}
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{post.description || <span className="muted">{t('gd_no_description')}</span>}</div>
          </Card>

          {post.canSummarise ? <XPostCard postId={post.serverId} /> : null}

          <Card title={t('gd_details')}>
            <KeyValues
              items={[
                [t('kv_raised_on'), when(post.createdAt)],
                [t('col_place'), post.regionLabel],
                [
                  t('kv_raised_by'),
                  post.canSeeAuthor && post.authorName
                    ? `${post.authorName}${post.authorPost ? ` · ${postTitle(post.authorPost)}` : ''}`
                    : t('gd_author_hidden'),
                ],
                [t('kv_mobile'), post.canSeeAuthor ? mobile(post.authorMobile) : null],
                [
                  t('kv_location'),
                  map ? (
                    <a href={map} target="_blank" rel="noreferrer" className="link">
                      {t('open_in_maps')}
                    </a>
                  ) : null,
                ],
                [
                  t('kv_resolved'),
                  post.resolvedAt
                    ? post.resolvedByName
                      ? t('gd_resolved_by', { when: when(post.resolvedAt), name: post.resolvedByName })
                      : when(post.resolvedAt)
                    : null,
                ],
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
          <Card title={t('gd_timeline')}>
            <ul className="timeline">
              <li>
                <div>
                  <b>{t('gd_tl_raised')}</b>
                  <div className="cell-sub">{when(post.createdAt)}</div>
                </div>
              </li>
              {post.assignedAt ? (
                <li>
                  <div>
                    <b>{assignedToMe ? t('gd_tl_assigned_you') : t('gd_tl_assigned_to', { name: post.assigneeName ?? '' })}</b>
                    <div className="cell-sub">
                      {when(post.assignedAt)}
                      {post.assignedByName ? t('gd_by_name', { name: post.assignedByName }) : ''}
                    </div>
                  </div>
                </li>
              ) : null}
              {post.resolvedAt ? (
                <li>
                  <div>
                    <b>{t('kv_resolved')}</b>
                    <div className="cell-sub">
                      {when(post.resolvedAt)}
                      {post.resolvedByName ? t('gd_by_name', { name: post.resolvedByName }) : ''}
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
  const t = useT();
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
      await onAssigned(
        memberId
          ? t('toast_assigned_to', { name: chosen?.fullName ?? t('gd_the_selected_person') })
          : t('toast_assignment_removed'),
      );
      void reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('err_could_not_assign'), 'bad');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card title={t('gd_assignment')} subtitle={canPick ? t('gd_assignment_sub') : undefined}>
      <div className="stack" style={{ gap: 14 }}>
        {assignedToMe ? (
          // The assignee knows it's theirs; show who handed it over instead of their own name.
          <div className="current-assignee">
            <Avatar name={post.assignedByName || t('gd_assignment')} size={40} />
            <div className="grow">
              <div className="cell-sub">{t('gd_assigned_to_you_by')}</div>
              <div className="cell-main">{post.assignedByName ?? t('gd_a_senior')}</div>
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
                {post.assignedAt ? t('gd_assigned_ago', { ago: ago(post.assignedAt) }) : ''}
                {post.assignedByName ? t('gd_by_name', { name: post.assignedByName }) : ''}
              </div>
            </div>
            {canPick ? (
              <Button size="sm" variant="ghost" loading={busy === 'clear'} disabled={busy !== null} onClick={() => assign(null)}>
                {t('remove')}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="current-assignee">
            <span className="list-icon tone-warn">
              <Icon.UserPlus />
            </span>
            <div>
              <div className="cell-main">{t('gd_not_assigned')}</div>
              <div className="cell-sub">{t('gd_not_assigned_sub')}</div>
            </div>
          </div>
        )}

        {!canPick ? (
          <Alert tone="info">
            {post.status === 'RESOLVED'
              ? t('gd_note_resolved')
              : assignedToMe
                ? t('gd_note_assigned_you')
                : mine
                ? t('gd_note_mine')
                : t('gd_note_other')}
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
                title={t('gd_no_one_title')}
                text={
                  <>
                    {t('gd_no_one_text_1')}
                    <Link href="/members" className="link">
                      {t('gd_no_one_link')}
                    </Link>
                    {t('gd_no_one_text_2')}
                  </>
                }
              />
            ) : (
              <>
                <div className="field">
                  <span>{t('gd_assign_to')}</span>
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
                    ? post.assigneeName
                      ? t('gd_reassign_to', { name: chosen.fullName })
                      : t('gd_assign_to_name', { name: chosen.fullName })
                    : t('gd_choose_person')}
                </Button>
                <div className="cell-sub">{t('gd_assign_note')}</div>
              </>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
