'use client';

import { createContext, useContext } from 'react';
import type { SessionMe } from '@/lib/types';

export const SessionContext = createContext<SessionMe | null>(null);

/** The signed-in officer. Only available inside the portal shell. */
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside the portal shell');
  return session;
}

export type NavCounts = { awaitingReview: number; openGrievances: number };

export const CountsContext = createContext<{ counts: NavCounts | null; refreshCounts: () => void }>({
  counts: null,
  refreshCounts: () => {},
});

/** Navigation badge counts; call refreshCounts after an action that changes them. */
export function useCounts() {
  return useContext(CountsContext);
}
