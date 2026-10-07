# Scratch-Pad — Development Plan

A personal link-saving app: one place to quickly save links, tag them, and find them again later.

**Stack:** React (Vite + TypeScript) · Tailwind CSS · Supabase (Auth + Postgres + RLS)

---

## 0. Summary of Key Decisions

| Decision | Recommendation | Why |
|---|---|---|
| Organization model | **Tags only** | A link often belongs to several topics. The auto-detected **source** (YouTube, GitHub…) already gives you a free, zero-effort broad grouping, so categories would add little. |
| Source/site | **Auto-detected from the URL**, editable | No typing needed for the common case. |
| Login | **Username + password** via Supabase Auth (username mapped to an internal email) | Supabase Auth is email-based; this gives username login with no custom auth code. There's a clear upgrade path to real emails later. |
| Data isolation | **Postgres Row Level Security** on every table, keyed on `auth.uid()` | Enforced in the database. It holds even if the frontend has a bug. |
| Search / tag filtering | One **`search_links` SQL function**, called over RPC | Multi-tag "match all" filtering is awkward through the plain query builder. A single function keeps it fast and in one place. |
| Saving link + tags | One **`save_link` SQL function** | Link, new tags and tag links are saved in one transaction, so a save never half-succeeds. |
| Data fetching | `@supabase/supabase-js` + **TanStack Query** | Handles caching, loading/error states and refetch-after-mutation with very little code. |

### Name suggestions

"Scratch-Pad" reads as a notes app. Some names that describe revisiting links:

- **Revisit**: says exactly what the app is for. *(My pick.)*
- **Shelf**: short and calm; "put it on the shelf for later."
- **Stash**: fast and casual; matches "quick save."
- **Backlog**: fits if you mostly save things to read or watch later.
- **Linkshelf**: more literal, if you want "link" in the name.

The name only affects copy and the page title, so you can decide at any point.

---

## 1. Recommended Application Structure

A single-page React app talking directly to Supabase. No custom backend server.

```
┌──────────────────────────┐        HTTPS (JWT)        ┌─────────────────────────────┐
│  React SPA (Vite)        │ ───────────────────────▶ │ Supabase                    │
│  - React Router          │                           │  - Auth (username→email)    │
│  - TanStack Query        │ ◀─────────────────────── │  - Postgres + RLS           │
│  - Tailwind (light/dark) │                           │  - RPC: save_link,          │
└──────────────────────────┘                           │         search_links        │
                                                       └─────────────────────────────┘
```

- **Frontend only holds the public (anon/publishable) key.** All security comes from RLS.
- **The service-role key is never used in the app** and never committed.
- **Schema lives in SQL migration files** in the repo (`supabase/migrations/`), so the database can be recreated or reviewed.
- **UI state that should survive reload/back button** (search text, selected tags, sort) lives in the **URL query string**, e.g. `/?q=react&tags=frontend,video&sort=newest`.

---

## 2. Main Pages / Screens

| Route | Screen | Purpose |
|---|---|---|
| `/login` | Log in | Username + password. |
| `/signup` | Create account | Username, password, confirm password, live password rules. |
| `/` | **Library** (main screen) | Quick-add bar, search, tag/source filters, sort, link list. You'll spend ~95% of your time here. |
| (dialog) | Add / Edit link | Opens over the Library. Full-screen sheet on mobile. |
| `/tags` | Manage tags | List tags with link counts; rename, delete. |
| `/settings` | Settings | Username display, change password, theme (System/Light/Dark), sign out. |

Unknown routes redirect to `/`. Everything except `/login` and `/signup` requires a session.

### Library layout (desktop)

```
┌───────────────────────────────────────────────────────────────────────┐
│ Revisit                                   Library  Tags  Settings  ◐ │
├───────────────────────────────────────────────────────────────────────┤
│ [ Paste a link to save…                                    ] [ Save ] │
├───────────────────────────────────────────────────────────────────────┤
│ [ Search…            ]   Source: [All ▾]   Sort: [Newest ▾]          │
│ Tags:  frontend ×  video ×   + add filter            Clear filters    │
├───────────────────────────────────────────────────────────────────────┤
│ How React Server Components work                                  ⋯  │
│ YouTube · youtube.com · Sep 30, 2026, 5:56 PM                         │
│ frontend  video                                                       │
│───────────────────────────────────────────────────────────────────────│
│ supabase/supabase                                                 ⋯  │
│ GitHub · github.com · Sep 29, 2026, 9:12 AM                           │
│ Optional note shows here, truncated to one or two lines…             │
│ backend  tools                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

On mobile the filters collapse behind a "Filters" button and the nav becomes a compact top bar.

---

## 3. Core User Flows

### 3.1 Sign up
1. Enter username, password, and password confirmation.
2. Password rules show live as a checklist (✓/✗ per rule). Submit is disabled until all rules pass.
3. On success the user is logged in and lands on the empty Library, which shows a short "Paste your first link" hint.

### 3.2 Log in / out
- Log in with username + password. The session persists across reloads (Supabase handles refresh tokens).
- Sign out is in the header menu and in Settings.

### 3.3 Save a link (the most important flow; should take seconds)
1. Paste a URL into the quick-add bar. Pasting a URL anywhere on the Library, while not typing in an input, also opens the add dialog.
2. The add dialog opens prefilled:
   - **URL**: normalized (trimmed; `https://` added if missing).
   - **Source**: auto-detected (e.g. `YouTube`) and editable.
   - **Title**: focused and empty. If you don't enter one, it defaults to something readable from the URL (see §6.3).
   - **Description**: optional.
   - **Tags**: type to autocomplete existing tags; press Enter or comma to create a new one.
3. If the URL is already saved, a non-blocking notice says *"You saved this on Sep 12, 2026"* with a link to edit it. You can still save it again.
4. Press **Save** or `Ctrl/⌘+Enter`. The link appears at the top of the list and `created_at` is set by the database.

### 3.4 Browse and revisit
- Clicking the title opens the URL in a new tab (`target="_blank" rel="noopener noreferrer"`).
- Each row shows the title, source, domain, exact save date/time, tags, and the first lines of the note.
- Clicking a tag chip on a row adds that tag to the filter.
- The list loads 50 at a time, with a **Load more** button.

### 3.5 Search, filter, sort
- The search box (debounced ~250 ms) matches title, URL, description, and source.
- Tag filter: pick one or more tags. **A link must have all selected tags (AND).** This narrows results, which is usually what you want.
- Source filter: a dropdown built from sources you have actually used.
- Sort options: **Newest** (default), **Oldest**, **Title A–Z**.
- All of these are reflected in the URL, so the back button and bookmarks work.

### 3.6 Edit / delete a link
- Each row has a `⋯` menu with **Edit** and **Delete**.
- Edit opens the same dialog as Add. The original saved date stays unchanged, and `updated_at` is tracked separately.
- Delete asks for confirmation in an in-app dialog, not `window.confirm`.

### 3.7 Manage tags
- `/tags` lists all tags with link counts, sorted by name or usage.
- **Rename**: changes the tag on every link that uses it.
- **Delete**: removes the tag from every link but keeps the links. The confirmation shows how many links are affected.
- Tags are also created on the fly from the link form, so this page is only for cleanup.

### 3.8 Theme
- Defaults to the OS preference. The toggle cycles System → Light → Dark and the choice is saved in `localStorage`.
- An inline script in `index.html` applies the theme before React loads, which prevents a white flash in dark mode.

---

## 4. Main React Components

**App shell**
- `App`: router and providers (QueryClient, Auth, Theme).
- `AuthProvider` / `useAuth()`: exposes the session and user, and listens to `onAuthStateChange`.
- `RequireAuth`: route guard; redirects to `/login` when there is no session.
- `AppHeader`: app name, nav links, theme toggle, user menu.
- `ThemeProvider` / `useTheme()` / `ThemeToggle`.

**Auth**
- `LoginForm`, `SignupForm`.
- `PasswordRules`: a live checklist driven by the same rules the server enforces.

**Links**
- `QuickAddBar`: URL input that opens `LinkFormDialog` prefilled.
- `LinkFormDialog`: add/edit form (URL, source, title, description, tags) with a duplicate-URL notice.
- `LinkToolbar`: `SearchInput`, `SourceSelect`, `SortSelect`, `TagFilter`, "Clear filters".
- `LinkList`: renders rows plus empty, loading, and error states, and "Load more".
- `LinkRow`: one saved link, with its actions menu.
- `DeleteLinkDialog`.

**Tags**
- `TagInput`: multi-select combobox with autocomplete and create-on-Enter. Used in the link form.
- `TagFilter`: multi-select of existing tags for filtering, backed by `TagInput`'s combobox.
- `TagChip`: small, plain label. Optionally clickable or removable.
- `TagsPage` / `TagRow`: rename inline, delete with confirmation.

**Shared UI primitives** (`components/ui/`)
- `Button`, `Input`, `Textarea`, `Select`, `Dialog`, `Menu`, `EmptyState`, `Spinner`, `Toast`.
- Build these on **Headless UI** or **Radix primitives** (unstyled, accessible) for Dialog, Menu and Combobox so focus trapping and keyboard support come for free. They are styled only with Tailwind.

**Data hooks** (TanStack Query wrappers)
- `useLinks(filters)`, `useSaveLink()`, `useDeleteLink()`, `useLinkByUrl(url)` (duplicate check).
- `useTags()`, `useRenameTag()`, `useDeleteTag()`, `useSources()`.

---

## 5. Suggested Supabase Database Schema

Four tables in the `public` schema. All user-owned rows carry a `user_id` that defaults to `auth.uid()`, which covers both RLS and the future multi-user case.

```sql
-- ─────────────────────────────────────────────────────────────
-- profiles: one row per auth user (holds the username)
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique
              check (username ~ '^[a-z0-9_]{3,30}$'),
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- links
-- ─────────────────────────────────────────────────────────────
create table public.links (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  url          text not null
               check (url ~* '^https?://' and char_length(url) <= 2048),
  title        text not null check (char_length(title) between 1 and 300),
  source       text check (char_length(source) <= 60),
  description  text check (char_length(description) <= 5000),
  created_at   timestamptz not null default now(),   -- exact save time
  updated_at   timestamptz not null default now(),
  unique (id, user_id)                                -- target for composite FK below
);

create index links_user_created_idx on public.links (user_id, created_at desc);
create index links_user_url_idx     on public.links (user_id, url);
create index links_user_source_idx  on public.links (user_id, source);

-- ─────────────────────────────────────────────────────────────
-- tags (per user; stored lowercase so "React" and "react" are one tag)
-- ─────────────────────────────────────────────────────────────
create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  name        text not null
              check (name = lower(btrim(name)) and char_length(name) between 1 and 32),
  created_at  timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- link_tags: many-to-many join
-- Composite FKs guarantee a link can only be tagged with the SAME user's tags.
-- ─────────────────────────────────────────────────────────────
create table public.link_tags (
  link_id  uuid not null,
  tag_id   uuid not null,
  user_id  uuid not null default auth.uid(),
  primary key (link_id, tag_id),
  foreign key (link_id, user_id) references public.links (id, user_id) on delete cascade,
  foreign key (tag_id,  user_id) references public.tags  (id, user_id) on delete cascade
);

create index link_tags_tag_idx on public.link_tags (tag_id);
create index link_tags_user_idx on public.link_tags (user_id);
```

### Triggers

```sql
-- Keep updated_at current on edits
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger links_set_updated_at
  before update on public.links
  for each row execute function public.set_updated_at();

-- Create the profile row automatically at sign-up
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

`created_at` is never exposed as editable and has no update path in the UI, so it always records the exact time the link was saved.

### Database functions (RPC)

Both functions are `security invoker`, so **RLS still applies** to everything they touch.

**`save_link(p_id, p_url, p_title, p_source, p_description, p_tag_names text[]) → links`**
1. If `p_id` is null, insert a link. Otherwise update the link with that id; RLS guarantees it's yours.
2. Normalize the tag names (trim, lowercase, dedupe), then `insert … on conflict (user_id, name) do nothing`.
3. Replace the link's rows in `link_tags` with the resulting tag ids.
4. Return the saved link.

All of this runs in a single transaction.

**`search_links(p_query, p_tag_ids uuid[], p_source, p_sort, p_limit, p_offset) → setof links`**
- `p_query`: `ilike` match across title, url, description and source (`%` and `_` in user input are escaped).
- `p_tag_ids`: the link must have **all** given tags. Implemented as a count of matching `link_tags` = `cardinality(p_tag_ids)`.
- `p_source`: exact match when provided.
- `p_sort`: `newest` | `oldest` | `title`.
- The client embeds each link's tags in the same request: `supabase.rpc('search_links', …).select('*, tags(id, name)')`.

**Tag counts for `/tags`:** either a small view `tag_usage` (`security_invoker = true`) or a `select('id, name, link_tags(count)')` query. Both respect RLS.

**Scale note:** `ilike` search is fine up to many thousands of links per user. If it ever gets slow, add a generated `tsvector` column with a GIN index (or `pg_trgm`) without changing the UI.

---

## 6. Tag / Category Data Model

### 6.1 Evaluation

| Option | Pros | Cons | Fit |
|---|---|---|---|
| **Categories only** | Simple mental model | A link fits exactly one bucket. "React video tutorial": is that *Frontend* or *Videos*? You're forced to choose. | ✗ |
| **Tags only** | Handles overlap naturally; one concept to learn; one UI control | Needs light housekeeping (rename/delete on `/tags`) | **✓ Recommended** |
| **Categories + tags** | A broad bucket plus flexible labels | Two concepts to maintain, an extra decision on every save, and it overlaps with source | ✗ for now |

### 6.2 Recommendation: tags only

- **Tags** are flexible topic labels. A link can have zero or more.
- **Source** (auto-detected) already gives each link one broad grouping ("everything from YouTube") at no cost. That is what a category would have provided, without the extra effort on every save.
- Tags are **per user**, **lowercase**, **unique per user**, max 32 characters.
- Tags with zero links are kept, so you can pre-create tags, and can be deleted from `/tags`.

**If categories are ever needed**, adding a nullable `category_id` to `links` plus a `categories` table is a non-breaking migration. Nothing in the current design blocks it.

### 6.3 Automatic source detection (no manual entry)

A small pure function in `src/lib/source.ts`:

1. Parse the URL with the built-in `URL` API and take `hostname`.
2. Strip `www.`, `m.` and `mobile.` prefixes.
3. Look up the result in a small map of known sites, matching the domain and its subdomains:

   | Host(s) | Source |
   |---|---|
   | `youtube.com`, `youtu.be` | YouTube |
   | `github.com`, `gist.github.com` | GitHub |
   | `reddit.com`, `redd.it` | Reddit |
   | `medium.com`, `*.medium.com` | Medium |
   | `x.com`, `twitter.com` | X |
   | `stackoverflow.com` | Stack Overflow |
   | `news.ycombinator.com` | Hacker News |
   | `dev.to`, `substack.com` (`*.substack.com`), `linkedin.com`, `instagram.com`, `tiktok.com`, `facebook.com`, `vimeo.com`, `wikipedia.org` | … |

4. If the site isn't in the map, fall back to the bare domain (`example.com`). This is accurate and still groups well.
5. The detected source fills in an editable field, so you can override it.

**Default title when left blank:** use the last meaningful path segment, prettified (`/blog/how-rls-works` → "How rls works"), and fall back to the domain.

Automatically fetching the page's real `<title>` isn't possible directly from the browser because of CORS. It would need a small Supabase Edge Function, so it's listed under **Later**.

---

## 7. Authentication Approach

### 7.1 Username + password on top of Supabase Auth

Supabase Auth identifies users by email or phone, not by username. The simplest robust approach:

- At sign-up, the app turns the username into an **internal email**: `alice` → `alice@users.<your-domain>`.
- It calls `supabase.auth.signUp({ email, password, options: { data: { username } } })`.
- The `handle_new_user` trigger creates the `profiles` row with the username.
- At login, the app maps the username the same way and calls `signInWithPassword`.
- **Username uniqueness** is enforced twice: by `auth.users` (unique email) and by `profiles.username` (unique). No public "is this username taken?" endpoint is needed, which also prevents anyone from listing usernames.

**Required Supabase setting:** turn **"Confirm email" off**. The internal addresses can't receive mail, and with confirmation off Supabase never sends email to them.

**Trade-off to accept for now: no "forgot password" by email.** For a personal app this is fine; you can reset a password yourself from the Supabase dashboard.

**Upgrade path for multi-user:** add an email field to Settings and call `supabase.auth.updateUser({ email })`. That swaps the internal address for a real one and unlocks password reset. No schema change is required.

*(Alternative for later: an Edge Function that looks up a real email by username and signs in server-side. This is more moving parts than needed today.)*

### 7.2 Strong password requirements

Enforced on the **server** in Supabase Dashboard → Authentication → Providers/Policies:
- **Minimum length: 12**
- **Required characters: lowercase, uppercase, digits, and symbols**
- **Leaked password protection** (checks HaveIBeenPwned): turn on if your plan supports it.

Mirrored on the **client** by `PasswordRules` for instant feedback. The client check is a convenience; the server setting is what actually enforces the rules.

**Username rules:** 3–30 characters, lowercase letters, digits and underscore only. Input is lowercased automatically.

### 7.3 Session handling
- `supabase-js` stores the session and refreshes tokens automatically.
- `AuthProvider` subscribes to `onAuthStateChange` and clears the TanStack Query cache on sign-out, so no data from one user lingers for the next.
- Supabase's built-in auth rate limits protect against brute-force login attempts.
- **Optional:** after creating your own account, disable new sign-ups in Supabase (Authentication → Settings) until you're ready to open the app to others.

---

## 8. Row Level Security Strategy

**Rule: every table in `public` has RLS enabled, and every policy is `to authenticated` and keyed on `user_id = auth.uid()`.** With RLS on and no matching policy, access is denied by default. The `anon` role gets nothing.

```sql
alter table public.profiles  enable row level security;
alter table public.links     enable row level security;
alter table public.tags      enable row level security;
alter table public.link_tags enable row level security;

-- profiles: read and update your own row only (insert is done by the trigger)
create policy "profiles: read own"   on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- links / tags / link_tags: full CRUD on your own rows only
-- (same four policies per table; shown for links)
create policy "links: select own" on public.links for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "links: insert own" on public.links for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "links: update own" on public.links for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "links: delete own" on public.links for delete to authenticated
  using ((select auth.uid()) = user_id);
```

Why this is enough:
- **`using`** hides other users' rows from select, update and delete.
- **`with check`** stops you from inserting a row for someone else or changing `user_id` to someone else's.
- **Composite foreign keys on `link_tags`** make it impossible to attach *your* link to *someone else's* tag, even through a crafted request.
- **RPC functions are `security invoker`**, so they run as the calling user and go through the same policies. The only `security definer` function is the sign-up trigger, which touches nothing but the new user's own profile.
- `(select auth.uid())` instead of a bare `auth.uid()` is Supabase's recommended form: the value is evaluated once per query instead of once per row.
- `user_id` is indexed on every table, so policies stay fast.

**Additional safeguards**
- The URL check constraint (`^https?://`) blocks `javascript:` and `data:` URLs, which would otherwise be an XSS risk when rendered as links.
- React escapes all rendered text, and no `dangerouslySetInnerHTML` is used anywhere.
- The service-role key is never in the frontend, `.env` or git.

**Verification step (part of Phase 1):** create two test users. As user B, try to select, update and delete user A's link by id, and try to insert a `link_tags` row that points at user A's tag. All of these must fail or return zero rows. Keep this as a small SQL/JS script in the repo so it can be re-run after schema changes.

---

## 9. Suggested Project / Folder Structure

```
scratch-pad/
├─ index.html                 # includes inline theme script (no dark-mode flash)
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ .env.example               # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_AUTH_EMAIL_DOMAIN
├─ .env.local                 # real values — gitignored
├─ supabase/
│  ├─ migrations/
│  │  ├─ 0001_tables.sql
│  │  ├─ 0002_rls.sql
│  │  └─ 0003_functions.sql   # triggers, save_link, search_links
│  └─ tests/
│     └─ rls_check.sql        # two-user isolation checks
└─ src/
   ├─ main.tsx
   ├─ App.tsx                 # routes + providers
   ├─ index.css               # Tailwind import + color tokens (light/dark)
   ├─ lib/
   │  ├─ supabase.ts          # createClient
   │  ├─ database.types.ts    # generated by `supabase gen types`
   │  ├─ source.ts            # URL → source name (+ unit tests)
   │  ├─ url.ts               # normalize / validate / default title
   │  ├─ auth-email.ts        # username ↔ internal email
   │  └─ password-rules.ts    # shared rule list for PasswordRules
   ├─ features/
   │  ├─ auth/                # AuthProvider, RequireAuth, LoginPage, SignupPage, PasswordRules
   │  ├─ links/               # LibraryPage, QuickAddBar, LinkFormDialog, LinkList, LinkRow,
   │  │                       # LinkToolbar, api.ts, hooks.ts
   │  ├─ tags/                # TagInput, TagFilter, TagChip, TagsPage, api.ts, hooks.ts
   │  └─ settings/            # SettingsPage
   ├─ components/
   │  ├─ layout/              # AppHeader, AppLayout
   │  └─ ui/                  # Button, Input, Textarea, Select, Dialog, Menu, EmptyState, Toast
   └─ hooks/                  # useTheme, useDebounce, useHotkey, useUrlFilters
```

**Grouped by feature, not by file type**, so everything about links lives in one folder.

**Tooling:** Vite, TypeScript, Tailwind v4, ESLint + Prettier, and Vitest for the pure functions (`source.ts`, `url.ts`, password rules).

---

## 10. Development Phases

Each phase ends with something working and testable.

### Phase 0: Project setup (½ day)
- Vite + React + TS, Tailwind, React Router, TanStack Query, supabase-js, Headless UI/Radix.
- `.env.example`, Supabase client, ESLint/Prettier.
- **Design tokens and dark mode from day one:** CSS variables for colors in light and dark, a class-based `dark` variant, the theme script, and `ThemeToggle`. Retrofitting dark mode later is always more work.
- App shell: header, layout, placeholder routes.

### Phase 1: Database and security (½–1 day)
- Write and apply migrations: tables, constraints, indexes, triggers, RLS, `save_link`, `search_links`.
- Generate TypeScript types.
- **Run the two-user RLS check.** Do not move on until it passes.

### Phase 2: Authentication (1 day)
- Sign-up (username rules and live password rules), login, logout.
- `AuthProvider`, `RequireAuth`, redirects, clearing the cache on logout.
- Verify that the Supabase password policy rejects weak passwords server-side.

### Phase 3: Links CRUD (1–2 days)
- `source.ts` and `url.ts` with unit tests.
- Quick-add bar, `LinkFormDialog` (no tags yet), save, list, edit, delete.
- Exact save date/time shown in each row, in local time.
- Empty, loading and error states.

### Phase 4: Tags (1 day)
- `TagInput` with autocomplete and create-on-Enter; saving goes through `save_link`.
- Tag chips on rows.
- `/tags` page: list with counts, rename, delete.

### Phase 5: Search, filter, sort (1 day)
- `search_links` wired to the toolbar: search, tag filter (AND), source filter, sort.
- Filter state in the URL query string; debounced search; "Load more" pagination.
- Clicking a tag chip on a row adds it to the filter.
- Duplicate-URL notice in the add dialog.

### Phase 6: Polish and ship (1 day)
- Settings page (change password, theme, sign out).
- Keyboard shortcuts: `/` focuses search, `n` opens the add dialog, `Ctrl/⌘+Enter` saves.
- Paste-a-URL-anywhere-to-add.
- Responsive pass on phone and tablet; accessibility pass (labels, focus rings, contrast in both themes).
- Deploy as a static site (Vercel / Netlify / Cloudflare Pages) and set the Site URL in Supabase Auth.

**Estimated MVP total: about 6–8 focused days.**

---

## 11. MVP vs. Later

### MVP (Phases 0–6)
- Username + password auth with strong password rules (enforced server-side)
- Per-user data isolation through RLS, verified with a two-user test
- Add, view, edit and delete links
- Auto-detected, editable source
- Exact saved timestamp, plus `updated_at` for edits
- Tags: create inline, autocomplete, rename, delete
- Search across title, URL, description and source
- Filter by tags (match all) and by source; sort newest, oldest or A–Z
- Duplicate-URL notice
- Light, dark and system themes
- Responsive layout; keyboard shortcuts for fast saving
- **Mobile share target (PWA), implemented October 1, 2026.** Installable shell, Share → Scratch-Pad, shared URL/title preserved across login and signup, offline connection notices, and explicit update prompts. See [PWA_PLAN.md](PWA_PLAN.md); physical-device verification remains pending.

### Later: high value for the core problem
These directly reduce the "links scattered across apps" problem, so do them first after the MVP:
1. **Bookmarklet and browser extension, implemented October 4, 2026.** The toolbar button, keyboard shortcut, or bookmarklet opens the add dialog with the current page's URL and title. Context menus also save links and URLs from selections. Popup windows close after save or cancel. See [EXTENSION_PLAN.md](EXTENSION_PLAN.md) and [README.md](README.md#browser-extension); native browser verification and Firefox signing remain pending.
2. **Bulk import.** Paste a block of text (e.g. copied from Notes); the app extracts every URL and lets you tag them in one pass. Useful for moving your existing links over.
3. **Auto-fetch the page title.** A small Supabase Edge Function fetches the page's `<title>`/`og:title` when you paste a URL.

### Later: nice to have
- "Visited / to revisit" status, or a pinned/favorite flag
- Real email on the account plus password reset (the multi-user upgrade path in §7.1)
- Export to JSON/CSV
- Full-text search (`tsvector` + GIN) if `ilike` gets slow
- Favicons next to sources
- Tag merge (combining two tags into one)
- Account deletion from Settings (`on delete cascade` already cleans up the data)

### Deliberately excluded
- Categories (see §6)
- Nested folders or collections
- Social or sharing features
- Custom backend server

---

## Design Direction

The goal is a calm, fast tool that doesn't look like a generic SaaS template.

- **Layout:** a single-column list of **rows, not cards**, with a max width of about 860px, centered. Rows are separated by hairline borders, not shadows.
- **Typography:** a system font stack or one solid sans (e.g. IBM Plex Sans or Geist), plus a monospace font for URLs and domains. A clear three-level hierarchy:
  - title: 15–16px, medium weight
  - metadata (source · domain · date): 13px, muted
  - note: 14px, secondary color, clamped to 2 lines
- **Color:** a neutral grayscale (Tailwind `zinc` or `stone`) with **one** accent color for links, focus rings and the primary button. Dark mode uses near-black and off-white, not pure `#000`/`#fff`.
- **Shape:** small radii (`rounded` or `rounded-md`) for inputs and buttons. Tag chips are small with square-ish corners. No pill shapes everywhere.
- **Motion:** only short (≈120 ms) color and opacity transitions on hover and focus. Dialogs appear instantly or with a very short fade. No bounces, parallax or decorative animation.
- **No** gradients, glassmorphism, oversized hero sections, illustrations, or emoji-as-icons. Icons (e.g. Lucide) only where they replace words, such as `⋯` menus and the theme toggle.
- **Density:** comfortable but compact, so about 10–12 links are visible on a laptop screen without scrolling.
- **Dates:** exact and unambiguous, e.g. `Sep 30, 2026, 5:56 PM`, with the full ISO timestamp in a tooltip.

---

## What I Need From You Before Implementation

**Supabase**
- [ ] **Project URL**: `https://<project-ref>.supabase.co`
- [ ] **Publishable key** (`sb_publishable_…`) or legacy **anon public key**. ⚠️ Do **not** send the `service_role`/secret key; it's not needed.
- [ ] **Current database state:** is the `public` schema empty? If it already has tables, send the schema (Dashboard → Database → Tables, or `supabase db dump --schema-only`) so the migrations don't collide with it.
- [ ] **How migrations get applied:** will you paste SQL into the Supabase SQL Editor yourself, or set up the Supabase CLI (`supabase login` + `supabase link --project-ref …`) so I can run them?
- [ ] **Auth settings:** confirm, or let me walk you through:
  - [ ] Email provider **enabled**
  - [ ] **"Confirm email" disabled** (required for username-only login)
  - [ ] Password policy: **min length 12**, **lowercase + uppercase + digits + symbols** required
  - [ ] Leaked password protection on, if your plan (Free/Pro) supports it
- [ ] **Plan tier** (Free or Pro)

**Decisions**
- [ ] **Internal email domain** for username accounts (ideally a domain you own, e.g. `users.yourdomain.com`)
- [ ] **App name**: keep "Scratch-Pad" or pick one (Revisit / Shelf / Stash / …)
- [ ] **TypeScript** OK? (recommended)
- [ ] **Package manager**: npm or pnpm? Also your Node version (`node -v`)
- [ ] **Hosting target**: Vercel, Netlify, Cloudflare Pages, or local-only for now. This is needed for the Supabase Auth Site URL.
- [ ] **Tag filter behavior**: "must have all selected tags" (recommended) or "any selected tag"?
