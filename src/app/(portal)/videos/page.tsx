'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import { Alert, Badge, Button, Card, ConfirmModal, EmptyState, Field, Modal, PageHeader, TableSkeleton, useToast } from '@/components/ui';
import { api, upload } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { useT } from '@/lib/i18n';

type Video = {
  id: string;
  title: string;
  description: string;
  source: 'UPLOAD' | 'LINK';
  videoUrl: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  published: boolean;
  author: { id: string; fullName: string } | null;
  createdAt: string;
};

const MAX_VIDEO_MB = 200;

export default function VideosPage() {
  const t = useT();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ videos: Video[] }>('/admin/videos');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Video | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function togglePublished(video: Video) {
    setBusyId(video.id);
    try {
      const form = new FormData();
      form.set('published', String(!video.published));
      await upload(`/admin/videos/${video.id}`, form, { method: 'PATCH' });
      toast(video.published ? t('toast_hidden') : t('toast_published'));
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
      await api(`/admin/videos/${deleting.id}`, { method: 'DELETE' });
      toast(t('toast_deleted'));
      setDeleting(null);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('err_could_not_delete'), 'bad');
    } finally {
      setBusyId(null);
    }
  }

  const videos = data?.videos ?? [];

  return (
    <>
      <PageHeader
        title={t('vi_title')}
        subtitle={t('vi_subtitle')}
        actions={
          <Button variant="accent" icon={<Icon.Plus />} onClick={() => setCreating(true)}>
            {t('vi_add')}
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
                <th>{t('col_source')}</th>
                <th>{t('col_added_by')}</th>
                <th>{t('col_state')}</th>
                <th />
              </tr>
            </thead>
            {!data && loading ? (
              <TableSkeleton cols={6} />
            ) : (
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id}>
                    <td>
                      {video.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={video.thumbnailUrl} alt="" />
                      ) : (
                        <div className="thumb">
                          <Icon.Video />
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: 340 }}>
                      <div className="cell-main">{video.title}</div>
                      <div className="cell-sub clamp-2">{video.description}</div>
                    </td>
                    <td>
                      <Badge tone={video.source === 'UPLOAD' ? 'brand' : 'neutral'}>
                        {video.source === 'UPLOAD' ? t('vi_uploaded') : t('vi_link')}
                      </Badge>
                    </td>
                    <td className="cell-sub">{video.author?.fullName ?? '—'}</td>
                    <td>
                      <Badge tone={video.published ? 'ok' : 'neutral'} dot={video.published}>
                        {video.published ? t('vi_live') : t('vi_hidden')}
                      </Badge>
                    </td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        {video.videoUrl ? (
                          <a className="icon-btn" href={video.videoUrl} target="_blank" rel="noreferrer" aria-label={t('vi_open_video')}>
                            <Icon.External />
                          </a>
                        ) : null}
                        <Button size="sm" loading={busyId === video.id && !deleting} onClick={() => togglePublished(video)}>
                          {video.published ? t('vi_hide') : t('vi_publish')}
                        </Button>
                        <button className="icon-btn" aria-label={t('delete')} onClick={() => setDeleting(video)}>
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
        {data && videos.length === 0 ? (
          <EmptyState icon={<Icon.Video />} title={t('vi_empty')} text={t('vi_empty_sub')} />
        ) : null}
      </Card>

      <VideoModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          toast(t('toast_video_added'));
          void reload();
        }}
      />
      <ConfirmModal
        open={Boolean(deleting)}
        title={t('vi_delete_q')}
        danger
        busy={Boolean(deleting) && busyId === deleting?.id}
        confirmLabel={t('delete')}
        message={t('vi_delete_msg', { title: deleting?.title ?? '' })}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </>
  );
}

function VideoModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const t = useT();
  const [source, setSource] = useState<'UPLOAD' | 'LINK'>('UPLOAD');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [percent, setPercent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const oversize = Boolean(file && file.size > MAX_VIDEO_MB * 1024 * 1024);
  const incomplete = title.trim().length < 2 || (source === 'UPLOAD' ? !file : !externalUrl.trim());

  function reset() {
    setSource('UPLOAD');
    setTitle('');
    setDescription('');
    setExternalUrl('');
    setFile(null);
    setThumbnail(null);
    setPercent(0);
    setError('');
  }

  async function submit() {
    if (oversize) {
      setError(t('vi_too_big', { mb: MAX_VIDEO_MB }));
      return;
    }
    setBusy(true);
    setError('');
    setPercent(0);
    try {
      const form = new FormData();
      form.set('title', title.trim());
      form.set('description', description.trim());
      if (source === 'UPLOAD' && file) form.set('file', file);
      if (source === 'LINK') form.set('externalUrl', externalUrl.trim());
      if (thumbnail) form.set('thumbnail', thumbnail);
      await upload('/admin/videos', form, { onProgress: setPercent });
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('err_could_not_add_video'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={t('vi_add')}
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
            {busy && source === 'UPLOAD' ? t('vi_uploading_pct', { n: percent }) : t('vi_add')}
          </Button>
        </>
      }
    >
      <div className="stack">
        {error ? <Alert>{error}</Alert> : null}

        <div className="row">
          <Button size="sm" variant={source === 'UPLOAD' ? 'accent' : 'secondary'} onClick={() => setSource('UPLOAD')} disabled={busy}>
            {t('vi_upload_file')}
          </Button>
          <Button size="sm" variant={source === 'LINK' ? 'accent' : 'secondary'} onClick={() => setSource('LINK')} disabled={busy}>
            {t('vi_paste_link')}
          </Button>
        </div>

        <Field label={t('col_title')}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('vi_title_placeholder')} maxLength={200} disabled={busy} />
        </Field>

        <Field label={t('field_description')}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('vi_desc_placeholder')}
            rows={3}
            maxLength={2000}
            disabled={busy}
          />
        </Field>

        {/* Keys keep React from reusing one input across the two branches: a file
            input has no value, the link input does, and swapping props on the same
            DOM node flips it between uncontrolled and controlled. */}
        {source === 'UPLOAD' ? (
          <Field key="video-file" label={t('vi_file')} hint={t('vi_file_hint', { mb: MAX_VIDEO_MB })}>
            <input type="file" accept="video/*" disabled={busy} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
        ) : (
          <Field key="video-link" label={t('vi_link_label')} hint={t('vi_link_hint')}>
            <input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              disabled={busy}
            />
          </Field>
        )}

        <Field
          label={t('vi_thumbnail')}
          hint={source === 'UPLOAD' ? t('vi_thumb_hint_upload') : t('vi_thumb_hint_link')}
        >
          <input type="file" accept="image/*" disabled={busy} onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)} />
        </Field>

        {busy && source === 'UPLOAD' ? (
          <Field label={t('vi_uploading_field', { n: percent })} hint={t('vi_keep_tab_open')}>
            <progress value={percent} max={100} style={{ width: '100%' }} />
          </Field>
        ) : null}
      </div>
    </Modal>
  );
}
