'use client';

import { GrievanceList } from '@/components/GrievanceList';
import { PageHeader } from '@/components/ui';

export default function GrievancesPage() {
  return (
    <>
      <PageHeader
        title="Grievances"
        subtitle="Public issues raised by members in your area. Open one to assign it to an office bearer below you."
      />
      <GrievanceList />
    </>
  );
}
