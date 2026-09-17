# RPD Admin

Admin portal for RPD Sangathan office bearers. Officers sign in with the same mobile number and OTP as the mobile app, and manage everything that happens in their area.

## Run

The API must be running (default `http://localhost:4000`). Set another address in `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

```bash
cd /Users/apple/Desktop/rpd_admin
npm run dev        # development, http://localhost:3000
npm run build && npm start   # production
```

Demo OTP is `123456` while the API runs with `NODE_ENV=development`. Only verified office bearers (Panna Pramukh and above) or a Super Admin can sign in.

## Who sees what

Every screen is limited to the officer's **area**, worked out by the API from their post and profile:

| Post | Area |
| --- | --- |
| Super Admin, National posts | All India |
| State posts | Their state |
| Regional President | Their region |
| District posts | Their district |
| Assembly In-charge | Their assembly |
| Mandal President | Their mandal |
| Booth Adhyaksh, Panna Pramukh | Their booth |

If the profile is missing that level (for example a Mandal President with no mandal set), the next wider level on the profile is used. The current area is shown at the top right.

## Sections

| Section | What you can do |
| --- | --- |
| Dashboard | Key numbers, 30-day activity trend, activity mix, recent activities, upcoming events |
| Verification | Verify or reject field work waiting for review (never your own) |
| Activities | Search and filter all activities; open one to see photos, attendees, location and review history |
| Events | Upcoming, live and past events; open one for attendance, check-in times and distance from the venue; cancel an event |
| Tasks | Create tasks, see who started them, remove tasks |
| Grievances | Filter public grievances, view media, assign to an office bearer below you, mark resolved or reopen |
| Polls & quizzes | Super Admin only: publish, hide and delete Home-screen polls and quizzes |
| Members | Search and filter members; change status; assign or remove posts below your own |
| Hierarchy | Post ranks by level, your post, and the posts you can assign |
| Booths | Booths in your area with coverage and health score |

## Code layout

- `src/lib/api.ts` — fetch wrapper with token refresh (`withQuery` builds query strings)
- `src/lib/hooks.ts` — `useApi` (load + reload), `useDebounced`
- `src/lib/format.ts` — dates, labels, status tones
- `src/components/ui.tsx` — cards, badges, buttons, tables, modal, drawer, toasts
- `src/components/Shell.tsx` — sidebar, top bar, session and navigation badge counts
- `src/app/(portal)/*` — one folder per section
