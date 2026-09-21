'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import { Alert, Badge, Button, Card, ConfirmModal, EmptyState, Field, Modal, PageHeader, TableSkeleton, useToast } from '@/components/ui';
import { api, upload } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { useT } from '@/lib/i18n';

type Blog = {
  id: string;
  title: string;
  description: string;
  body: string;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  published: boolean;
  author: { id: string; fullName: string } | null;
  createdAt: string;
};

export default function BlogsPage() {
  const t = useT();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ blogs: Blog[] }>('/admin/blogs');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Blog | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function togglePublished(blog: Blog) {
    setBusyId(blog.id);
    try {
      const form = new FormData();
      form.set('published', String(!blog.published));
      await upload(`/admin/blogs/${blog.id}`, form, { method: 'PATCH' });
      toast(blog.published ? t('toast_hidden') : t('toast_published'));
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
      await api(`/admin/blogs/${deleting.id}`, { method: 'DELETE' });
      toast(t('toast_deleted'));
      setDeleting(null);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('err_could_not_delete'), 'bad');
    } finally {
      setBusyId(null);
    }
  }

  const blogs = data?.blogs ?? [];

  return (
    <>
      <PageHeader
        title={t('bl_title')}
        subtitle={t('bl_subtitle')}
        actions={
          <Button variant="accent" icon={<Icon.Plus />} onClick={() => setCreating(true)}>
            {t('bl_add')}
          </Button>
        }
      />
      {error ? <Alert>{error}</Alert> : null}

      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 66 }} />
                <th>{t('col_title')}</th>
                <th>{t('col_type')}</th>
                <th>{t('col_added_by')}</th>
                <th>{t('col_state')}</th>
                <th />
              </tr>
            </thead>
            {!data && loading ? (
              <TableSkeleton cols={6} />
            ) : (
              <tbody>
                {blogs.map((blog) => (
                  <tr key={blog.id}>
                    <td>
                      {blog.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={blog.thumbnailUrl} alt="" />
                      ) : (
                        <div className="thumb">
                          <Icon.File />
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: 340 }}>
                      <div className="cell-main">{blog.title}</div>
                      <div className="cell-sub clamp-2">{blog.description}</div>
                    </td>
                    <td>
                      <Badge tone={blog.body ? 'brand' : 'neutral'}>{blog.body ? t('bl_article') : t('bl_link')}</Badge>
                    </td>
                    <td className="cell-sub">{blog.author?.fullName ?? '—'}</td>
                    <td>
                      <Badge tone={blog.published ? 'ok' : 'neutral'} dot={blog.published}>
                        {blog.published ? t('vi_live') : t('vi_hidden')}
                      </Badge>
                    </td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        {blog.externalUrl ? (
                          <a className="icon-btn" href={blog.externalUrl} target="_blank" rel="noreferrer" aria-label={t('bl_open')}>
                            <Icon.External />
                          </a>
                        ) : null}
                        <Button size="sm" loading={busyId === blog.id && !deleting} onClick={() => togglePublished(blog)}>
                          {blog.published ? t('vi_hide') : t('vi_publish')}
                        </Button>
                        <button className="icon-btn" aria-label={t('delete')} onClick={() => setDeleting(blog)}>
                          <Icon.Trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {data && blogs.length === 0 ? (
          <EmptyState icon={<Icon.File />} title={t('bl_empty')} text={t('bl_empty_sub')} />
        ) : null}
      </Card>

      <BlogModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          toast(t('toast_blog_added'));
          void reload();
        }}
      />
      <ConfirmModal
        open={Boolean(deleting)}
        title={t('bl_delete_q')}
        danger
        busy={Boolean(deleting) && busyId === deleting?.id}
        confirmLabel={t('delete')}
        message={t('bl_delete_msg', { title: deleting?.title ?? '' })}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </>
  );
}

function BlogModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The API accepts either an article body or a link, so the form does too.
  const incomplete = title.trim().length < 2 || (!body.trim() && !externalUrl.trim());

  function reset() {
    setTitle('');
    setDescription('');
    setBody('');
    setExternalUrl('');
    setThumbnail(null);
    setError('');
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.set('title', title.trim());
      form.set('description', description.trim());
      form.set('body', body.trim());
      if (externalUrl.trim()) form.set('externalUrl', externalUrl.trim());
      if (thumbnail) form.set('thumbnail', thumbnail);
      await upload('/admin/blogs', form);
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('err_could_not_add_blog'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      wide
      title={t('bl_add')}
      onClose={() => {
        if (busy) return;
        reset();
        onClose();
      }}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button variant="accent" loading={busy} disabled={incomplete} onClick={submit}>
            {t('bl_add')}
          </Button>
        </>
      }
    >
      <div className="stack">
        {error ? <Alert>{error}</Alert> : null}

        <Field label={t('col_title')}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('bl_title_placeholder')} maxLength={200} disabled={busy} />
        </Field>

        <Field label={t('field_description')} hint={t('bl_desc_hint')}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('bl_desc_placeholder')}
            rows={3}
            maxLength={2000}
            disabled={busy}
          />
        </Field>

        <Field label={t('bl_article')} hint={t('bl_article_hint')}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('bl_article_placeholder')}
            rows={10}
            maxLength={50000}
            disabled={busy}
          />
        </Field>

        <Field label={t('bl_external')} hint={t('bl_external_hint')}>
          <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://rpd.org/blog/..." disabled={busy} />
        </Field>

        <Field label={t('vi_thumbnail')} hint={t('bl_thumb_hint')}>
          <input type="file" accept="image/*" disabled={busy} onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)} />
        </Field>
      </div>
    </Modal>
  );
}
