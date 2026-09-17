export type Tone = 'brand' | 'accent' | 'ok' | 'warn' | 'bad' | 'neutral';

function toDate(value?: string | Date | null) {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function when(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function dateOnly(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function timeOnly(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

/** "5 min ago", "3 h ago", "2 days ago", falling back to a date after a week. */
export function ago(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
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
  return (value ?? 0).toLocaleString('en-IN');
}

/** "1 event", "3 events"; pass the plural when it is not just word + "s". */
export function plural(count: number, word: string, many = `${word}s`) {
  return `${count.toLocaleString('en-IN')} ${count === 1 ? word : many}`;
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

export const POST_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  NATIONAL_PRESIDENT: 'National President',
  NATIONAL_GENERAL_SECRETARY: 'National General Secretary',
  STATE_PRESIDENT: 'State President',
  STATE_GENERAL_SECRETARY: 'State General Secretary',
  REGIONAL_PRESIDENT: 'Regional President',
  DISTRICT_PRESIDENT: 'District President',
  DISTRICT_GENERAL_SECRETARY: 'District General Secretary',
  DISTRICT_SECRETARY: 'District Secretary',
  ASSEMBLY_IN_CHARGE: 'Assembly In-charge',
  MANDAL_PRESIDENT: 'Mandal President',
  BOOTH_ADHYAKSH: 'Booth Adhyaksh',
  PANNA_PRAMUKH: 'Panna Pramukh',
  MEMBER: 'Member',
};

export function postTitle(code?: string | null) {
  if (!code) return 'Member';
  return POST_LABELS[code] ?? titleCase(code);
}

export const ACTIVITY_TYPES: Record<string, string> = {
  MEETING: 'Meeting',
  GRIHA_SAMPARK: 'Griha sampark',
  PUBLIC_PROGRAMME: 'Public programme',
  TRAINING: 'Training',
  ADD_MEMBER: 'Member added',
  OTHER: 'Other',
};

export function activityType(code?: string | null) {
  return (code && ACTIVITY_TYPES[code]) || titleCase(code);
}

export const ACTIVITY_COLORS: Record<string, string> = {
  MEETING: '#ef8120',
  GRIHA_SAMPARK: '#3a2685',
  PUBLIC_PROGRAMME: '#1b7350',
  TRAINING: '#7b5cf0',
  ADD_MEMBER: '#c45a12',
  OTHER: '#9a94a6',
};

export const ACTIVITY_STATUS: Record<string, { label: string; tone: Tone }> = {
  QUEUED: { label: 'Awaiting review', tone: 'warn' },
  UPLOADED: { label: 'Awaiting review', tone: 'warn' },
  PENDING_VERIFICATION: { label: 'Awaiting review', tone: 'warn' },
  VERIFIED: { label: 'Verified', tone: 'ok' },
  NOT_VERIFIED: { label: 'Rejected', tone: 'bad' },
  APPEALED: { label: 'Appealed', tone: 'accent' },
};

export const MEMBER_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  PENDING: { label: 'Pending', tone: 'warn' },
  VERIFIED: { label: 'Verified', tone: 'ok' },
  REJECTED: { label: 'Rejected', tone: 'bad' },
  SUSPENDED: { label: 'Suspended', tone: 'bad' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'neutral' },
};

export const EVENT_PHASE: Record<string, { label: string; tone: Tone }> = {
  UPCOMING: { label: 'Upcoming', tone: 'brand' },
  LIVE: { label: 'Live now', tone: 'ok' },
  ENDED: { label: 'Ended', tone: 'neutral' },
};

export const AREA_LEVEL: Record<string, string> = {
  NATIONAL: 'National',
  STATE: 'State',
  REGION: 'Region',
  DISTRICT: 'District',
  ASSEMBLY: 'Assembly',
  MANDAL: 'Mandal',
  BOOTH: 'Booth',
};

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
  if (!band) return 'Unrated';
  return `${titleCase(band)} priority`;
}

export function mapsUrl(lat?: number | null, lng?: number | null, fallback?: string | null) {
  if (lat != null && lng != null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  if (fallback) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallback)}`;
  return null;
}
