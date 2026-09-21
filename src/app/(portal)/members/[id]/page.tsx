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
import { useT } from '@/lib/i18n';
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
  const t = useT();
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
      toast(err instanceof Error ? err.message : t('err_generic'), 'bad');
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) {
    return (
      <>
        <PageHeader title={t('md_member')} back={{ href: '/members', label: t('me_title') }} />
        <Alert>{error}</Alert>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader title={<Skeleton width={220} height={26} />} back={{ href: '/members', label: t('me_title') }} />
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
  const badge = MEMBER_STATUS()[member.status];

  return (
    <>
      <PageHeader title={t('md_profile_title')} back={{ href: '/members', label: t('me_title') }} />

      <Card className="mt" >
        <div className="between" style={{ flexWrap: 'wrap' }}>
          <div className="who">
            <Avatar name={member.fullName} url={member.photoUrl} size={64} />
            <div>
              <div className="row" style={{ gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>{member.fullName || t('unnamed_member')}</h2>
                {badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
                {member.isSuperAdmin ? <Badge tone="accent">{t('md_super_admin')}</Badge> : null}
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
          <Card title={t('card_profile')}>
            <KeyValues
              items={[
                [t('kv_gender'), titleCase(member.gender)],
                [t('kv_voter_id'), member.voterId],
                [t('kv_state'), member.stateName],
                [t('kv_district'), member.districtName],
                [t('kv_assembly'), member.assemblyName],
                [t('kv_booth'), member.boothName],
                [t('kv_address'), member.address],
                [t('kv_pincode'), member.pincode],
                [t('kv_joined'), dateOnly(member.createdAt)],
                [t('kv_last_active'), member.lastActiveAt ? ago(member.lastActiveAt) : t('never')],
              ]}
            />
          </Card>

          <Card title={t('md_posts_held')} subtitle={t('md_posts_held_sub')} flush>
            {data.posts.length === 0 ? (
              <EmptyState icon={<Icon.Sitemap />} title={t('md_no_post')} text={t('md_no_post_sub')} />
            ) : (
              <ul className="list">
                {data.posts.map((row) => (
                  <li key={row.id} className="list-item">
                    <span className="list-icon tone-brand">
                      <Icon.Sitemap />
                    </span>
                    <div className="grow">
                      <div className="row" style={{ gap: 8 }}>
                        <span className="cell-main">{postTitle(row.post)}</span>
                        {row.isPrimary ? <Badge tone="accent">{t('md_primary')}</Badge> : null}
                      </div>
                      <div className="cell-sub">
                        {[row.boothName, row.mandalName, row.assemblyName, row.districtName, row.regionName, row.stateName]
                          .filter(Boolean)
                          .join(' · ') || t('md_no_area')}{' '}
                        · {t('md_since', { date: dateOnly(row.startedAt) })}
                      </div>
                    </div>
                    {data.canAssign ? (
                      <Button size="sm" variant="danger" icon={<Icon.Trash />} onClick={() => setRemoving(row)}>
                        {t('remove')}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="stack">
          <Card title={t('md_membership_status')}>
            {data.canAssign ? (
              <div className="stack" style={{ gap: 12 }}>
                <Field label={t('status_label')}>
                  <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {!STATUS_CHOICES.includes(member.status) ? (
                      <option value={member.status} disabled>
                        {t('md_current_suffix', { label: MEMBER_STATUS()[member.status]?.label ?? member.status })}
                      </option>
                    ) : null}
                    {STATUS_CHOICES.map((value) => (
                      <option key={value} value={value}>
                        {MEMBER_STATUS()[value]?.label ?? value}
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
                      t('md_status_changed', { label: MEMBER_STATUS()[status]?.label ?? status }),
                    )
                  }
                >
                  {t('md_save_status')}
                </Button>
              </div>
            ) : (
              <Alert tone="info">{t('md_status_note')}</Alert>
            )}
          </Card>

          <Card title={t('md_assign_post')} subtitle={t('md_assign_post_sub')}>
            {data.assignablePosts.length === 0 || !data.canAssign ? (
              <Alert tone="info">{t('md_assign_note')}</Alert>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                <Field label={t('post_label')} hint={t('md_post_hint')}>
                  <select className="select" value={post} onChange={(e) => setPost(e.target.value)}>
                    {data.assignablePosts.map((item) => (
                      <option key={item.post} value={item.post}>
                        {postTitle(item.post)}
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
                      t('md_now_is', { name: member.fullName || t('post_MEMBER'), post: postTitle(post) }),
                    )
                  }
                >
                  {t('md_assign_action')}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(removing)}
        title={t('md_remove_post')}
        danger
        busy={busy === 'remove'}
        confirmLabel={t('md_remove_post')}
        message={t('md_remove_post_msg', {
          post: removing ? postTitle(removing.post) : '',
          name: dash(member.fullName),
        })}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          const ok = await run(
            'remove',
            () => api(`/admin/members/${member.id}/posts/${removing.id}`, { method: 'DELETE' }),
            t('md_post_removed', { post: postTitle(removing.post) }),
          );
          if (ok) setRemoving(null);
        }}
      />
    </>
  );
}
