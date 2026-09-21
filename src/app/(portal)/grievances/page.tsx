'use client';

import { GrievanceList } from '@/components/GrievanceList';
import { PageHeader } from '@/components/ui';
import { useT } from '@/lib/i18n';

export default function GrievancesPage() {
  const t = useT();
  return (
    <>
      <PageHeader
        title={t('gr_title')}
        subtitle={t('gr_subtitle')}
      />
      <GrievanceList />
    </>
  );
}
