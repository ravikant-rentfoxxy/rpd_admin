'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { clearSession, isSignedIn } from '@/lib/auth';
import { AREA_LEVEL, postTitle } from '@/lib/format';
import { useT } from '@/lib/i18n';
import type { SessionMe } from '@/lib/types';
import { Icon } from './icons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { CountsContext, SessionContext, type NavCounts } from './session';
import { Avatar, Button, ConfirmModal, ToastProvider } from './ui';

type NavItem = {
  href: string;
  /** Dictionary key; resolved at render time so it follows the language. */
  label: string;
  icon: ReactNode;
  count?: keyof NavCounts;
  superAdmin?: boolean;
};

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'nav_overview',
    items: [{ href: '/dashboard', label: 'nav_dashboard', icon: <Icon.Dashboard /> }],
  },
  {
    title: 'nav_field_work',
    items: [
      { href: '/verification', label: 'nav_verification', icon: <Icon.CheckShield />, count: 'awaitingReview' },
      { href: '/activities', label: 'nav_activities', icon: <Icon.Activity /> },
      { href: '/events', label: 'nav_events', icon: <Icon.Calendar /> },
      { href: '/tasks', label: 'nav_tasks', icon: <Icon.Clipboard /> },
    ],
  },
  {
    title: 'nav_public',
    items: [
      { href: '/grievances', label: 'nav_grievances', icon: <Icon.Megaphone />, count: 'openGrievances' },
      { href: '/my-grievances', label: 'nav_assigned_to_me', icon: <Icon.Clipboard />, count: 'assignedToMe' },
      { href: '/engagement', label: 'nav_engagement', icon: <Icon.Sparkle />, superAdmin: true },
    ],
  },
  {
    title: 'nav_content',
    items: [
      { href: '/videos', label: 'nav_videos', icon: <Icon.Video /> },
      { href: '/blogs', label: 'nav_blogs', icon: <Icon.File /> },
    ],
  },
  {
    title: 'nav_organisation',
    items: [
      { href: '/members', label: 'nav_members', icon: <Icon.Users /> },
      { href: '/organisation', label: 'nav_hierarchy', icon: <Icon.Sitemap /> },
      { href: '/booths', label: 'nav_booths', icon: <Icon.Building /> },
    ],
  },
];

const TITLES: [string, string][] = NAV.flatMap((group) => group.items.map((item) => [item.href, item.label] as [string, string]));

export function Shell({ children }: { children: ReactNode }) {
  const t = useT();
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
          <h1 style={{ fontSize: 22 }}>{t('cannot_open_portal')}</h1>
          <p className="auth-sub" style={{ margin: 0 }}>
            {error}
          </p>
          <Button variant="primary" onClick={signOut}>
            {t('sign_in_again')}
          </Button>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="row muted">
          <span className="spinner" /> {t('opening_portal')}
        </div>
      </div>
    );
  }

  const titleKey = TITLES.find(([href]) => path.startsWith(href))?.[1];
  const title = titleKey ? t(titleKey) : t('app_name');

  return (
    <SessionContext.Provider value={me}>
      <CountsContext.Provider value={{ counts, refreshCounts }}>
        <ToastProvider>
          <div className="shell">
            <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
              <div className="sidebar-brand">
                <div className="sidebar-logo">RPD</div>
                <div>
                  <b>{t('app_name')}</b>
                  <span>{t('app_tag')}</span>
                </div>
              </div>
              <nav>
                {NAV.map((group) => {
                  const items = group.items.filter((item) => !item.superAdmin || me.member.isSuperAdmin);
                  if (!items.length) return null;
                  return (
                    <div className="nav-group" key={group.title}>
                      <div className="nav-group-title">{t(group.title)}</div>
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
                            {t(item.label)}
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
                    <b className="truncate">{me.member.fullName || t('officer')}</b>
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
                  {t('sign_out')}
                </button>
              </div>
            </aside>
            <div className={`scrim ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
            <div className="content">
              <header className="topbar">
                <button className="topbar-menu" onClick={() => setMenuOpen(true)} aria-label={t('open_menu')}>
                  <Icon.Menu />
                </button>
                <span className="topbar-title">{title}</span>
                <span className="topbar-spacer" />
                <LanguageSwitcher />
                <span className="area-chip" title={t('area_you_manage')}>
                  <Icon.Pin />
                  <span>{AREA_LEVEL()[me.area.level] ?? me.area.level} ·</span>
                  <b>{me.area.name}</b>
                </span>
              </header>
              <main className="page">{children}</main>
            </div>
          </div>
          <ConfirmModal
            open={confirmSignOut}
            title={t('sign_out_q')}
            message={t('sign_out_msg')}
            confirmLabel={t('sign_out')}
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
