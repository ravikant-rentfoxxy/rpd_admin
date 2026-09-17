'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmModal,
  Drawer,
  EmptyState,
  Field,
  KeyValues,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Skeleton,
  TableSkeleton,
  useToast,
} from '@/components/ui';
import { api, withQuery } from '@/lib/api';
import { ago, dash, plural, when } from '@/lib/format';
import { useApi, useDebounced } from '@/lib/hooks';
import type { Paged, TaskDetail, TaskRow } from '@/lib/types';

const PAGE_SIZE = 25;

export default function TasksPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const search = useDebounced(q);

  useEffect(() => setPage(1), [search]);

  const { data, error, loading, reload } = useApi<Paged & { tasks: TaskRow[] }>(
    withQuery('/admin/tasks', { q: search, page, limit: PAGE_SIZE }),
  );
  const rows = data?.tasks ?? [];

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Work handed out to members in your area, and how many have started it."
        actions={
          <Button variant="accent" icon={<Icon.Plus />} onClick={() => setCreating(true)}>
            New task
          </Button>
        }
      />
      {error ? <Alert>{error}</Alert> : null}

      <Card flush>
        <div className="toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search tasks" />
          {data ? <span className="muted small num" style={{ marginLeft: 'auto' }}>{plural(data.total, 'task')}</span> : null}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Given by</th>
                <th>Created</th>
                <th>Started by</th>
              </tr>
            </thead>
            {!data && loading ? (
              <TableSkeleton cols={4} />
            ) : (
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="clickable" onClick={() => setOpenId(row.id)}>
                    <td style={{ maxWidth: 420 }}>
                      <div className="cell-main">{row.title}</div>
                      {row.description ? <div className="cell-sub clamp-2">{row.description}</div> : null}
                    </td>
                    <td>
                      <div className="cell-main" style={{ fontWeight: 550 }}>{row.hostName}</div>
                      <div className="cell-sub">{row.hostPost}</div>
                    </td>
                    <td className="cell-sub nowrap">{ago(row.createdAt)}</td>
                    <td>
                      <Badge tone={row.started ? 'ok' : 'neutral'}>
                        {row.started} member{row.started === 1 ? '' : 's'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {data && rows.length === 0 ? (
          <EmptyState
            icon={<Icon.Clipboard />}
            title={search ? 'No tasks match' : 'No tasks yet'}
            text={search ? undefined : 'Create a task to hand out work to members below you.'}
            action={
              search ? undefined : (
                <Button variant="accent" icon={<Icon.Plus />} onClick={() => setCreating(true)}>
                  New task
                </Button>
              )
            }
          />
        ) : null}
        {data ? <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} /> : null}
      </Card>

      <TaskDrawer
        taskId={openId}
        onClose={() => setOpenId(null)}
        onRemoved={() => {
          setOpenId(null);
          toast('Task removed');
          void reload();
        }}
      />
      <NewTaskModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          toast('Task created. Members below you in your area can now start it.');
          void reload();
        }}
      />
    </>
  );
}

function TaskDrawer({ taskId, onClose, onRemoved }: { taskId: string | null; onClose: () => void; onRemoved: () => void }) {
  const toast = useToast();
  const { data, error } = useApi<{ task: TaskDetail }>(taskId ? `/admin/tasks/${taskId}` : null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const task = taskId && data?.task.id === taskId ? data.task : null;

  async function remove() {
    if (!task) return;
    setBusy(true);
    try {
      await api(`/admin/tasks/${task.id}`, { method: 'DELETE' });
      setConfirming(false);
      onRemoved();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not remove', 'bad');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={Boolean(taskId)}
      title="Task"
      onClose={onClose}
      footer={
        task?.canManage ? (
          <Button variant="danger" icon={<Icon.Trash />} onClick={() => setConfirming(true)}>
            Remove task
          </Button>
        ) : undefined
      }
    >
      {error ? <Alert>{error}</Alert> : null}
      {!task ? (
        !error ? (
          <div className="stack">
            <Skeleton height={60} />
            <Skeleton height={140} />
          </div>
        ) : null
      ) : (
        <>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{task.title}</h2>
            {task.description ? <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{task.description}</div> : null}
          </div>
          <KeyValues
            items={[
              ['Given by', <Link key="h" className="link" href={`/members/${task.host.id}`}>{task.host.fullName}</Link>],
              ['Post', task.host.post],
              ['Created', when(task.createdAt)],
              ['Started by', `${task.starters.length} member${task.starters.length === 1 ? '' : 's'}`],
            ]}
          />
          <div>
            <p className="section-title">Members who started</p>
            {task.starters.length === 0 ? (
              <div className="muted">No one has started this task yet.</div>
            ) : (
              <ul className="list card">
                {task.starters.map((row) => (
                  <li key={row.memberId}>
                    <Link href={`/members/${row.memberId}`} className="list-item">
                      <Avatar name={row.fullName} />
                      <div className="grow">
                        <div className="cell-main truncate">{row.fullName}</div>
                        <div className="cell-sub">{dash(row.membershipNumber)}</div>
                      </div>
                      <span className="cell-sub nowrap">{ago(row.startedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ConfirmModal
            open={confirming}
            title="Remove task?"
            danger
            busy={busy}
            confirmLabel="Remove task"
            message={
              <>
                <b>{task.title}</b> will disappear from the Work tab for everyone.
              </>
            }
            onClose={() => setConfirming(false)}
            onConfirm={remove}
          />
        </>
      )}
    </Drawer>
  );
}

function NewTaskModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setError('');
    }
  }, [open]);

  async function save() {
    setBusy(true);
    setError('');
    try {
      // Same endpoint the app uses, so the task is scoped to your area and rank.
      await api('/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), ...(description.trim() ? { description: description.trim() } : {}) }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create task');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="New task"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="accent" loading={busy} disabled={title.trim().length < 2} onClick={save}>
            Create task
          </Button>
        </>
      }
    >
      {error ? <Alert>{error}</Alert> : null}
      <Field label="Title">
        <input className="input" value={title} maxLength={200} autoFocus placeholder="e.g. Visit 20 homes in your booth" onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Details (optional)">
        <textarea className="textarea" value={description} maxLength={2000} placeholder="What should members do?" onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Alert tone="info">Members below your post in your area will see this in their Work tab.</Alert>
    </Modal>
  );
}
