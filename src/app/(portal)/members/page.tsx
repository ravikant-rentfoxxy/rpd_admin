'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { Alert, Avatar, Badge, Card, EmptyState, PageHeader, Pagination, SearchInput, TableSkeleton } from '@/components/ui';
import { withQuery } from '@/lib/api';
import { ago, MEMBER_STATUS, mobile, plural, POST_LABELS, postTitle } from '@/lib/format';
import { useApi, useDebounced } from '@/lib/hooks';
import type { Member, Paged } from '@/lib/types';

const PAGE_SIZE = 25;

export default function MembersPage() {
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
      <PageHeader title="Members" subtitle="Everyone registered in your area. Open a member to change their status or post." />
      {error ? <Alert>{error}</Alert> : null}

      <Card flush>
        <div className="toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, membership no. or mobile" />
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option>
            {Object.entries(MEMBER_STATUS).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select className="select" value={post} onChange={(e) => setPost(e.target.value)} aria-label="Post">
            <option value="">Any post</option>
            {Object.entries(POST_LABELS)
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
                <th>Member</th>
                <th>Mobile</th>
                <th>Post</th>
                <th>Area</th>
                <th>Status</th>
                <th>Last active</th>
              </tr>
            </thead>
            {!data && loading ? (
              <TableSkeleton cols={6} />
            ) : (
              <tbody>
                {rows.map((row) => {
                  const badge = MEMBER_STATUS[row.status];
                  const office = row.post && row.post !== 'MEMBER';
                  return (
                    <tr key={row.id} className="clickable" onClick={() => router.push(`/members/${row.id}`)}>
                      <td>
                        <div className="who">
                          <Avatar name={row.fullName} url={row.photoUrl} />
                          <div style={{ minWidth: 0 }}>
                            <div className="cell-main truncate">{row.fullName || 'Unnamed member'}</div>
                            <div className="cell-sub">{row.membershipNumber ?? `#${row.rowId}`}</div>
                          </div>
                        </div>
                      </td>
                      <td className="nowrap num">{mobile(row.mobile)}</td>
                      <td>{office ? <Badge tone="brand">{postTitle(row.post)}</Badge> : <span className="muted">Member</span>}</td>
                      <td>
                        <div className="cell-main" style={{ fontWeight: 500 }}>{row.assemblyName ?? row.districtName ?? '—'}</div>
                        {row.assemblyName && row.districtName ? <div className="cell-sub">{row.districtName}</div> : null}
                      </td>
                      <td>{badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : row.status}</td>
                      <td className="cell-sub nowrap">{row.lastActiveAt ? ago(row.lastActiveAt) : 'Never'}</td>
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
            title={filtered ? 'No members match' : 'No members in your area yet'}
            text={filtered ? 'Try a different name, number or filter.' : 'Members who join from the app will appear here.'}
          />
        ) : null}
        {data ? <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} /> : null}
      </Card>
    </>
  );
}
