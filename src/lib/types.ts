export type AssignablePost = { post: string; title: string; rank: number };

export type Member = {
  id: string;
  rowId: number;
  membershipNumber: string | null;
  mobile: string;
  fullName: string;
  gender?: string | null;
  status: string;
  post: string;
  isSuperAdmin?: boolean;
  photoUrl?: string | null;
  address?: string | null;
  pincode?: string | null;
  voterId?: string | null;
  stateName?: string | null;
  districtName?: string | null;
  assemblyName?: string | null;
  boothName?: string | null;
  lastActiveAt?: string | null;
  createdAt?: string;
  rank?: number;
  canAssign?: boolean;
  assignablePosts?: AssignablePost[];
  posts?: { id: string; post: string; title: string; isPrimary: boolean }[];
};

export type OfficePost = {
  id: string;
  post: string;
  title: string;
  isPrimary: boolean;
  startedAt: string;
  stateName?: string | null;
  regionName?: string | null;
  districtName?: string | null;
  assemblyName?: string | null;
  mandalName?: string | null;
  boothName?: string | null;
};

export type Area = { level: string; name: string };

export type SessionMe = {
  member: Member;
  rank: number;
  post: string;
  assignablePosts: AssignablePost[];
  area: Area;
};

export type Paged = { total: number; page: number; limit: number };

export type ActivityRow = {
  id: string;
  type: string;
  status: string;
  occurredAt: string;
  notes: string | null;
  actorId: string;
  actorName: string;
  actorNumber: string | null;
  boothName: string | null;
  boothCode?: string | null;
  attendeeCount: number;
  homesCovered: number | null;
  photoCount: number;
  reviewFlag: boolean;
  distanceMetres: number | null;
  farAwayReason?: string | null;
};

export type ActivityDetail = {
  id: string;
  type: string;
  status: string;
  occurredAt: string;
  createdAt: string;
  notes: string | null;
  backdateReason: string | null;
  farAwayReason: string | null;
  reviewFlag: boolean;
  homesCovered: number | null;
  attendeeCount: number;
  distanceMetres: number | null;
  latitude: number | null;
  longitude: number | null;
  actor: { id: string; fullName: string; membershipNumber: string | null; mobile: string; photoUrl: string | null };
  booth: { id: string; code: string; name: string; village: string | null } | null;
  photos: { id: string; kind: string; url: string | null; capturedAt: string }[];
  attendees: { id: string; memberId: string | null; name: string; membershipNumber: string | null }[];
  reviews: { id: string; decision: string; reason: string | null; reviewerName: string; createdAt: string }[];
  canReview: boolean;
};

export type Overview = {
  area: Area;
  members: { total: number; verified: number; pending: number; newThisMonth: number; officeBearers: number };
  activities: { last30Days: number; awaitingReview: number };
  grievances: { open: number; unassigned: number; resolvedThisMonth: number };
  events: { upcoming: number; live: number; checkInsThisMonth: number };
  tasks: { total: number };
  trend: { date: string; activities: number; verified: number; members: number }[];
  activityMix: { type: string; count: number }[];
  recentActivities: { id: string; type: string; status: string; occurredAt: string; actorName: string; boothName: string | null }[];
  upcomingEvents: {
    id: string;
    type: string;
    title: string;
    venue: string;
    startsAt: string;
    endsAt: string;
    phase: string;
    hostName: string;
    joined: number;
  }[];
};

/** Grievance as serialised by the app's post API (reused by the admin list). */
export type Grievance = {
  id: string;
  serverId: string;
  description: string;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  documentUrl?: string | null;
  documentName?: string | null;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  authorId: string;
  authorName: string | null;
  authorMobile: string | null;
  authorPost: string | null;
  canSeeAuthor: boolean;
  canAssign: boolean;
  canResolve: boolean;
  status: 'OPEN' | 'RESOLVED';
  resolvedAt: string | null;
  resolvedByName: string | null;
  assignedToId: string | null;
  assigneeName: string | null;
  assigneePostLabel: string | null;
  assignedAt: string | null;
  assignedByName?: string | null;
  regionLabel: string | null;
  issueName: string;
  issueBand: string;
  subIssueName: string | null;
};

export type EventRow = {
  id: string;
  type: string;
  title: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  phase: 'UPCOMING' | 'LIVE' | 'ENDED';
  hostId: string;
  hostName: string;
  hostPost: string;
  imageUrl: string | null;
  joined: number;
  checkedIn: number;
  hasLocation: boolean;
  canManage: boolean;
};

export type EventDetail = {
  id: string;
  type: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  phase: 'UPCOMING' | 'LIVE' | 'ENDED';
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  host: { id: string; fullName: string; membershipNumber: string | null; post: string };
  createdAt: string;
  canManage: boolean;
  attendees: {
    memberId: string;
    fullName: string;
    membershipNumber: string | null;
    mobile: string;
    joinedAt: string;
    checkedInAt: string | null;
    checkInMetres: number | null;
  }[];
};

export type TaskRow = {
  id: string;
  title: string;
  description: string;
  hostId: string;
  hostName: string;
  hostPost: string;
  createdAt: string;
  started: number;
  canManage: boolean;
};

export type TaskDetail = {
  id: string;
  title: string;
  description: string;
  host: { id: string; fullName: string; post: string };
  createdAt: string;
  canManage: boolean;
  starters: { memberId: string; fullName: string; membershipNumber: string | null; startedAt: string }[];
};

/** Someone a grievance can be handed to: an office bearer below the officer, in their area. */
export type Assignee = {
  id: string;
  fullName: string;
  post: string;
  postLabel: string;
  rank: number;
  membershipNumber: string | null;
  photoUrl: string | null;
  districtName: string | null;
  assemblyName: string | null;
  openAssigned: number;
};
