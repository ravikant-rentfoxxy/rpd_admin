'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { Icon } from './icons';
import { Alert, Button, Card, useToast } from './ui';

const X_LIMIT = 280;
const TOKEN = /[@#][A-Za-z0-9_]+/g;

/** Highlights the @handles and #hashtags inside the generated post. */
function Highlighted({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <b key={`${start}-${match[0]}`} style={{ color: 'var(--brand-mid)' }}>
        {match[0]}
      </b>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/**
 * Writes a ready-to-post X message for a grievance with AI, the same endpoint the
 * mobile app's "Summary by AI" uses.
 */
export function XPostCard({ postId }: { postId: string }) {
  const t = useT();
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const data = await api<{ summary: string }>(`/posts/${postId}/summary`, { method: 'POST' });
      if (!data.summary?.trim()) {
        setError(t('x_err_empty'));
        return;
      }
      setText(data.summary.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('x_err_failed'));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(t('x_err_copy'), 'bad');
    }
  }

  const length = [...text].length;
  const over = length > X_LIMIT;

  return (
    <Card
      title={
        <span className="row" style={{ gap: 8 }}>
          <span style={{ width: 16, display: 'inline-flex', color: 'var(--accent)' }}>
            <Icon.Sparkle />
          </span>
          {t('x_title')}
        </span>
      }
      subtitle={t('x_subtitle')}
    >
      {error ? <Alert>{error}</Alert> : null}

      {text ? (
        <div className="stack" style={{ gap: 12 }}>
          <div className="x-post">
            <Highlighted text={text} />
          </div>
          <div className="between">
            <span className={`small num ${over ? 'strong' : 'muted'}`} style={over ? { color: 'var(--bad)' } : undefined}>
              {t('x_chars', { n: length, limit: X_LIMIT })}
              {over ? t('x_too_long') : ''}
            </span>
            <span className="small muted">{t('x_check_first')}</span>
          </div>
          <div className="row">
            <a
              className="btn btn-primary"
              href={`https://x.com/intent/post?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon.External />
              {t('x_post_on_x')}
            </a>
            <Button icon={copied ? <Icon.Check /> : undefined} onClick={copy}>
              {copied ? t('x_copied') : t('x_copy')}
            </Button>
            <Button variant="ghost" icon={<Icon.Refresh />} loading={busy} onClick={generate}>
              {t('x_rewrite')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          <p className="muted" style={{ margin: 0 }}>
            {t('x_intro')}
          </p>
          <div>
            <Button variant="accent" icon={<Icon.Sparkle />} loading={busy} onClick={generate}>
              {busy ? t('x_writing') : t('x_write')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
