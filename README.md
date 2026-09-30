# Scratch-Pad

A personal link library built with React, Vite, TypeScript, Tailwind CSS, TanStack Query, Headless UI, and Supabase. The MVP in [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) is implemented. This workspace is connected to the supplied hosted Supabase project; the migrations and required Auth settings have been applied.

## Run with your hosted Supabase project

Requires Node 22.12 or newer and npm. Install with `npm ci`.

The provided public connection is saved in the gitignored `.env.local` in this workspace. For another checkout, copy `.env.example` to `.env.local` and set:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-publishable-or-anon-key
VITE_AUTH_EMAIL_DOMAIN=users.scratch-pad.test
```

Only a publishable or legacy anon key belongs here. Vite exposes `VITE_*` values to the browser. The app rejects secret/service-role keys. The internal email domain must stay consistent after accounts are created: `alice` logs in as `alice@users.scratch-pad.test`. The reserved `.test` domain is intentional for internal addresses; they cannot receive recovery mail. You can choose your own internal domain before creating accounts.

For the empty hosted project supplied for this workspace:

```sh
npx supabase login
npx supabase link --project-ref nfgbbltvftwsoylglljw
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

These commands apply the three files in `supabase/migrations`. Review existing schemas before applying to a different project. Do not use `db reset` against a hosted database.

Set these hosted Auth settings in the Supabase Dashboard before signing up:

- Email provider and email signup enabled; **Confirm email disabled**.
- Minimum password length **12**; required characters **lowercase, uppercase, digits, symbols**.
- Secure password change enabled. Settings verifies the current password by signing in again before updating it.
- Leaked password protection enabled if available on your plan.
- Site URL `http://127.0.0.1:5173` for development; change it to your site's HTTPS URL when publishing. Allow `http://localhost:5173` if you use that address.

```sh
npm run dev
```

Open `http://127.0.0.1:5173`. Create an account using a username and a strong password. The password checklist provides feedback; Supabase must also enforce the server policy. The local configuration enforces it automatically, but local `config.toml` does **not** change hosted settings by itself.

## Run entirely locally

Requires Docker and the PostgreSQL `psql` client for database checks. The Supabase CLI is included as a development dependency. Move an existing `.env.local` aside before using this setup; the script refuses to overwrite it.

```sh
npm ci
npm run setup:local
npm run db:test
npm run dev
```

The local API is on port 54321 and Postgres on 54322. Local Supabase uses the same migrations and password settings as the app requires. Storage, Realtime, Studio, and analytics are disabled because this app does not use them. Run `npm run db:stop` when finished. After changing migrations on your disposable local database, use `npm run db:reset` and `npm run db:types`.

## What works

- Username signup/login, persistent sessions, protected routes, logout, and verified password changes.
- Quick add, URL normalization, editable source detection, readable fallback titles, optional notes, and duplicate notices.
- Transactional link/tag saves, edit and confirmed delete, exact local timestamps, and 50-row pagination.
- Inline tag creation/autocomplete and a tag management page with usage counts, rename, and delete without removing links.
- Literal text search across title, URL, source, and note; match-all tag filters; source filters; newest/oldest/title sorting. Filter state survives reloads and browser navigation through URL parameters.
- System/light/dark themes persisted locally with theme applied before React loads.
- Responsive filter controls, sticky phone search, removable active-filter chips, and expandable tag rows. Wide libraries include a sticky tag sidebar.
- Touch targets of at least 44px and 16px touch inputs, including tablets. Phone link dialogs keep Save in the header; confirmations use safe-area-aware bottom sheets. Keyboard hints appear on devices with a fine pointer.
- Accessible keyboard menus/comboboxes, focus-trapped dialogs, and visible focus indicators. Touch link forms offer the eight most-used tags and move Tags above Note and Source.
- Library shortcuts: `/` focuses search, `n` opens Add, and Ctrl/Command + Enter saves. Paste a web URL while outside an input to open Add.

The plan's “Later” features (PWA sharing, bookmarklets, bulk import, metadata fetching, export, favorites, real-email recovery) remain outside this MVP.

## Verification

```sh
npm test             # Pure URL, source, account, password, and tag validation
npm run lint
npm run format:check
npm run build
npm run db:start
npm run db:test      # SQL isolation checks and real Auth/REST/RPC integration
npm run db:test:hosted # Optional: integration on the linked hosted project
npm run test:e2e     # Desktop, Pixel 7, 320px phone, and iPad Mini against local Supabase
```

The browser suite uses installed Google Chrome and a separate Vite server on port 5174. It passes local public connection details directly to that server, so your hosted `.env.local` stays intact. Test accounts are removed from the local database afterward. Screenshots and failure traces stay in gitignored `.local/` and `test-results/` directories. Responsive light/dark screenshots are saved to `.local/responsive/`; the suite checks overflow, touch sizing, touch input fonts, keyboard hints, filter chips, sticky search, sidebar filters, and dialog actions.

The implementation follows [RESPONSIVE_PLAN.md](RESPONSIVE_PLAN.md), including the optional wide-screen sidebar. Physical-device keyboard behavior, iPhone safe areas and input zoom, browser toolbar colors, and native desktop text zoom still need the manual checklist in that plan. To test from a phone on the same network, run `npx vite --host 0.0.0.0` and open `http://<computer-ip>:5173`.

The optional hosted integration creates temporary test accounts and data, checks the configured server password policy and API isolation, then removes only its own test accounts through the authenticated CLI. It checks that the linked project matches `.env.local` first. On Linux, a headless terminal may need its desktop keyring connection restored with `DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus` before CLI operations.

`supabase/tests/rls_check.sql` verifies two-user read/update/delete isolation, foreign-tag rejection, anonymous denial, immutable save timestamps, atomic rollback, AND filtering, escaped wildcards, and unsafe-URL rejection inside a rolled-back transaction. `scripts/api-check.mjs` verifies those behaviors through real Supabase Auth and the public API, including PostgREST tag embedding and pagination. Tests never need a privileged frontend API key.

The generated `src/lib/database.types.ts` matches the local schema. Regenerate it with `npm run db:types` after schema changes; the script preserves the previous file if generation fails.

Verified on September 30, 2026: 23 unit tests and four desktop/mobile browser tests passed, with no WCAG 2.1 A/AA violations found on the checked login, dialog, and light/dark library screens. TypeScript, ESLint, Prettier, the production build, local database lint, and both local and hosted security/integration checks passed. Hosted RLS SQL assertions ran inside a rolled-back transaction. Temporary accounts and test services were cleaned up; the hosted connection and local app server remain ready to use.

Responsive verification on September 30, 2026: all 23 unit tests and 12 browser tests passed across desktop, Pixel 7, 320px phone, and iPad Mini projects. Lint, formatting, and the production build passed. Responsive checks include landscape dialogs and enlarged desktop text; physical-device checks remain pending as described above.

## Database decisions

All user data tables enable RLS, and the RPC functions run as the caller. Composite foreign keys require each link and tag to share an owner. The join-table primary key includes `user_id` so PostgREST recognizes the composite many-to-many relationship. A security-invoker view supplies tag counts; a security-invoker RPC returns distinct used sources without truncating them to the first page of links.

Column grants protect `user_id`, IDs, `created_at`, and `updated_at` from client writes. Profile usernames are read-only to keep the username/email mapping consistent. Tag updates only change their names; deletes cascade to tag associations and keep links. Profile creation is the only security-definer trigger. Every RPC is denied to anonymous callers, and anonymous roles have no table access.

## Publish

Build with `npm run build` and publish `dist/` to your preferred static host. Set the three `VITE_*` values in the host's build environment before building, then set the Supabase Auth Site URL to the final HTTPS address. The public key is expected to be visible in the built JavaScript; data isolation is enforced by RLS.

Vercel can use `vercel.json`; Netlify and Cloudflare Pages can use the included `public/_redirects`. Use the build command `npm run build` and output directory `dist`. The fallback serves `index.html` for routes such as `/tags` and `/settings`. No hosting account or target was provided, so this workspace does not create a public deployment.

# scratch-pad
