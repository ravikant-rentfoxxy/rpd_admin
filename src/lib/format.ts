import { intlLocale, t } from './i18n';

export type Tone = 'brand' | 'accent' | 'ok' | 'warn' | 'bad' | 'neutral';

function toDate(value?: string | Date | null) {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function when(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString(intlLocale(), { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function dateOnly(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(intlLocale(), { day: '2-digit', month: 'short', year: 'numeric' });
}

export function timeOnly(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleTimeString(intlLocale(), { hour: 'numeric', minute: '2-digit' });
}

/** "5 min ago", "3 h ago", "2 days ago", falling back to a date after a week. */
export function ago(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return t('just_now');
  if (minutes < 60) return t('min_ago', { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t('hours_ago', { n: hours });
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? t('day_ago') : t('days_ago', { n: days });
  return dateOnly(date);
}

export function dateRange(start?: string | null, end?: string | null) {
  const from = toDate(start);
  const to = toDate(end);
  if (!from) return '—';
  if (!to) return when(from);
  const sameDay = from.toDateString() === to.toDateString();
  return sameDay ? `${when(from)} – ${timeOnly(to)}` : `${when(from)} – ${when(to)}`;
}

export function dash(value?: string | number | null) {
  if (value === null || value === undefined || `${value}`.trim() === '') return '—';
  return `${value}`;
}

export function num(value?: number | null) {
  return (value ?? 0).toLocaleString(intlLocale());
}

/**
 * "1 event", "3 events" in the active language.
 *
 * `key` names a pair of dictionary entries — `count_<key>_one` and
 * `count_<key>_other` — each taking an `@n` placeholder.
 */
export function plural(count: number, key: string) {
  return t(`count_${key}_${count === 1 ? 'one' : 'other'}`, { n: count.toLocaleString(intlLocale()) });
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function initials(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'RP';
  return (parts[0]![0]! + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function mobile(value?: string | null) {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : value;
}

export function titleCase(code?: string | null) {
  if (!code) return '—';
  return code
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const POST_CODES = [
  'SUPER_ADMIN',
  'NATIONAL_PRESIDENT',
  'NATIONAL_GENERAL_SECRETARY',
  'STATE_PRESIDENT',
  'STATE_GENERAL_SECRETARY',
  'REGIONAL_PRESIDENT',
  'DISTRICT_PRESIDENT',
  'DISTRICT_GENERAL_SECRETARY',
  'DISTRICT_SECRETARY',
  'ASSEMBLY_IN_CHARGE',
  'MANDAL_PRESIDENT',
  'BOOTH_ADHYAKSH',
  'PANNA_PRAMUKH',
  'MEMBER',
];

/**
 * Label maps are functions, not constants, because the text changes with the
 * language. Call them at render time: `POST_LABELS()[code]`.
 */
export function POST_LABELS(): Record<string, string> {
  return Object.fromEntries(POST_CODES.map((code) => [code, t(`post_${code}`)]));
}

export function postTitle(code?: string | null) {
  if (!code) return t('post_MEMBER');
  return POST_CODES.includes(code) ? t(`post_${code}`) : titleCase(code);
}

const ACTIVITY_CODES = ['MEETING', 'GRIHA_SAMPARK', 'PUBLIC_PROGRAMME', 'TRAINING', 'ADD_MEMBER', 'OTHER'];

export function ACTIVITY_TYPES(): Record<string, string> {
  return Object.fromEntries(ACTIVITY_CODES.map((code) => [code, t(`activity_${code}`)]));
}

export function activityType(code?: string | null) {
  return code && ACTIVITY_CODES.includes(code) ? t(`activity_${code}`) : titleCase(code);
}

export const ACTIVITY_COLORS: Record<string, string> = {
  MEETING: '#ef8120',
  GRIHA_SAMPARK: '#3a2685',
  PUBLIC_PROGRAMME: '#1b7350',
  TRAINING: '#7b5cf0',
  ADD_MEMBER: '#c45a12',
  OTHER: '#9a94a6',
};

export function ACTIVITY_STATUS(): Record<string, { label: string; tone: Tone }> {
  return {
    QUEUED: { label: t('status_awaiting_review'), tone: 'warn' },
    UPLOADED: { label: t('status_awaiting_review'), tone: 'warn' },
    PENDING_VERIFICATION: { label: t('status_awaiting_review'), tone: 'warn' },
    VERIFIED: { label: t('status_verified'), tone: 'ok' },
    NOT_VERIFIED: { label: t('status_rejected'), tone: 'bad' },
    APPEALED: { label: t('status_appealed'), tone: 'accent' },
  };
}

export function MEMBER_STATUS(): Record<string, { label: string; tone: Tone }> {
  return {
    DRAFT: { label: t('status_draft'), tone: 'neutral' },
    PENDING: { label: t('status_pending'), tone: 'warn' },
    VERIFIED: { label: t('status_verified'), tone: 'ok' },
    REJECTED: { label: t('status_rejected'), tone: 'bad' },
    SUSPENDED: { label: t('status_suspended'), tone: 'bad' },
    WITHDRAWN: { label: t('status_withdrawn'), tone: 'neutral' },
  };
}

export function EVENT_PHASE(): Record<string, { label: string; tone: Tone }> {
  return {
    UPCOMING: { label: t('phase_upcoming'), tone: 'brand' },
    LIVE: { label: t('phase_live'), tone: 'ok' },
    ENDED: { label: t('phase_ended'), tone: 'neutral' },
  };
}

const AREA_CODES = ['NATIONAL', 'STATE', 'REGION', 'DISTRICT', 'ASSEMBLY', 'MANDAL', 'BOOTH'];

export function AREA_LEVEL(): Record<string, string> {
  return Object.fromEntries(AREA_CODES.map((code) => [code, t(`area_${code}`)]));
}

export function areaLevel(code?: string | null) {
  return code && AREA_CODES.includes(code) ? t(`area_${code}`) : code ?? '';
}

/** Grievance issue bands from the post_issues table: VERY_HIGH, HIGH, MEDIUM, LOW. */
export function bandTone(band?: string | null): Tone {
  switch ((band ?? '').toUpperCase()) {
    case 'VERY_HIGH':
      return 'bad';
    case 'HIGH':
      return 'accent';
    case 'MEDIUM':
      return 'warn';
    case 'LOW':
      return 'ok';
    default:
      return 'neutral';
  }
}

export function bandLabel(band?: string | null) {
  if (!band) return t('band_unrated');
  const code = band.toUpperCase();
  const name = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW'].includes(code) ? t(`band_${code}`) : titleCase(band);
  return t('band_priority', { band: name });
}

export function mapsUrl(lat?: number | null, lng?: number | null, fallback?: string | null) {
  if (lat != null && lng != null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  if (fallback) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallback)}`;
  return null;
}
