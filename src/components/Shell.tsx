'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { clearSession, isSignedIn } from '@/lib/auth';
import { AREA_LEVEL, postTitle } from '@/lib/format';
import type { SessionMe } from '@/lib/types';
import { Icon } from './icons';
import { CountsContext, SessionContext, type NavCounts } from './session';
import { Avatar, Button, ConfirmModal, ToastProvider } from './ui';

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  count?: keyof NavCounts;
  superAdmin?: boolean;
};

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: <Icon.Dashboard /> }],
  },
  {
    title: 'Field work',
    items: [
      { href: '/verification', label: 'Verification', icon: <Icon.CheckShield />, count: 'awaitingReview' },
      { href: '/activities', label: 'Activities', icon: <Icon.Activity /> },
      { href: '/events', label: 'Events', icon: <Icon.Calendar /> },
      { href: '/tasks', label: 'Tasks', icon: <Icon.Clipboard /> },
    ],
  },
  {
    title: 'Public',
    items: [
      { href: '/grievances', label: 'Grievances', icon: <Icon.Megaphone />, count: 'openGrievances' },
      { href: '/my-grievances', label: 'Assigned to me', icon: <Icon.Clipboard />, count: 'assignedToMe' },
      { href: '/engagement', label: 'Polls & quizzes', icon: <Icon.Sparkle />, superAdmin: true },
    ],
  },
  {
    title: 'Organisation',
    items: [
      { href: '/members', label: 'Members', icon: <Icon.Users /> },
      { href: '/organisation', label: 'Hierarchy', icon: <Icon.Sitemap /> },
      { href: '/booths', label: 'Booths', icon: <Icon.Building /> },
    ],
  },
];

const TITLES: [string, string][] = NAV.flatMap((group) => group.items.map((item) => [item.href, item.label] as [string, string]));

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<SessionMe | null>(null);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState<NavCounts | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    api<SessionMe>('/admin/me')
      .then(setMe)
      .catch((err: Error) => setError(err.message));
  }, [router]);

  const refreshCounts = useCallback(() => {
    api<NavCounts>('/admin/counts')
      .then(setCounts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!me) return;
    refreshCounts();
    const timer = setInterval(refreshCounts, 60_000);
    return () => clearInterval(timer);
  }, [me, refreshCounts]);

  useEffect(() => setMenuOpen(false), [path]);

  function signOut() {
    clearSession();
    router.replace('/login');
  }

  if (error && !me) {
    return (
      <div className="auth-form" style={{ minHeight: '100vh' }}>
        <div className="card card-body auth-card" style={{ maxWidth: 420 }}>
          <div className="empty-icon tone-bad" style={{ margin: 0 }}>
            <Icon.Shield />
          </div>
          <h1 style={{ fontSize: 22 }}>Cannot open the portal</h1>
          <p className="auth-sub" style={{ margin: 0 }}>
            {error}
          </p>
          <Button variant="primary" onClick={signOut}>
            Sign in again
          </Button>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="row muted">
          <span className="spinner" /> Opening portal…
        </div>
      </div>
    );
  }

  const title = TITLES.find(([href]) => path.startsWith(href))?.[1] ?? 'RPD Admin';

  return (
    <SessionContext.Provider value={me}>
      <CountsContext.Provider value={{ counts, refreshCounts }}>
        <ToastProvider>
          <div className="shell">
            <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
              <div className="sidebar-brand">
                <div className="sidebar-logo">RPD</div>
                <div>
                  <b>RPD Admin</b>
                  <span>Sangathan portal</span>
                </div>
              </div>
              <nav>
                {NAV.map((group) => {
                  const items = group.items.filter((item) => !item.superAdmin || me.member.isSuperAdmin);
                  if (!items.length) return null;
                  return (
                    <div className="nav-group" key={group.title}>
                      <div className="nav-group-title">{group.title}</div>
                      {items.map((item) => {
                        const count = item.count && counts ? counts[item.count] : 0;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-link ${path.startsWith(item.href) ? 'active' : ''}`}
                            aria-current={path.startsWith(item.href) ? 'page' : undefined}
                          >
                            {item.icon}
                            {item.label}
                            {count ? <span className="nav-count num">{count > 99 ? '99+' : count}</span> : null}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </nav>
              <div className="sidebar-spacer" />
              <div className="sidebar-user">
                <div className="sidebar-user-row">
                  <Avatar name={me.member.fullName} url={me.member.photoUrl} size={36} />
                  <div style={{ minWidth: 0 }}>
                    <b className="truncate">{me.member.fullName || 'Officer'}</b>
                    <span>{postTitle(me.post)}</span>
                  </div>
                </div>
                <button
                  className="sidebar-signout"
                  onClick={() => {
                    // On phones the menu sits above dialogs, so close it first.
                    setMenuOpen(false);
                    setConfirmSignOut(true);
                  }}
                >
                  <Icon.Logout />
                  Sign out
                </button>
              </div>
            </aside>
            <div className={`scrim ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
            <div className="content">
              <header className="topbar">
                <button className="topbar-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                  <Icon.Menu />
                </button>
                <span className="topbar-title">{title}</span>
                <span className="topbar-spacer" />
                <span className="area-chip" title="The area you manage">
                  <Icon.Pin />
                  <span>{AREA_LEVEL[me.area.level] ?? me.area.level} ·</span>
                  <b>{me.area.name}</b>
                </span>
              </header>
              <main className="page">{children}</main>
            </div>
          </div>
          <ConfirmModal
            open={confirmSignOut}
            title="Sign out?"
            message={
              <>
                You will need your mobile number and a new OTP to sign in to the admin portal again.
              </>
            }
            confirmLabel="Sign out"
            danger
            onClose={() => setConfirmSignOut(false)}
            onConfirm={() => {
              setConfirmSignOut(false);
              signOut();
            }}
          />
        </ToastProvider>
      </CountsContext.Provider>
    </SessionContext.Provider>
  );
}
