'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Field,
  KeyValues,
  PageHeader,
  Skeleton,
  useToast,
} from '@/components/ui';
import { api } from '@/lib/api';
import { ago, dateOnly, dash, MEMBER_STATUS, mobile, postTitle, titleCase } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { AssignablePost, Member, OfficePost } from '@/lib/types';

type Detail = {
  member: Member;
  rank: number;
  canAssign: boolean;
  assignablePosts: AssignablePost[];
  posts: OfficePost[];
};

const STATUS_CHOICES = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'WITHDRAWN'];

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { data, error, reload } = useApi<Detail>(`/admin/members/${params.id}`);
  const [status, setStatus] = useState('');
  const [post, setPost] = useState('');
  const [busy, setBusy] = useState<'status' | 'assign' | 'remove' | null>(null);
  const [removing, setRemoving] = useState<OfficePost | null>(null);

  useEffect(() => {
    if (!data) return;
    setStatus(data.member.status);
    setPost((current) => (data.assignablePosts.some((item) => item.post === current) ? current : data.assignablePosts[0]?.post ?? ''));
  }, [data]);

  async function run(kind: 'status' | 'assign' | 'remove', action: () => Promise<unknown>, success: string) {
    setBusy(kind);
    try {
      await action();
      toast(success);
      await reload();
      return true;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'bad');
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) {
    return (
      <>
        <PageHeader title="Member" back={{ href: '/members', label: 'Members' }} />
        <Alert>{error}</Alert>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader title={<Skeleton width={220} height={26} />} back={{ href: '/members', label: 'Members' }} />
        <div className="grid-main">
          <Card>
            <Skeleton height={220} />
          </Card>
          <Card>
            <Skeleton height={160} />
          </Card>
        </div>
      </>
    );
  }

  const member = data.member;
  const badge = MEMBER_STATUS[member.status];

  return (
    <>
      <PageHeader title="Member profile" back={{ href: '/members', label: 'Members' }} />

      <Card className="mt" >
        <div className="between" style={{ flexWrap: 'wrap' }}>
          <div className="who">
            <Avatar name={member.fullName} url={member.photoUrl} size={64} />
            <div>
              <div className="row" style={{ gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>{member.fullName || 'Unnamed member'}</h2>
                {badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
                {member.isSuperAdmin ? <Badge tone="accent">Super Admin</Badge> : null}
              </div>
              <div className="cell-sub" style={{ marginTop: 2 }}>
                {postTitle(member.post)} · {member.membershipNumber ?? `#${member.rowId}`}
              </div>
            </div>
          </div>
          <div className="row">
            <a className="btn btn-secondary" href={`tel:${member.mobile}`}>
              <Icon.Phone />
              {mobile(member.mobile)}
            </a>
          </div>
        </div>
      </Card>

      <div className="grid-main mt">
        <div className="stack">
          <Card title="Profile">
            <KeyValues
              items={[
                ['Gender', titleCase(member.gender)],
                ['Voter ID', member.voterId],
                ['State', member.stateName],
                ['District', member.districtName],
                ['Assembly', member.assemblyName],
                ['Booth', member.boothName],
                ['Address', member.address],
                ['Pincode', member.pincode],
                ['Joined', dateOnly(member.createdAt)],
                ['Last active', member.lastActiveAt ? ago(member.lastActiveAt) : 'Never'],
              ]}
            />
          </Card>

          <Card title="Posts held" subtitle="Active office posts for this member." flush>
            {data.posts.length === 0 ? (
              <EmptyState icon={<Icon.Sitemap />} title="No office post" text="This person is a member without an office post." />
            ) : (
              <ul className="list">
                {data.posts.map((row) => (
                  <li key={row.id} className="list-item">
                    <span className="list-icon tone-brand">
                      <Icon.Sitemap />
                    </span>
                    <div className="grow">
                      <div className="row" style={{ gap: 8 }}>
                        <span className="cell-main">{row.title}</span>
                        {row.isPrimary ? <Badge tone="accent">Primary</Badge> : null}
                      </div>
                      <div className="cell-sub">
                        {[row.boothName, row.mandalName, row.assemblyName, row.districtName, row.regionName, row.stateName]
                          .filter(Boolean)
                          .join(' · ') || 'No area set'}{' '}
                        · since {dateOnly(row.startedAt)}
                      </div>
                    </div>
                    {data.canAssign ? (
                      <Button size="sm" variant="danger" icon={<Icon.Trash />} onClick={() => setRemoving(row)}>
                        Remove
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="stack">
          <Card title="Membership status">
            {data.canAssign ? (
              <div className="stack" style={{ gap: 12 }}>
                <Field label="Status">
                  <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {!STATUS_CHOICES.includes(member.status) ? (
                      <option value={member.status} disabled>
                        {MEMBER_STATUS[member.status]?.label ?? member.status} (current)
                      </option>
                    ) : null}
                    {STATUS_CHOICES.map((value) => (
                      <option key={value} value={value}>
                        {MEMBER_STATUS[value]?.label ?? value}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button
                  variant="primary"
                  loading={busy === 'status'}
                  disabled={status === member.status || busy !== null}
                  onClick={() =>
                    run(
                      'status',
                      () => api(`/admin/members/${member.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
                      `Status changed to ${MEMBER_STATUS[status]?.label ?? status}`,
                    )
                  }
                >
                  Save status
                </Button>
              </div>
            ) : (
              <Alert tone="info">You can change the status only for members below your post.</Alert>
            )}
          </Card>

          <Card title="Assign a post" subtitle="Only posts below your own can be given.">
            {data.assignablePosts.length === 0 || !data.canAssign ? (
              <Alert tone="info">You can assign a post only to someone below your post.</Alert>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                <Field label="Post" hint="It becomes this member's primary post.">
                  <select className="select" value={post} onChange={(e) => setPost(e.target.value)}>
                    {data.assignablePosts.map((item) => (
                      <option key={item.post} value={item.post}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button
                  variant="accent"
                  icon={<Icon.UserPlus />}
                  loading={busy === 'assign'}
                  disabled={!post || busy !== null}
                  onClick={() =>
                    run(
                      'assign',
                      () =>
                        api(`/admin/members/${member.id}/posts`, {
                          method: 'POST',
                          body: JSON.stringify({ post, isPrimary: true }),
                        }),
                      `${member.fullName || 'Member'} is now ${postTitle(post)}`,
                    )
                  }
                >
                  Assign post
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(removing)}
        title="Remove post"
        danger
        busy={busy === 'remove'}
        confirmLabel="Remove post"
        message={
          <>
            Remove <b>{removing?.title}</b> from {dash(member.fullName)}? They keep their membership.
          </>
        }
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          const ok = await run(
            'remove',
            () => api(`/admin/members/${member.id}/posts/${removing.id}`, { method: 'DELETE' }),
            `${removing.title} removed`,
          );
          if (ok) setRemoving(null);
        }}
      />
    </>
  );
}
