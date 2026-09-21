'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import { useSession } from '@/components/session';
import { Alert, Badge, Button, Card, ConfirmModal, EmptyState, Field, Modal, PageHeader, TableSkeleton, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { dateRange } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { useT } from '@/lib/i18n';

type Option = { id?: string; label: string; isCorrect?: boolean };
type Question = { id?: string; prompt: string; options: Option[] };
type EngagementEvent = {
  id: string;
  type: 'POLL' | 'QUIZ';
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  published: boolean;
  questions: Question[];
};

function emptyQuestion(): Question {
  return { prompt: '', options: [{ label: '' }, { label: '' }] };
}

function toLocal(value: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/** Returns a dictionary key, so the label follows the chosen language. */
function liveState(event: EngagementEvent) {
  if (!event.published) return { key: 'en_state_hidden', live: false, tone: 'neutral' as const };
  const now = Date.now();
  if (new Date(event.endsAt).getTime() < now) return { key: 'en_state_ended', live: false, tone: 'neutral' as const };
  if (new Date(event.startsAt).getTime() > now) return { key: 'en_state_scheduled', live: false, tone: 'brand' as const };
  return { key: 'en_state_live', live: true, tone: 'ok' as const };
}

export default function EngagementPage() {
  const t = useT();
  const me = useSession();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ events: EngagementEvent[] }>(me.member.isSuperAdmin ? '/admin/engagement-events' : null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<EngagementEvent | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!me.member.isSuperAdmin) {
    return (
      <>
        <PageHeader title={t('en_title')} />
        <Card>
          <EmptyState icon={<Icon.Shield />} title={t('en_super_only')} text={t('en_super_only_sub')} />
        </Card>
      </>
    );
  }

  async function togglePublished(event: EngagementEvent) {
    setBusyId(event.id);
    try {
      await api(`/admin/engagement-events/${event.id}`, { method: 'PATCH', body: JSON.stringify({ published: !event.published }) });
      toast(event.published ? t('toast_hidden') : t('toast_published'));
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('err_could_not_update'), 'bad');
    } finally {
      setBusyId(null);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await api(`/admin/engagement-events/${deleting.id}`, { method: 'DELETE' });
      toast(t('toast_deleted'));
      setDeleting(null);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('err_could_not_delete'), 'bad');
    } finally {
      setBusyId(null);
    }
  }

  const events = data?.events ?? [];

  return (
    <>
      <PageHeader
        title={t('en_title')}
        subtitle={t('en_subtitle')}
        actions={
          <Button variant="accent" icon={<Icon.Plus />} onClick={() => setCreating(true)}>
            {t('en_new')}
          </Button>
        }
      />
      {error ? <Alert>{error}</Alert> : null}

      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('col_title')}</th>
                <th>{t('col_type')}</th>
                <th>{t('col_runs')}</th>
                <th>{t('col_questions')}</th>
                <th>{t('col_state')}</th>
                <th />
              </tr>
            </thead>
            {!data && loading ? (
              <TableSkeleton cols={6} />
            ) : (
              <tbody>
                {events.map((event) => {
                  const state = liveState(event);
                  return (
                    <tr key={event.id}>
                      <td style={{ maxWidth: 340 }}>
                        <div className="cell-main">{event.title}</div>
                        <div className="cell-sub clamp-2">{event.description}</div>
                      </td>
                      <td>
                        <Badge tone={event.type === 'QUIZ' ? 'accent' : 'brand'}>{event.type === 'QUIZ' ? t('en_quiz') : t('en_poll')}</Badge>
                      </td>
                      <td className="cell-sub">{dateRange(event.startsAt, event.endsAt)}</td>
                      <td className="num">{event.questions.length}</td>
                      <td>
                        <Badge tone={state.tone} dot={state.live}>
                          {t(state.key)}
                        </Badge>
                      </td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <Button size="sm" loading={busyId === event.id && !deleting} onClick={() => togglePublished(event)}>
                            {event.published ? t('vi_hide') : t('vi_publish')}
                          </Button>
                          <button className="icon-btn" aria-label={t('delete')} onClick={() => setDeleting(event)}>
                            <Icon.Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>
        {data && events.length === 0 ? (
          <EmptyState icon={<Icon.Sparkle />} title={t('en_empty')} text={t('en_empty_sub')} />
        ) : null}
      </Card>

      <BuilderModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          toast(t('toast_engagement_published'));
          void reload();
        }}
      />
      <ConfirmModal
        open={Boolean(deleting)}
        title={t('en_delete_q')}
        danger
        busy={Boolean(deleting) && busyId === deleting?.id}
        confirmLabel={t('delete')}
        message={t('en_delete_msg', { title: deleting?.title ?? '' })}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </>
  );
}

function BuilderModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const t = useT();
  const [type, setType] = useState<'POLL' | 'QUIZ'>('POLL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(toLocal(new Date()));
  const [endsAt, setEndsAt] = useState(toLocal(new Date(Date.now() + 7 * 86400000)));
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function updateQuestion(index: number, next: Question) {
    setQuestions((list) => list.map((item, i) => (i === index ? next : item)));
  }

  const quizMissingAnswer = type === 'QUIZ' && questions.some((question) => !question.options.some((option) => option.isCorrect));
  const incomplete =
    title.trim().length < 2 ||
    description.trim().length < 2 ||
    questions.some((question) => question.prompt.trim().length < 2 || question.options.some((option) => !option.label.trim()));

  async function submit() {
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError(t('en_end_after_start'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/admin/engagement-events', {
        method: 'POST',
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          published: true,
          questions: questions.map((question) => ({
            prompt: question.prompt.trim(),
            options: question.options.map((option) => ({ label: option.label.trim(), isCorrect: option.isCorrect === true })),
          })),
        }),
      });
      setTitle('');
      setDescription('');
      setQuestions([emptyQuestion()]);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('err_could_not_publish'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      wide
      title={t('en_new')}
      onClose={onClose}
      footer={
        <>
          {quizMissingAnswer ? <span className="small muted" style={{ marginRight: 'auto' }}>{t('en_mark_correct')}</span> : null}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button variant="accent" loading={busy} disabled={incomplete || quizMissingAnswer} onClick={submit}>
            {t('publish')}
          </Button>
        </>
      }
    >
      {error ? <Alert>{error}</Alert> : null}
      <div className="grid-2">
        <Field label={t('field_type')}>
          <select className="select" value={type} onChange={(e) => setType(e.target.value as 'POLL' | 'QUIZ')}>
            <option value="POLL">{t('en_type_poll')}</option>
            <option value="QUIZ">{t('en_type_quiz')}</option>
          </select>
        </Field>
        <Field label={t('col_title')}>
          <input className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      </div>
      <Field label={t('field_description')}>
        <textarea className="textarea" value={description} maxLength={2000} rows={2} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="grid-2">
        <Field label={t('kv_starts')}>
          <input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </Field>
        <Field label={t('kv_ends')}>
          <input className="input" type="datetime-local" value={endsAt} min={startsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </Field>
      </div>

      {questions.map((question, index) => (
        <div key={index} className="card card-body" style={{ display: 'grid', gap: 10, background: 'var(--surface-2)' }}>
          <div className="between">
            <b>{t('en_question_n', { n: index + 1 })}</b>
            {questions.length > 1 ? (
              <button className="icon-btn" aria-label={t('en_remove_question')} onClick={() => setQuestions((list) => list.filter((_, i) => i !== index))}>
                <Icon.Trash />
              </button>
            ) : null}
          </div>
          <input
            className="input"
            placeholder={t('en_ask_something')}
            value={question.prompt}
            maxLength={400}
            onChange={(e) => updateQuestion(index, { ...question, prompt: e.target.value })}
          />
          {question.options.map((option, optionIndex) => (
            <div key={optionIndex} className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                className="input"
                placeholder={t('en_option_n', { n: optionIndex + 1 })}
                value={option.label}
                maxLength={200}
                onChange={(e) =>
                  updateQuestion(index, {
                    ...question,
                    options: question.options.map((item, i) => (i === optionIndex ? { ...item, label: e.target.value } : item)),
                  })
                }
              />
              {type === 'QUIZ' ? (
                <label className="check nowrap small">
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    checked={option.isCorrect === true}
                    onChange={() =>
                      updateQuestion(index, {
                        ...question,
                        options: question.options.map((item, i) => ({ ...item, isCorrect: i === optionIndex })),
                      })
                    }
                  />
                  {t('en_correct')}
                </label>
              ) : null}
              {question.options.length > 2 ? (
                <button
                  className="icon-btn"
                  aria-label={t('en_remove_option')}
                  onClick={() => updateQuestion(index, { ...question, options: question.options.filter((_, i) => i !== optionIndex) })}
                >
                  <Icon.Close />
                </button>
              ) : null}
            </div>
          ))}
          {question.options.length < 8 ? (
            <div>
              <Button size="sm" variant="ghost" icon={<Icon.Plus />} onClick={() => updateQuestion(index, { ...question, options: [...question.options, { label: '' }] })}>
                {t('en_add_option')}
              </Button>
            </div>
          ) : null}
        </div>
      ))}
      {questions.length < 20 ? (
        <div>
          <Button icon={<Icon.Plus />} onClick={() => setQuestions((list) => [...list, emptyQuestion()])}>
            {t('en_add_question')}
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
