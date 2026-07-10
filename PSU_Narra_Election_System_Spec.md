# PSU Narra Campus Election System — Complete Build Specification

## Overview

A web-based campus election system for Palawan State University – Narra Campus. Students proceed to a physical voting station, scan a website QR code posted at the station to open the voting page on their personal phone, then scan or upload their personal QR code (pre-distributed via Messenger) to authenticate. After PIN verification, they vote through a paginated ballot — one position per page — and submit. A separate live results screen updates in real time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Realtime) |
| Auth / Token validation | Supabase Edge Functions |
| QR Generation | `qrcode` npm package |
| QR Scanning | `html5-qrcode` npm package |
| Hosting | Vercel (frontend) + Supabase (backend) |
| Messenger QR Distribution | Manual batch send or simple Node.js script |

---

## Design System

### Aesthetic
Modern, elegant, minimal. Warm beige/neutral base. Subtle gradients used only for depth — not decoration. Clean typography, generous whitespace, soft shadows.

### Color Palette
```
--color-bg:          #F5F0E8   (warm beige, page background)
--color-surface:     #FDFAF5   (off-white, card surface)
--color-surface-2:   #F0EBE0   (slightly darker beige, input backgrounds)
--color-border:      #E2DAC8   (warm light border)
--color-border-strong: #C9BFA8 (stronger border, dividers)
--color-text-primary:  #2C2416 (deep warm brown, headings)
--color-text-secondary:#6B5E4A (medium warm brown, body)
--color-text-muted:    #A39280 (light warm, captions/hints)
--color-accent:        #7C5C3A (warm brown, primary CTA)
--color-accent-light:  #F0E6D6 (light accent tint, hover states)
--color-success:       #4A7C59 (muted green)
--color-success-bg:    #EAF3EE (light green tint)
--color-danger:        #9B3A3A (muted red)
--color-danger-bg:     #F8EEEE (light red tint)
--color-warning:       #8B6914 (warm amber)
--color-warning-bg:    #FDF6E3 (light amber tint)
```

### Gradients (subtle, for depth only)
```css
/* Page background — very subtle warm vignette */
background: linear-gradient(160deg, #F7F2EA 0%, #F0EBE0 100%);

/* Card surface — barely visible depth */
background: linear-gradient(180deg, #FDFAF5 0%, #F9F4EC 100%);

/* Primary button — warm brown depth */
background: linear-gradient(180deg, #8B6A42 0%, #6B4E2E 100%);

/* Success state */
background: linear-gradient(180deg, #5A8C69 0%, #3D6B4F 100%);
```

### Typography
```
Font: Inter (Google Fonts)
Headings: font-weight 600, color: var(--color-text-primary)
Body: font-weight 400, color: var(--color-text-secondary)
Captions: font-weight 400, color: var(--color-text-muted)
Font sizes: 12px / 13px / 14px / 16px / 18px / 24px
```

### Components
- **Cards**: `background: linear-gradient(180deg, #FDFAF5, #F9F4EC)`, `border: 1px solid var(--color-border)`, `border-radius: 16px`, `padding: 20px`
- **Buttons (primary)**: warm brown gradient, `border-radius: 12px`, `padding: 14px`, white text, subtle inner shadow
- **Buttons (secondary)**: transparent bg, `border: 1px solid var(--color-border-strong)`, accent text color
- **Inputs**: `background: var(--color-surface-2)`, `border: 1px solid var(--color-border)`, `border-radius: 10px`, `padding: 12px 14px`
- **Progress bar**: thin 3px warm brown fill on beige track
- **Badges**: pill shape, 11px, matching role colors

---

## Database Schema (Supabase / PostgreSQL)

### Table: `voters`
```sql
CREATE TABLE voters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    TEXT UNIQUE NOT NULL,       -- e.g. "2023-00142"
  full_name     TEXT NOT NULL,              -- "Juan Dela Cruz"
  first_name    TEXT NOT NULL,
  middle_name   TEXT,
  last_name     TEXT NOT NULL,
  course        TEXT NOT NULL,              -- "BSCS"
  year_level    TEXT NOT NULL,              -- "3A"
  pin_hash      TEXT NOT NULL,              -- bcrypt hash of 4-digit PIN
  qr_token      TEXT UNIQUE NOT NULL,       -- unique random token encoded in QR
  has_voted     BOOLEAN DEFAULT FALSE,
  voted_at      TIMESTAMPTZ,
  token_used    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `positions`
```sql
CREATE TABLE positions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,             -- "President", "VP Internal", etc.
  order_index   INT NOT NULL,              -- 1, 2, 3, 4... (ballot page order)
  is_active     BOOLEAN DEFAULT TRUE
);
```

### Table: `candidates`
```sql
CREATE TABLE candidates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id   UUID REFERENCES positions(id),
  full_name     TEXT NOT NULL,
  nickname      TEXT,
  course        TEXT NOT NULL,
  year_level    TEXT NOT NULL,
  photo_url     TEXT,                      -- Supabase Storage URL
  platform      TEXT[],                    -- array of platform points
  order_index   INT NOT NULL
);
```

### Table: `votes`
```sql
CREATE TABLE votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id      UUID REFERENCES voters(id),
  position_id   UUID REFERENCES positions(id),
  candidate_id  UUID REFERENCES candidates(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voter_id, position_id)            -- one vote per position per voter
);
```

### Table: `election_settings`
```sql
CREATE TABLE election_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_name TEXT NOT NULL,
  election_date DATE NOT NULL,
  voting_start  TIMESTAMPTZ NOT NULL,
  voting_end    TIMESTAMPTZ NOT NULL,
  results_visible BOOLEAN DEFAULT FALSE,   -- admin toggles live results
  is_active     BOOLEAN DEFAULT FALSE      -- master on/off switch
);
```

### Row Level Security (RLS)
- `voters` — readable only by service role (admin). Never expose to client.
- `candidates` — readable by all (public, no auth needed).
- `positions` — readable by all.
- `votes` — insertable by authenticated session only. Never readable by client (admin only).
- `election_settings` — readable by all (for voting window check). Writable by admin only.

---

## QR Token System

### Personal QR (per student)
- Generated before election day by admin.
- Contains: a unique random token string (UUID v4 or 32-char hex), e.g. `a3f8c2e1b4d79056...`
- Does NOT contain student name or ID directly — the token is a lookup key.
- Token is stored in `voters.qr_token` column.
- QR image is generated using the `qrcode` npm package and saved as PNG.
- Distributed to students via Messenger (one image per student).

### Website QR (posted at station)
- A static QR that encodes the voting URL: `https://vote.psu-narra.edu`
- Same for all stations. Print and laminate. Never changes.
- Students scan this first to open the site on their phone.

### Token Flow
1. Student scans personal QR → frontend extracts token string.
2. Token sent to Supabase Edge Function `/api/verify-token`.
3. Edge Function checks: token exists, `has_voted = false`, `token_used = false`, election is currently active (within voting window).
4. If valid: returns student's name, course, year (NOT the token or ID). Sets a short-lived server-side session (JWT, 10-minute expiry).
5. If invalid: returns error code with reason (`INVALID_TOKEN`, `ALREADY_VOTED`, `ELECTION_CLOSED`).

---

## PIN System

- Each voter has a 4-digit PIN assigned by COMELEC.
- PIN is sent together with the QR image via Messenger.
- Stored as bcrypt hash in `voters.pin_hash`.
- After QR verification, user enters PIN on the next screen.
- PIN is verified server-side via Edge Function `/api/verify-pin`.
- On success: session is elevated (voting is now unlocked).
- Max 3 attempts. On 3rd failure: session is locked for 5 minutes.

---

## Pages & Routes

### Public Routes

#### `/` — Introductory Page
- PSU Narra Elections logo / seal
- Election name and year
- Brief instructions: "Have your personal QR ready", "Know your 4-digit PIN", "Takes 2–3 minutes"
- Single CTA button: **"Vote now"** → navigates to `/scan`
- Shows election date and voting hours
- If election is not active (outside voting window): shows "Voting is not yet open" or "Voting has closed" message instead of the button.

#### `/scan` — QR Scanner Page
- Heading: "Scan your personal QR"
- Subtext: "Open the QR code sent to you via Messenger and hold it up to the camera, or upload the image."
- Live camera viewfinder using `html5-qrcode` (auto-starts on page load, requests camera permission).
- Below camera: "— or —" divider, then "Upload QR image from gallery" button (file input, accepts image/*, reads QR from image using `html5-qrcode` file scan mode).
- On successful scan: camera stops, shows a green verification card with student name, course, year. "Continue" button appears.
- On failure: shows error message based on error code:
  - `INVALID_TOKEN` → "This QR code is not recognized. Please make sure you're using your personal QR from COMELEC."
  - `ALREADY_VOTED` → "This QR has already been used to vote. If you believe this is an error, see a COMELEC officer."
  - `ELECTION_CLOSED` → "Voting is currently closed."
- No manual name/ID input fallback on this page. Fallback is handled by officer via admin panel.

#### `/pin` — PIN Entry Page
- Only accessible after successful QR verification (session check).
- Heading: "Enter your PIN"
- Subtext: "Enter the 4-digit PIN sent to you with your QR code."
- 4 dot indicators showing PIN entry progress.
- On-screen numpad (1–9, 0, backspace, clear) — prevents keyboard popup on mobile.
- On correct PIN: navigates to `/vote/1`.
- On wrong PIN: shows error "Incorrect PIN. X attempts remaining." Dots shake animation.
- On 3rd wrong attempt: shows "Too many attempts. Please wait 5 minutes or see a COMELEC officer." Numpad disabled.

#### `/vote/[position]` — Ballot Pages (paginated)
- One page per position. Route: `/vote/1`, `/vote/2`, `/vote/3`, `/vote/4`, etc.
- Only accessible after PIN verified (session check).
- Top bar: position name (e.g. "President") + back arrow (goes to previous position, not previous page).
- Progress bar: thin warm-brown bar showing completion (1 of 4, 2 of 4, etc.).
- If position has multiple candidates: tab switcher at top (candidate first names as tabs).
- Per candidate card:
  - Circular photo (from Supabase Storage). If no photo: initials avatar in warm beige.
  - Full name (16px, semibold).
  - Course and year (13px, muted).
  - Platform section: card with heading "Platform & Advocacy", bulleted list of platform points (13px).
  - "Select this candidate" button at bottom of card. Turns green with checkmark when selected.
- Navigation: "Next →" button (disabled until a candidate is selected for current position). Last position shows "Review votes →".
- Selections stored in React state / localStorage (session-scoped, cleared on submission or timeout).
- Student can go back to previous positions to change their selection before review.

#### `/review` — Review Page
- Only accessible after all positions have a selection.
- Heading: "Review your votes"
- Subtext: "Check your selections carefully. You cannot change your vote after submitting."
- Summary card listing each position and the selected candidate name.
- Warning box: "Once submitted, your vote is final and cannot be undone."
- "Submit vote" button → calls `/api/submit-vote` Edge Function → navigates to `/done`.
- "Go back and change" button → returns to `/vote/1`.

#### `/done` — Confirmation Page
- Success icon (checkmark in green circle).
- Heading: "Vote submitted!"
- Subtext: "Your vote has been recorded. Thank you for participating."
- Vote receipt card:
  - Voter name
  - Timestamp (date and time)
  - Reference code (auto-generated: `VT-YYYYMMDD-XXXX`)
- Countdown: "This page will reset in 10 seconds for the next voter." → redirects to `/` after 10 seconds.
- Session is cleared on this page load.

#### `/results` — Live Results Screen
- Separate page, intended to be displayed on a projector or monitor at the venue.
- Only visible if `election_settings.results_visible = true` (admin toggle).
- Auto-refreshes every 5 seconds using Supabase Realtime subscription.
- Shows per position:
  - Position name as section heading.
  - Each candidate: photo, name, vote count, percentage bar (warm brown fill).
  - Total votes cast for that position.
- Bottom: total voter turnout (voted / total registered × 100%).
- No authentication needed to view (public read).

---

### Admin Routes (password protected)

#### `/admin` — Admin Dashboard
- Login with admin username + password (Supabase Auth, separate admin user).
- Overview cards: Total registered voters, Total votes cast, Turnout %, Election status (Active / Closed).
- Quick actions: Toggle election on/off, Toggle results visibility.

#### `/admin/voters` — Voter Management
- Import voters from CSV (columns: student_id, full_name, first_name, middle_name, last_name, course, year_level).
- On import: auto-generate `qr_token` (UUID) and `pin_hash` (random 4-digit PIN, hashed with bcrypt).
- Export voter list with QR tokens and plain PINs (one-time export only, for Messenger distribution).
- Table: student_id, name, course, has_voted, voted_at. Searchable and filterable.
- Manual override: search by student_id, mark as eligible for manual voting (generates one-time access from admin panel for fallback cases).

#### `/admin/candidates` — Candidate Management
- Add, edit, delete candidates per position.
- Upload candidate photo to Supabase Storage.
- Set platform points (add/remove individual bullet points).
- Reorder candidates and positions.

#### `/admin/results` — Results Management
- Live vote tally table.
- Toggle results visibility for the public `/results` page.
- Export results as CSV.

---

## API / Edge Functions

### `POST /api/verify-token`
**Request:** `{ token: string }`
**Logic:**
1. Look up `voters` where `qr_token = token`.
2. If not found → return `{ error: "INVALID_TOKEN" }`.
3. If `has_voted = true` or `token_used = true` → return `{ error: "ALREADY_VOTED" }`.
4. Check `election_settings` — if not active or outside voting window → return `{ error: "ELECTION_CLOSED" }`.
5. Mark `token_used = true` (token is now consumed, cannot be re-scanned).
6. Create a short-lived signed JWT (10 min expiry) containing `voter_id` and `stage: "qr_verified"`.
7. Return `{ success: true, name: voter.full_name, course: voter.course, year: voter.year_level, session: jwt }`.

### `POST /api/verify-pin`
**Request:** `{ pin: string }` + JWT in Authorization header
**Logic:**
1. Validate JWT. Extract `voter_id`.
2. Check attempt count (stored in Redis or Supabase temp table). If ≥ 3 → return `{ error: "TOO_MANY_ATTEMPTS" }`.
3. Fetch `voters.pin_hash` for `voter_id`.
4. bcrypt compare `pin` against `pin_hash`.
5. If wrong → increment attempt count → return `{ error: "WRONG_PIN", attemptsLeft: N }`.
6. If correct → issue new JWT with `stage: "pin_verified"` (10 min expiry). Return `{ success: true, session: jwt }`.

### `POST /api/submit-vote`
**Request:** `{ votes: [{ position_id, candidate_id }] }` + JWT in Authorization header
**Logic:**
1. Validate JWT. Must have `stage: "pin_verified"`.
2. Extract `voter_id`.
3. Check `voters.has_voted` — if true → return `{ error: "ALREADY_VOTED" }`.
4. Begin Supabase transaction:
   a. Insert one row into `votes` per position (voter_id, position_id, candidate_id).
   b. Update `voters` set `has_voted = true`, `voted_at = NOW()`.
5. On success → generate reference code → return `{ success: true, reference: "VT-YYYYMMDD-XXXX", timestamp: ISO }`.
6. Invalidate JWT.

---

## Security Considerations

- All token verification happens server-side only (Edge Functions). Token is never decoded client-side.
- `voters` table has RLS: no client can read voter data directly. Only service role (Edge Functions) can.
- `votes` table has RLS: client can insert (via Edge Function proxy) but never read individual votes.
- JWTs have 10-minute expiry. Expired sessions redirect to `/`.
- `token_used` is set to `true` on first QR scan — even before PIN entry. This prevents someone from scanning the same QR twice in parallel from two devices.
- PIN has max 3 attempts with lockout.
- No PII is exposed in API responses — only first name, course, year.
- All API routes require HTTPS.
- Admin routes require separate Supabase Auth session.
- Voting window enforced server-side (not just client-side).

---

## QR Generation Script (Node.js — run before election day)

```js
// generate-qrs.js
// Run: node generate-qrs.js
// Input: voters.csv
// Output: /qr-output/<student_id>.png + tokens-and-pins.csv

const QRCode = require('qrcode');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const raw = fs.readFileSync('voters.csv');
  const voters = csv.parse(raw, { columns: true });
  const output = [];

  for (const voter of voters) {
    const token = crypto.randomBytes(24).toString('hex');
    const pin = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit
    const pinHash = await bcrypt.hash(pin, 10);

    // Save to Supabase
    await supabase.from('voters').upsert({
      student_id: voter.student_id,
      full_name: voter.full_name,
      first_name: voter.first_name,
      middle_name: voter.middle_name,
      last_name: voter.last_name,
      course: voter.course,
      year_level: voter.year_level,
      pin_hash: pinHash,
      qr_token: token,
    });

    // Generate QR image
    await QRCode.toFile(`./qr-output/${voter.student_id}.png`, token, {
      width: 400,
      margin: 2,
      color: { dark: '#2C2416', light: '#FDFAF5' }, // matches design palette
    });

    output.push({ student_id: voter.student_id, full_name: voter.full_name, pin });
    console.log(`Generated: ${voter.student_id}`);
  }

  // One-time export of plain PINs (for Messenger distribution, then delete this file)
  fs.writeFileSync('tokens-and-pins.csv', stringify(output, { header: true }));
  console.log('Done. Send QR images + PINs to students via Messenger, then delete tokens-and-pins.csv.');
}

run();
```

**CSV input format (`voters.csv`):**
```
student_id,full_name,first_name,middle_name,last_name,course,year_level
2023-00142,Juan Dela Cruz,Juan,Santos,Cruz,BSCS,3A
2023-00143,Maria Santos,Maria,Luna,Santos,BEED,2B
```

---

## Messenger Distribution Workflow

1. Run `generate-qrs.js` → produces one PNG per student + `tokens-and-pins.csv`.
2. COMELEC officer matches each student's PNG to their name in `tokens-and-pins.csv`.
3. Send via Facebook Messenger: message format:
   > "Hi [First Name]! Here is your personal QR code for the PSU Narra Elections 2025. Your PIN is [XXXX]. Keep this private. On election day, scan the website QR at the station, then scan this image when prompted. Do not share your QR or PIN with anyone."
4. Attach the student's PNG image.
5. After all are sent, securely delete `tokens-and-pins.csv` from your computer.

---

## Fallback Flow (students without QR or forgot PIN)

1. Student proceeds to voting station and tells officer they cannot scan.
2. Officer opens `/admin` panel on station laptop.
3. Officer searches by Student ID.
4. Officer verifies student's physical school ID (face + ID match).
5. Officer clicks "Issue manual access" — system generates a one-time temporary token, marks it as manual override.
6. Student proceeds to `/scan`, officer enters the temporary token manually, voter is verified.
7. Manual overrides are logged with officer name, timestamp, and reason for audit purposes.

---

## File / Folder Structure (Next.js)

```
/app
  /page.tsx                  → Intro page (/)
  /scan/page.tsx             → QR scanner (/scan)
  /pin/page.tsx              → PIN entry (/pin)
  /vote/[position]/page.tsx  → Ballot pages (/vote/1, /vote/2...)
  /review/page.tsx           → Review page (/review)
  /done/page.tsx             → Confirmation page (/done)
  /results/page.tsx          → Live results (/results)
  /admin
    /page.tsx                → Admin dashboard
    /voters/page.tsx         → Voter management
    /candidates/page.tsx     → Candidate management
    /results/page.tsx        → Results management
/api
  /verify-token/route.ts     → Edge Function
  /verify-pin/route.ts       → Edge Function
  /submit-vote/route.ts      → Edge Function
/components
  /QRScanner.tsx             → html5-qrcode wrapper component
  /CandidateCard.tsx         → Candidate display with platform
  /ProgressBar.tsx           → Ballot progress indicator
  /PinPad.tsx                → On-screen numpad component
  /ResultsChart.tsx          → Live results bar chart
  /AdminTable.tsx            → Reusable admin data table
/lib
  /supabase.ts               → Supabase client (browser)
  /supabase-admin.ts         → Supabase client (service role, server only)
  /session.ts                → JWT helpers
  /bcrypt.ts                 → PIN hashing helpers
/styles
  /globals.css               → Design tokens (CSS variables)
/scripts
  /generate-qrs.js           → Pre-election QR + PIN generation
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...          # server only, never expose to client
JWT_SECRET=your-random-secret-here
NEXT_PUBLIC_SITE_URL=https://vote.psu-narra.edu
```

---

## Non-Functional Requirements

- Works on mobile browsers (Chrome for Android, Safari for iOS). No app install required.
- Camera QR scanning must work on both Android and iOS.
- Page load under 2 seconds on mobile data (3G/4G).
- System must handle 1,000+ concurrent voters without degradation (Supabase handles this).
- Voting window enforced: system rejects votes outside the configured time window.
- All times stored and compared in UTC. Display in Philippine Standard Time (UTC+8).
- Session auto-expires after 10 minutes of inactivity — user must re-scan QR.
- No vote data is ever sent to or readable from the client. All tallying is server-side.
- Admin panel accessible only from the station laptop (optional: IP whitelist in Supabase).

---

## Summary of Pages

| Route | Who uses it | Purpose |
|---|---|---|
| `/` | Voters | Entry point, Vote Now button |
| `/scan` | Voters | Scan personal QR code |
| `/pin` | Voters | Enter 4-digit PIN |
| `/vote/[n]` | Voters | Paginated ballot (one position per page) |
| `/review` | Voters | Review selections before submitting |
| `/done` | Voters | Confirmation + receipt |
| `/results` | Public / projector | Live election results |
| `/admin` | COMELEC officers | Dashboard + controls |
| `/admin/voters` | COMELEC officers | Import voters, manual fallback |
| `/admin/candidates` | COMELEC officers | Manage candidates and positions |
| `/admin/results` | COMELEC officers | View tally, toggle results visibility |
