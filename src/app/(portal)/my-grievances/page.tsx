'use client';

import { GrievanceList } from '@/components/GrievanceList';
import { PageHeader } from '@/components/ui';
import { useT } from '@/lib/i18n';

export default function MyGrievancesPage() {
  const t = useT();
  return (
    <>
      <PageHeader
        title={t('gr_mine_title')}
        subtitle={t('gr_mine_subtitle')}
      />
      <GrievanceList mine />
    </>
  );
}
