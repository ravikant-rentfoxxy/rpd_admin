'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { Alert, Avatar, Badge, Card, EmptyState, PageHeader, Pagination, SearchInput, TableSkeleton } from '@/components/ui';
import { withQuery } from '@/lib/api';
import { ago, MEMBER_STATUS, mobile, plural, POST_LABELS, postTitle } from '@/lib/format';
import { useApi, useDebounced } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import type { Member, Paged } from '@/lib/types';

const PAGE_SIZE = 25;

export default function MembersPage() {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [post, setPost] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);

  useEffect(() => setPage(1), [search, status, post]);

  const { data, error, loading } = useApi<Paged & { members: Member[] }>(
    withQuery('/admin/members', { q: search, status, post, page, limit: PAGE_SIZE }),
  );
  const rows = data?.members ?? [];
  const filtered = Boolean(search || status || post);

  return (
    <>
      <PageHeader title={t('me_title')} subtitle={t('me_subtitle')} />
      {error ? <Alert>{error}</Alert> : null}

      <Card flush>
        <div className="toolbar">
          <SearchInput value={q} onChange={setQ} placeholder={t('me_search')} />
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('status_label')}>
            <option value="">{t('any_status')}</option>
            {Object.entries(MEMBER_STATUS()).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select className="select" value={post} onChange={(e) => setPost(e.target.value)} aria-label={t('post_label')}>
            <option value="">{t('any_post')}</option>
            {Object.entries(POST_LABELS())
              .filter(([value]) => value !== 'SUPER_ADMIN')
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
          {data ? <span className="muted small num" style={{ marginLeft: 'auto' }}>{plural(data.total, 'member')}</span> : null}
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('col_member')}</th>
                <th>{t('col_mobile')}</th>
                <th>{t('col_post')}</th>
                <th>{t('col_area')}</th>
                <th>{t('col_status')}</th>
                <th>{t('col_last_active')}</th>
              </tr>
            </thead>
            {!data && loading ? (
              <TableSkeleton cols={6} />
            ) : (
              <tbody>
                {rows.map((row) => {
                  const badge = MEMBER_STATUS()[row.status];
                  const office = row.post && row.post !== 'MEMBER';
                  return (
                    <tr key={row.id} className="clickable" onClick={() => router.push(`/members/${row.id}`)}>
                      <td>
                        <div className="who">
                          <Avatar name={row.fullName} url={row.photoUrl} />
                          <div style={{ minWidth: 0 }}>
                            <div className="cell-main truncate">{row.fullName || t('unnamed_member')}</div>
                            <div className="cell-sub">{row.membershipNumber ?? `#${row.rowId}`}</div>
                          </div>
                        </div>
                      </td>
                      <td className="nowrap num">{mobile(row.mobile)}</td>
                      <td>{office ? <Badge tone="brand">{postTitle(row.post)}</Badge> : <span className="muted">{t('post_MEMBER')}</span>}</td>
                      <td>
                        <div className="cell-main" style={{ fontWeight: 500 }}>{row.assemblyName ?? row.districtName ?? '—'}</div>
                        {row.assemblyName && row.districtName ? <div className="cell-sub">{row.districtName}</div> : null}
                      </td>
                      <td>{badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : row.status}</td>
                      <td className="cell-sub nowrap">{row.lastActiveAt ? ago(row.lastActiveAt) : t('never')}</td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>
        {data && rows.length === 0 ? (
          <EmptyState
            icon={<Icon.Users />}
            title={filtered ? t('me_empty_filtered') : t('me_empty')}
            text={filtered ? t('me_empty_filtered_sub') : t('me_empty_sub')}
          />
        ) : null}
        {data ? <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} /> : null}
      </Card>
    </>
  );
}
