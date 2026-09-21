'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Alert, Button } from '@/components/ui';
import { publicApi } from '@/lib/api';
import { isSignedIn, setTokens } from '@/lib/auth';
import { useT } from '@/lib/i18n';

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (isSignedIn()) router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function sendOtp(event?: FormEvent) {
    event?.preventDefault();
    if (mobile.length !== 10) {
      setError(t('err_mobile_10'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await publicApi.requestOtp(mobile);
      setSent(true);
      setCode('');
      setResendIn(data.resendIn ?? 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('err_send_otp'));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6) {
      setError(t('err_otp_6'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await publicApi.verifyOtp(mobile, code);
      setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('err_verify_otp'));
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth-brand">
        <div className="sidebar-brand" style={{ padding: 0 }}>
          <div className="sidebar-logo">RPD</div>
          <div>
            <b>{t('app_name')}</b>
            <span>{t('app_tag')}</span>
          </div>
        </div>
        <div>
          <h2>{t('login_lede')}</h2>
          <p>{t('login_sub')}</p>
          <ul className="auth-points">
            <li>
              <Icon.CheckShield /> {t('login_point_verify')}
            </li>
            <li>
              <Icon.Megaphone /> {t('login_point_grievance')}
            </li>
            <li>
              <Icon.Calendar /> {t('login_point_events')}
            </li>
            <li>
              <Icon.Users /> {t('login_point_members')}
            </li>
          </ul>
        </div>
        <p style={{ fontSize: 12.5 }}>{t('login_footnote')}</p>
      </section>

      <section className="auth-form">
        <form className="auth-card" onSubmit={sent ? verify : sendOtp} noValidate>
          <div className="between">
            <h1>{sent ? t('enter_otp') : t('sign_in')}</h1>
            <LanguageSwitcher />
          </div>
          <p className="auth-sub">
            {sent ? (
              <>
                {t('otp_sent_to')} <b>+91 {mobile}</b>.
              </>
            ) : (
              t('use_registered_number')
            )}
          </p>

          {error ? <Alert>{error}</Alert> : null}

          {!sent ? (
            <label className="field">
              <span>{t('mobile_number')}</span>
              <div className="phone">
                <span>+91</span>
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  autoFocus
                />
              </div>
            </label>
          ) : (
            <label className="field">
              <span>{t('one_time_password')}</span>
              <input
                className="input otp-input num"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
              />
            </label>
          )}

          <Button type="submit" variant="primary" className="btn-block" loading={busy}>
            {sent ? t('verify_and_continue') : t('send_otp')}
          </Button>

          {sent ? (
            <div className="between small">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSent(false);
                  setCode('');
                  setError('');
                }}
              >
                {t('change_number')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={resendIn > 0 || busy} onClick={() => sendOtp()}>
                {resendIn > 0 ? t('resend_in', { n: resendIn }) : t('resend_otp')}
              </button>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
}
