'use client';

import { GrievanceList } from '@/components/GrievanceList';
import { PageHeader } from '@/components/ui';

export default function MyGrievancesPage() {
  return (
    <>
      <PageHeader
        title="Assigned to me"
        subtitle="Grievances a senior office bearer handed to you. Open one to see the details and write a post for X."
      />
      <GrievanceList mine />
    </>
  );
}
