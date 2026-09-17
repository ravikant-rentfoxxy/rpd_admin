'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import { useSession } from '@/components/session';
import { Alert, Badge, Button, Card, ConfirmModal, EmptyState, Field, Modal, PageHeader, TableSkeleton, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { dateRange } from '@/lib/format';
import { useApi } from '@/lib/hooks';

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

function liveState(event: EngagementEvent) {
  if (!event.published) return { label: 'Hidden', tone: 'neutral' as const };
  const now = Date.now();
  if (new Date(event.endsAt).getTime() < now) return { label: 'Ended', tone: 'neutral' as const };
  if (new Date(event.startsAt).getTime() > now) return { label: 'Scheduled', tone: 'brand' as const };
  return { label: 'Live', tone: 'ok' as const };
}

export default function EngagementPage() {
  const me = useSession();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ events: EngagementEvent[] }>(me.member.isSuperAdmin ? '/admin/engagement-events' : null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<EngagementEvent | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!me.member.isSuperAdmin) {
    return (
      <>
        <PageHeader title="Polls & quizzes" />
        <Card>
          <EmptyState icon={<Icon.Shield />} title="Super admin only" text="Only a super admin can publish polls and quizzes." />
        </Card>
      </>
    );
  }

  async function togglePublished(event: EngagementEvent) {
    setBusyId(event.id);
    try {
      await api(`/admin/engagement-events/${event.id}`, { method: 'PATCH', body: JSON.stringify({ published: !event.published }) });
      toast(event.published ? 'Hidden from members' : 'Published');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update', 'bad');
    } finally {
      setBusyId(null);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await api(`/admin/engagement-events/${deleting.id}`, { method: 'DELETE' });
      toast('Deleted');
      setDeleting(null);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete', 'bad');
    } finally {
      setBusyId(null);
    }
  }

  const events = data?.events ?? [];

  return (
    <>
      <PageHeader
        title="Polls & quizzes"
        subtitle="Live polls and quizzes pop up on members' Home screen while they run."
        actions={
          <Button variant="accent" icon={<Icon.Plus />} onClick={() => setCreating(true)}>
            New poll or quiz
          </Button>
        }
      />
      {error ? <Alert>{error}</Alert> : null}

      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Runs</th>
                <th>Questions</th>
                <th>State</th>
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
                        <Badge tone={event.type === 'QUIZ' ? 'accent' : 'brand'}>{event.type === 'QUIZ' ? 'Quiz' : 'Poll'}</Badge>
                      </td>
                      <td className="cell-sub">{dateRange(event.startsAt, event.endsAt)}</td>
                      <td className="num">{event.questions.length}</td>
                      <td>
                        <Badge tone={state.tone} dot={state.label === 'Live'}>
                          {state.label}
                        </Badge>
                      </td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <Button size="sm" loading={busyId === event.id && !deleting} onClick={() => togglePublished(event)}>
                            {event.published ? 'Hide' : 'Publish'}
                          </Button>
                          <button className="icon-btn" aria-label="Delete" onClick={() => setDeleting(event)}>
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
          <EmptyState icon={<Icon.Sparkle />} title="No polls or quizzes yet" text="Create one to engage members on their Home screen." />
        ) : null}
      </Card>

      <BuilderModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          toast('Published. Members see it on Home while it is live.');
          void reload();
        }}
      />
      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete this event?"
        danger
        busy={Boolean(deleting) && busyId === deleting?.id}
        confirmLabel="Delete"
        message={
          <>
            <b>{deleting?.title}</b> will be removed for all members.
          </>
        }
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </>
  );
}

function BuilderModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
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
      setError('The end time must be after the start time.');
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
      setError(err instanceof Error ? err.message : 'Could not publish');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      wide
      title="New poll or quiz"
      onClose={onClose}
      footer={
        <>
          {quizMissingAnswer ? <span className="small muted" style={{ marginRight: 'auto' }}>Mark the correct answer for every quiz question.</span> : null}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="accent" loading={busy} disabled={incomplete || quizMissingAnswer} onClick={submit}>
            Publish
          </Button>
        </>
      }
    >
      {error ? <Alert>{error}</Alert> : null}
      <div className="grid-2">
        <Field label="Type">
          <select className="select" value={type} onChange={(e) => setType(e.target.value as 'POLL' | 'QUIZ')}>
            <option value="POLL">Poll — no right answer</option>
            <option value="QUIZ">Quiz — one correct answer</option>
          </select>
        </Field>
        <Field label="Title">
          <input className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      </div>
      <Field label="Description">
        <textarea className="textarea" value={description} maxLength={2000} rows={2} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="grid-2">
        <Field label="Starts">
          <input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </Field>
        <Field label="Ends">
          <input className="input" type="datetime-local" value={endsAt} min={startsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </Field>
      </div>

      {questions.map((question, index) => (
        <div key={index} className="card card-body" style={{ display: 'grid', gap: 10, background: 'var(--surface-2)' }}>
          <div className="between">
            <b>Question {index + 1}</b>
            {questions.length > 1 ? (
              <button className="icon-btn" aria-label="Remove question" onClick={() => setQuestions((list) => list.filter((_, i) => i !== index))}>
                <Icon.Trash />
              </button>
            ) : null}
          </div>
          <input
            className="input"
            placeholder="Ask something"
            value={question.prompt}
            maxLength={400}
            onChange={(e) => updateQuestion(index, { ...question, prompt: e.target.value })}
          />
          {question.options.map((option, optionIndex) => (
            <div key={optionIndex} className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                className="input"
                placeholder={`Option ${optionIndex + 1}`}
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
                  Correct
                </label>
              ) : null}
              {question.options.length > 2 ? (
                <button
                  className="icon-btn"
                  aria-label="Remove option"
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
                Add option
              </Button>
            </div>
          ) : null}
        </div>
      ))}
      {questions.length < 20 ? (
        <div>
          <Button icon={<Icon.Plus />} onClick={() => setQuestions((list) => [...list, emptyQuestion()])}>
            Add question
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
