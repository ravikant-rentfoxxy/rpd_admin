'use client';

import { useState } from 'react';
import { ActivityDrawer, ReviewActions } from '@/components/ActivityDrawer';
import { Icon } from '@/components/icons';
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui';
import { ACTIVITY_COLORS, activityType, ago, dash, plural, when } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { ActivityRow } from '@/lib/types';

export default function VerificationPage() {
  const { data, error, loading, reload } = useApi<{ items: ActivityRow[] }>('/admin/verification');
  const [openId, setOpenId] = useState<string | null>(null);
  const items = data?.items ?? [];
  const flagged = items.filter((item) => item.reviewFlag).length;

  return (
    <>
      <PageHeader
        title="Verification"
        subtitle="Check field work from your area before points are confirmed. Flagged items are listed first."
        actions={
          <Button icon={<Icon.Refresh />} onClick={reload} loading={loading && Boolean(data)}>
            Refresh
          </Button>
        }
      />
      {error ? <Alert>{error}</Alert> : null}

      {data && items.length ? (
        <div className="row" style={{ marginBottom: 14 }}>
          <Badge tone="warn">{items.length} awaiting review</Badge>
          {flagged ? <Badge tone="bad">{flagged} flagged</Badge> : null}
        </div>
      ) : null}

      {!data && loading ? (
        <div className="stack">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <Skeleton height={54} />
            </Card>
          ))}
        </div>
      ) : items.length === 0 && data ? (
        <Card>
          <EmptyState icon={<Icon.CheckShield />} title="All caught up" text="There is no field work waiting for review in your area." />
        </Card>
      ) : (
        <div className="stack">
          {items.map((item) => {
            const color = ACTIVITY_COLORS[item.type] ?? '#9a94a6';
            const facts = [
              item.attendeeCount ? plural(item.attendeeCount, 'attendee') : '',
              item.homesCovered ? plural(item.homesCovered, 'home') : '',
              `${item.photoCount} photo${item.photoCount === 1 ? '' : 's'}`,
              item.distanceMetres != null ? `${item.distanceMetres} m from booth` : '',
            ].filter(Boolean);
            return (
              <Card key={item.id}>
                <div className="between" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div className="who" style={{ alignItems: 'flex-start', flex: '1 1 320px' }}>
                    <span className="list-icon" style={{ background: `${color}1a`, color }}>
                      <Icon.Activity />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <span className="cell-main">{activityType(item.type)}</span>
                        {item.reviewFlag ? (
                          <Badge tone="bad">
                            <span style={{ width: 12, display: 'inline-flex' }}>
                              <Icon.Flag />
                            </span>
                            Flagged
                          </Badge>
                        ) : null}
                      </div>
                      <div className="cell-sub">
                        {item.actorName} ({dash(item.actorNumber)}) · {when(item.occurredAt)} · {ago(item.occurredAt)}
                      </div>
                      <div className="cell-sub">
                        {item.boothName ? `${item.boothName} · ` : ''}
                        {facts.join(' · ')}
                      </div>
                      {item.farAwayReason ? <div className="small" style={{ marginTop: 4, color: 'var(--warn)' }}>Away from booth: “{item.farAwayReason}”</div> : null}
                      {item.notes ? <div className="clamp-2" style={{ marginTop: 6 }}>{item.notes}</div> : null}
                    </div>
                  </div>
                  <div className="row">
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(item.id)}>
                      View details
                    </Button>
                    <ReviewActions compact activityId={item.id} onDone={reload} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ActivityDrawer
        activityId={openId}
        onClose={() => setOpenId(null)}
        onReviewed={() => {
          setOpenId(null);
          reload();
        }}
      />
    </>
  );
}
