'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSignedIn } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(isSignedIn() ? '/dashboard' : '/login');
  }, [router]);
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="row muted">
        <span className="spinner" /> Opening…
      </div>
    </div>
  );
}
