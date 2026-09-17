'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { Alert, Button } from '@/components/ui';
import { publicApi } from '@/lib/api';
import { isSignedIn, setTokens } from '@/lib/auth';

export default function LoginPage() {
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
      setError('Enter your 10-digit mobile number.');
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
      setError(err instanceof Error ? err.message : 'Could not send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await publicApi.verifyOtp(mobile, code);
      setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify OTP');
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth-brand">
        <div className="sidebar-brand" style={{ padding: 0 }}>
          <div className="sidebar-logo">RPD</div>
          <div>
            <b>RPD Admin</b>
            <span>Sangathan portal</span>
          </div>
        </div>
        <div>
          <h2>Lead your area with a clear view of every activity.</h2>
          <p>Review field work, follow up on grievances, and track attendance for the members below you.</p>
          <ul className="auth-points">
            <li>
              <Icon.CheckShield /> Verify activities recorded in your area
            </li>
            <li>
              <Icon.Megaphone /> Assign and resolve public grievances
            </li>
            <li>
              <Icon.Calendar /> See who joined and checked in to events
            </li>
            <li>
              <Icon.Users /> Manage members and assign posts
            </li>
          </ul>
        </div>
        <p style={{ fontSize: 12.5 }}>For office bearers only · Panna Pramukh and above</p>
      </section>

      <section className="auth-form">
        <form className="auth-card" onSubmit={sent ? verify : sendOtp} noValidate>
          <div>
            <h1>{sent ? 'Enter OTP' : 'Sign in'}</h1>
          </div>
          <p className="auth-sub">
            {sent ? (
              <>
                We sent a 6-digit code to <b>+91 {mobile}</b>.
              </>
            ) : (
              'Use the mobile number registered in the RPD app.'
            )}
          </p>

          {error ? <Alert>{error}</Alert> : null}

          {!sent ? (
            <label className="field">
              <span>Mobile number</span>
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
              <span>One-time password</span>
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
            {sent ? 'Verify and continue' : 'Send OTP'}
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
                Change number
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={resendIn > 0 || busy} onClick={() => sendOtp()}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
              </button>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
}
