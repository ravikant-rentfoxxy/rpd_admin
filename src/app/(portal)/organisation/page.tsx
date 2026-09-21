'use client';

import { Icon } from '@/components/icons';
import { useSession } from '@/components/session';
import { Alert, Badge, Card, PageHeader, Skeleton } from '@/components/ui';
import { AREA_LEVEL, plural, postTitle } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { t as translate, useT } from '@/lib/i18n';

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

/** Server level names arrive in English; show our own wording when we know the code. */
function levelName(level: Level) {
  const key = `or_level_${level.code}`;
  const label = translate(key);
  return label === key ? level.name : label;
}

export default function OrganisationPage() {
  const t = useT();
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
      <PageHeader title={t('or_title')} subtitle={t('or_subtitle')} />
      {error ? <Alert>{error}</Alert> : null}

      <div className="grid-main">
        <Card title={t('or_posts_by_level')} flush>
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
                  <div className="level-name">{levelName(level)}</div>
                  <div className="cell-sub">{plural(level.posts.length, 'post')}</div>
                </div>
                <div className="chips">
                  {[...level.posts]
                    .sort((a, b) => b.rank - a.rank)
                    .map((post) => {
                      const mine = post.post === me.post;
                      const can = assignable.has(post.post);
                      return (
                        <span key={post.post} className={`chip ${mine ? 'mine' : can ? 'can' : ''}`} title={t('or_rank_title', { n: post.rank })}>
                          {postTitle(post.post)}
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
          <Card title={t('or_your_position')}>
            <div className="stack" style={{ gap: 12 }}>
              <div className="who">
                <span className="list-icon tone-accent">
                  <Icon.Shield />
                </span>
                <div>
                  <div className="cell-main">{postTitle(me.post)}</div>
                  <div className="cell-sub num">{t('or_rank', { n: me.rank })}</div>
                </div>
              </div>
              <div className="who">
                <span className="list-icon tone-brand">
                  <Icon.Pin />
                </span>
                <div>
                  <div className="cell-main">{me.area.name}</div>
                  <div className="cell-sub">{t('or_level_you_manage', { level: AREA_LEVEL()[me.area.level] ?? me.area.level })}</div>
                </div>
              </div>
            </div>
          </Card>
          <Card title={t('or_legend')}>
            <div className="stack" style={{ gap: 10 }}>
              <div className="row">
                <span className="chip mine">{t('or_your_post')}</span>
              </div>
              <div className="row">
                <span className="chip can">{t('or_you_can_assign')}</span>
                <Badge tone="brand">{plural(me.assignablePosts.length, 'post')}</Badge>
              </div>
              <div className="row">
                <span className="chip">{t('or_above_your_post')}</span>
              </div>
              <div className="cell-sub">{t('or_legend_note')}</div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
