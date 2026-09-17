'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { Alert, Badge, Card, EmptyState, PageHeader, Progress, SearchInput, TableSkeleton } from '@/components/ui';
import { dash, num, plural, titleCase, type Tone } from '@/lib/format';
import { useApi } from '@/lib/hooks';

type Booth = {
  id: string;
  code: string;
  name: string;
  boothNumber: number;
  village: string | null;
  pincode: string | null;
  memberCount: number;
  voterCount: number;
  healthScore: number;
  healthBand: string;
  mandalName: string | null;
  assemblyName: string | null;
  districtName: string | null;
};

function healthTone(score: number): Tone {
  if (score >= 75) return 'ok';
  if (score >= 50) return 'warn';
  return 'bad';
}

export default function BoothsPage() {
  const { data, error, loading } = useApi<{ booths: Booth[] }>('/admin/booths');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const booths = data?.booths ?? [];
    if (!term) return booths;
    return booths.filter((row) =>
      [row.code, row.name, row.village, row.mandalName, row.pincode].some((value) => value?.toLowerCase().includes(term)),
    );
  }, [data, q]);

  return (
    <>
      <PageHeader title="Booths" subtitle="Booths in your area with membership coverage and health score." />
      {error ? <Alert>{error}</Alert> : null}

      <Card flush>
        <div className="toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search code, name, village or pincode" />
          {data ? <span className="muted small num" style={{ marginLeft: 'auto' }}>{plural(rows.length, 'booth')}</span> : null}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Booth</th>
                <th>Mandal / Assembly</th>
                <th>Members</th>
                <th>Coverage</th>
                <th>Health</th>
              </tr>
            </thead>
            {!data && loading ? (
              <TableSkeleton cols={5} />
            ) : (
              <tbody>
                {rows.map((row) => {
                  const coverage = row.voterCount ? Math.round((row.memberCount / row.voterCount) * 1000) / 10 : 0;
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="cell-main">
                          {row.code} · {row.name}
                        </div>
                        <div className="cell-sub">
                          {dash(row.village)}
                          {row.pincode ? ` · ${row.pincode}` : ''}
                        </div>
                      </td>
                      <td>
                        <div>{dash(row.mandalName)}</div>
                        <div className="cell-sub">{dash(row.assemblyName)}</div>
                      </td>
                      <td className="num">
                        <b>{num(row.memberCount)}</b>
                        <div className="cell-sub">of {num(row.voterCount)} voters</div>
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <div className="small num" style={{ marginBottom: 4 }}>{coverage}%</div>
                        <Progress value={coverage} />
                      </td>
                      <td>
                        <Badge tone={healthTone(row.healthScore)}>
                          <span className="num">{row.healthScore}</span> · {titleCase(row.healthBand)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>
        {data && rows.length === 0 ? (
          <EmptyState
            icon={<Icon.Building />}
            title={q ? 'No booths match' : 'No booths in your area yet'}
            text={q ? undefined : 'Booths appear here once they are added for your area.'}
          />
        ) : null}
      </Card>
    </>
  );
}
