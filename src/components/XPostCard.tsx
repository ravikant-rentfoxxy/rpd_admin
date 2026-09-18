'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
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
        setError('The AI could not write a post for this grievance. Try again.');
        return;
      }
      setText(data.summary.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not write the post');
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
      toast('Could not copy. Select the text and copy it manually.', 'bad');
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
          Post for X
        </span>
      }
      subtitle="Written by AI from this grievance, with the responsible departments tagged."
    >
      {error ? <Alert>{error}</Alert> : null}

      {text ? (
        <div className="stack" style={{ gap: 12 }}>
          <div className="x-post">
            <Highlighted text={text} />
          </div>
          <div className="between">
            <span className={`small num ${over ? 'strong' : 'muted'}`} style={over ? { color: 'var(--bad)' } : undefined}>
              {length}/{X_LIMIT} characters{over ? ' · too long for X' : ''}
            </span>
            <span className="small muted">Check before posting</span>
          </div>
          <div className="row">
            <a
              className="btn btn-primary"
              href={`https://x.com/intent/post?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon.External />
              Post on X
            </a>
            <Button icon={copied ? <Icon.Check /> : undefined} onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="ghost" icon={<Icon.Refresh />} loading={busy} onClick={generate}>
              Rewrite
            </Button>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          <p className="muted" style={{ margin: 0 }}>
            The AI reads this grievance and writes one short message for X, under 280 characters, tagging the departments
            responsible for this kind of issue.
          </p>
          <div>
            <Button variant="accent" icon={<Icon.Sparkle />} loading={busy} onClick={generate}>
              {busy ? 'Writing…' : 'Write post with AI'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
