'use client';

import { Icon } from '@/components/icons';
import { useSession } from '@/components/session';
import { Alert, Badge, Card, PageHeader, Skeleton } from '@/components/ui';
import { AREA_LEVEL, postTitle } from '@/lib/format';
import { useApi } from '@/lib/hooks';

type Level = { code: string; name: string; posts: { post: string; title: string; rank: number }[] };

/** Mirrors the backend hierarchy, used when the org tables have not been seeded yet. */
const FALLBACK: Level[] = [
  { code: 'NATIONAL', name: 'National', posts: [{ post: 'NATIONAL_PRESIDENT', title: 'National President', rank: 100 }, { post: 'NATIONAL_GENERAL_SECRETARY', title: 'General Secretary', rank: 95 }] },
  { code: 'STATE', name: 'State', posts: [{ post: 'STATE_PRESIDENT', title: 'State President', rank: 90 }, { post: 'STATE_GENERAL_SECRETARY', title: 'State General Secretary', rank: 85 }] },
  { code: 'REGION', name: 'Region / Zone', posts: [{ post: 'REGIONAL_PRESIDENT', title: 'Regional President', rank: 80 }] },
  { code: 'DISTRICT', name: 'District', posts: [{ post: 'DISTRICT_PRESIDENT', title: 'District President', rank: 70 }, { post: 'DISTRICT_GENERAL_SECRETARY', title: 'District General Secretary', rank: 65 }] },
  { code: 'ASSEMBLY', name: 'Assembly Constituency', posts: [{ post: 'ASSEMBLY_IN_CHARGE', title: 'Assembly In-charge', rank: 50 }] },
  { code: 'MANDAL', name: 'Mandal / Block', posts: [{ post: 'MANDAL_PRESIDENT', title: 'Mandal President', rank: 40 }] },
];

/** Posts that exist in the app but sit outside the seeded levels. */
const EXTRA: Level = {
  code: 'BOOTH',
  name: 'Booth & members',
  posts: [
    { post: 'BOOTH_ADHYAKSH', title: 'Booth Adhyaksh', rank: 30 },
    { post: 'PANNA_PRAMUKH', title: 'Panna Pramukh', rank: 20 },
    { post: 'MEMBER', title: 'Member', rank: 10 },
  ],
};

export default function OrganisationPage() {
  const me = useSession();
  const { data, error, loading } = useApi<{ levels: Level[] }>('/admin/organisation');
  const base = data?.levels.length ? data.levels : FALLBACK;
  const known = new Set(base.flatMap((level) => level.posts.map((post) => post.post)));
  // District Secretary is a real post with rank 60 but is not part of the seeded levels.
  const withSecretary = base.map((level) =>
    level.code === 'DISTRICT' && !known.has('DISTRICT_SECRETARY')
      ? { ...level, posts: [...level.posts, { post: 'DISTRICT_SECRETARY', title: 'District Secretary', rank: 60 }] }
      : level,
  );
  const levels = data || !loading ? [...withSecretary, EXTRA] : [];
  const assignable = new Set(me.assignablePosts.map((item) => item.post));

  return (
    <>
      <PageHeader title="Hierarchy" subtitle="How posts rank across the organisation. A post can manage and assign every post below it." />
      {error ? <Alert>{error}</Alert> : null}

      <div className="grid-main">
        <Card title="Posts by level" flush>
          {levels.length === 0 ? (
            <div className="card-body stack">
              <Skeleton height={40} />
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          ) : (
            levels.map((level) => (
              <div className="level" key={level.code}>
                <div>
                  <div className="level-name">{level.name}</div>
                  <div className="cell-sub">{level.posts.length} post{level.posts.length === 1 ? '' : 's'}</div>
                </div>
                <div className="chips">
                  {[...level.posts]
                    .sort((a, b) => b.rank - a.rank)
                    .map((post) => {
                      const mine = post.post === me.post;
                      const can = assignable.has(post.post);
                      return (
                        <span key={post.post} className={`chip ${mine ? 'mine' : can ? 'can' : ''}`} title={`Rank ${post.rank}`}>
                          {post.title}
                          <small className="num">{post.rank}</small>
                        </span>
                      );
                    })}
                </div>
              </div>
            ))
          )}
        </Card>

        <div className="stack">
          <Card title="Your position">
            <div className="stack" style={{ gap: 12 }}>
              <div className="who">
                <span className="list-icon tone-accent">
                  <Icon.Shield />
                </span>
                <div>
                  <div className="cell-main">{postTitle(me.post)}</div>
                  <div className="cell-sub num">Rank {me.rank}</div>
                </div>
              </div>
              <div className="who">
                <span className="list-icon tone-brand">
                  <Icon.Pin />
                </span>
                <div>
                  <div className="cell-main">{me.area.name}</div>
                  <div className="cell-sub">{AREA_LEVEL[me.area.level] ?? me.area.level} you manage</div>
                </div>
              </div>
            </div>
          </Card>
          <Card title="Legend">
            <div className="stack" style={{ gap: 10 }}>
              <div className="row">
                <span className="chip mine">Your post</span>
              </div>
              <div className="row">
                <span className="chip can">You can assign</span>
                <Badge tone="brand">{me.assignablePosts.length} posts</Badge>
              </div>
              <div className="row">
                <span className="chip">Above your post</span>
              </div>
              <div className="cell-sub">The small number is the rank. Higher ranks see and manage lower ones in their area.</div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
