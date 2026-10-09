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
- Transactional link/tag saves, edit and confirmed delete, exact local timestamps, and bordered entries with 20-link pages. Previous/Next navigation survives reloads and browser history; changing a filter returns to page 1.
- Inline tag creation/autocomplete and a tag management page with usage counts, rename, and delete without removing links.
- Literal text search across title, URL, source, and note; match-all tag filters; source filters; newest/oldest/title sorting. Filter state survives reloads and browser navigation through URL parameters.
- System/light/dark themes persisted locally with theme applied before React loads.
- Responsive filter controls, sticky phone search, removable active-filter chips, and expandable tag rows. Wide libraries include a sticky tag sidebar.
- Touch targets of at least 44px and 16px touch inputs, including tablets. Phone link dialogs keep Save in the header; confirmations use safe-area-aware bottom sheets. Keyboard hints appear on devices with a fine pointer.
- Accessible keyboard menus/comboboxes, focus-trapped dialogs, and visible focus indicators. Touch link forms offer the eight most-used tags and move Tags above Note and Source.
- Library shortcuts: `/` focuses search, `n` opens Add, and Ctrl/Command + Enter saves. Paste a web URL while outside an input to open Add.
- Installable app with launcher icons, an Add a link shortcut, a cached app shell, connection notices, and updates applied only when you choose Reload.
- Share a web link into the installed app to open Add with its URL and title. Login and signup preserve the shared link, and duplicate notices still offer editing the saved link.
- Browser extension and bookmarklet for saving desktop pages, links, or URLs in selected text. Small add windows close after saving or cancelling, including after login and duplicate editing.

The plan's remaining “Later” features (bulk import, metadata fetching, export, favorites, real-email recovery) remain outside this MVP.

## Install and share

Open the HTTPS site in Android Chrome, Edge, or Samsung Internet and choose the browser's **Install app** or **Add to Home screen** action. Desktop Chrome and Edge also support installation from the address bar or browser menu. On iPhone or iPad, open it in Safari and choose **Share → Add to Home Screen**. The installed app includes an **Add a link** launcher shortcut on supported platforms.

After installing in a compatible Chromium browser, choose **Share → Scratch-Pad** from a browser, YouTube, Reddit, Messenger, or another app sharing a web link. Scratch-Pad opens the add dialog with the shared URL and available title; review the details and choose Save. If you're signed out, log in or create an account first and the shared link follows you. Plain text without a web link shows a notice. The `/share?url=<encoded-url>&title=<encoded-title>` route also works directly.

Safari does not support Web Share Target, so Scratch-Pad will not appear as an iOS share-sheet destination. You can use either of these workarounds:

- Copy a web link, open Scratch-Pad, and paste outside an input to open Add, or paste into the quick-add field.
- Create an iOS Shortcut that accepts URLs from the Share Sheet, URL-encodes the shared URL, builds `https://scratch-pad-omega.vercel.app/share?url=<encoded-url>`, and runs **Open URLs**. Replace the host for your deployment. This opens the web route and preserves the link through login.

Once a successful online launch finishes caching the shell, the app and its pages can open offline. Account and link data always use the network; links are not persisted for offline reading or writing. A connection banner explains the situation, and Add/Edit keeps your draft with Save disabled until you reconnect. Login and signup fetch failures show a connection message. A new deployment shows a persistent **Reload** action; updates never automatically reload an open draft.

PWA files are generated by `npm run build`; the service worker is disabled in `npm run dev`. Use `npm run preview` to test a production build locally. The committed icons can be regenerated from `public/favicon.svg` with `npm run pwa:icons`; builds do not run the icon generator. Android maskable and iOS icons use an opaque `#386349` background.

## Browser extension

See [the installation guide](EXTENSION_INSTALL.md) for the step-by-step Chrome, Edge, Brave, and Firefox instructions. The ready-to-load folder is `extension/`; no extension build is required.

The personal extension in `extension/` is plain JavaScript with no build step. It opens the web app's add dialog in a 480 × 720 popup using your browser profile's existing login. Save leaves the success notice visible for about 600 ms, then closes the window; Cancel, Escape, and the dialog's close button close it immediately. Login/signup and **Edit the saved link** preserve this behavior. The web app needs the changes in [EXTENSION_PLAN.md](EXTENSION_PLAN.md) deployed for automatic closing to work.

In Chrome 121+, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select this repository's `extension/` folder. In Edge or Brave, use `edge://extensions` or `brave://extensions` and the same steps. Pin Scratch-Pad to the toolbar. The unpacked extension stays installed across restarts; click its reload icon after changing its files.

In Firefox 140+, open `about:debugging`, choose **This Firefox → Load Temporary Add-on**, and select `extension/manifest.json`. Temporary add-ons disappear after a restart. For a permanent personal installation, create an addons.mozilla.org account and API credentials, then sign an unlisted build:

```sh
npx web-ext lint -s extension --ignore-files '**/*.test.js'
npx web-ext sign -s extension --channel=unlisted --ignore-files '**/*.test.js' --api-key="$WEB_EXT_API_KEY" --api-secret="$WEB_EXT_API_SECRET"
```

Set those environment variables to your AMO credentials before signing. Install the signed `.xpi` from `web-ext-artifacts/` using Firefox's **Install Add-on From File** action. Keep the credentials out of the repository, and bump `extension/manifest.json`'s version before re-signing an update. `web-ext` runs through `npx` and is not a project dependency. Firefox 140 is the minimum because new add-ons must declare the data they transmit using [Firefox's built-in data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/): this extension sends the chosen URL, title, or selection to Scratch-Pad only when you invoke it. It requests only the `contextMenus` and `activeTab` API permissions and has no host permissions or content scripts.

- Click the toolbar button or press **Alt+Shift+S** to save the current page's URL and title. Change the shortcut at `chrome://extensions/shortcuts` (or the corresponding Edge/Brave page), or Firefox's **Manage Extension Shortcuts**.
- Right-click a link and choose **Save link to Scratch-Pad**, or a page and choose **Save page to Scratch-Pad**. Chrome does not supply the link's text, so the form uses a readable title from the URL if you leave Title blank.
- Select text containing a URL and choose **Save link in selection**. The app extracts the first web URL; text without a URL shows a notice.
- Right-click the extension's toolbar icon and choose **Open Scratch-Pad** to open the library in a normal tab.
- Browser settings, new-tab pages, and other non-web pages open an empty add dialog.

For local testing, change `APP_URL` in `extension/share-url.js` to `http://127.0.0.1:5173`, run `npm run dev`, and reload the extension. Restore the production URL before signing or using it against the hosted app. After regenerating the PWA icons, copy `public/pwa-64x64.png` and `public/pwa-192x192.png` to `extension/icons/icon-64.png` and `extension/icons/icon-192.png` if the artwork changed.

To use the bookmarklet instead, create a bookmark named **Save to Scratch-Pad** and paste this entire line into its URL field:

```text
javascript:void window.open('https://scratch-pad-omega.vercel.app/share?popup=1&url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'scratchpad','popup,width=480,height=720')
```

Click it on the page you want to save. Replace the host if you use another deployment. Some sites' Content Security Policy blocks bookmarklets; the extension works through the browser toolbar and menus.

## Verification

```sh
npm test             # Validation, share parsing/extension URLs, login destinations, offline errors, update prompts
npm run lint
npm run format:check
npm run build
npm run db:start
npm run db:test      # SQL isolation checks and real Auth/REST/RPC integration
npm run db:test:hosted # Optional: integration on the linked hosted project
npm run test:e2e     # Desktop, Pixel 7, 320px phone, and iPad Mini against local Supabase
npm run test:e2e -- --project=pwa # Production shell, manifest, sharing/popup closes, and offline behavior
npx playwright install chromium # Once, for loaded-extension checks
npm run test:extension # Isolated loaded Chromium extension, popup saves and real window closing
```

The browser suite uses installed Google Chrome, a Vite development server on port 5174, and a production build/preview on port 5175 for the PWA project. It passes local public connection details directly to those servers, so your hosted `.env.local` stays intact. Test accounts are removed from the local database afterward. Screenshots and failure traces stay in gitignored `.local/` and `test-results/` directories. Responsive light/dark screenshots are saved to `.local/responsive/`; the suite checks overflow, touch sizing, touch input fonts, keyboard hints, filter chips, sticky search, sidebar filters, and dialog actions.

The implementation follows [RESPONSIVE_PLAN.md](RESPONSIVE_PLAN.md), including the optional wide-screen sidebar. Physical-device keyboard behavior, iPhone safe areas and input zoom, browser toolbar colors, and native desktop text zoom still need the manual checklist in that plan. To test from a phone on the same network, run `npx vite --host 0.0.0.0` and open `http://<computer-ip>:5173`.

The optional hosted integration creates temporary test accounts and data, checks the configured server password policy and API isolation, then removes only its own test accounts through the authenticated CLI. It checks that the linked project matches `.env.local` first. On Linux, a headless terminal may need its desktop keyring connection restored with `DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus` before CLI operations.

`supabase/tests/rls_check.sql` verifies two-user read/update/delete isolation, foreign-tag rejection, anonymous denial, immutable save timestamps, atomic rollback, AND filtering, escaped wildcards, and unsafe-URL rejection inside a rolled-back transaction. `scripts/api-check.mjs` verifies those behaviors through real Supabase Auth and the public API, including PostgREST tag embedding and pagination. Tests never need a privileged frontend API key.

The generated `src/lib/database.types.ts` matches the local schema. Regenerate it with `npm run db:types` after schema changes; the script preserves the previous file if generation fails.

Verified on September 30, 2026: 23 unit tests and four desktop/mobile browser tests passed, with no WCAG 2.1 A/AA violations found on the checked login, dialog, and light/dark library screens. TypeScript, ESLint, Prettier, the production build, local database lint, and both local and hosted security/integration checks passed. Hosted RLS SQL assertions ran inside a rolled-back transaction. Temporary accounts and test services were cleaned up; the hosted connection and local app server remain ready to use.

Responsive verification on September 30, 2026: all 23 unit tests and 12 browser tests passed across desktop, Pixel 7, 320px phone, and iPad Mini projects. Lint, formatting, and the production build passed. Responsive checks include landscape dialogs and enlarged desktop text; physical-device checks remain pending as described above.

PWA verification on October 1, 2026: 64 unit tests and all 18 browser tests passed across the four existing projects and the new production PWA project. Lint, formatting, and the production build passed. Checks cover manifest/icon responses, service-worker control, offline shell and deep links, sharing through login/signup, duplicate editing, one-time shortcut consumption, draft preservation and reconnecting, network-only account data, and offline login errors. Update prompts are tested with a mocked worker, including activation from another tab. axe checks the offline screens in Chrome and notification action semantics in jsdom. Chrome's offline network emulation resets `navigator.onLine` after service-worker navigation, so the PWA test also reapplies the native navigator override. Real-device installation, OS share menus, and a second-deployment update still need [PWA_PLAN.md §7.2](PWA_PLAN.md#72-manual-on-devices).

Extension verification on October 4, 2026: 75 unit tests passed, including 11 extension URL cases. All 25 browser scenarios passed across desktop, Pixel 7, 320px phone, iPad Mini, and production PWA checks: 24 passed in the full run, and the actual-close scenario passed on a focused rerun after replacing Playwright's initial blank history entry in its setup. Checks cover popup closing after login/signup, duplicate editing, Cancel/Escape, empty add windows, failed-save recovery, ordinary tabs staying open, and actual Chrome closing with one history entry. Lint, formatting, and the production build passed. `web-ext lint` reported zero errors and two warnings: Firefox ignores the Chromium service-worker key, and the desktop Firefox minimum predates Android's data-consent support. The extension itself is not loaded by the browser suite; native toolbar/menu/shortcut checks, Firefox signing, and restart persistence remain pending in [EXTENSION_PLAN.md §8.2](EXTENSION_PLAN.md#82-manual-chrome-and-firefox). Deploy the app changes before expecting the production extension's popup windows to close automatically.

Extension follow-up on October 7, 2026: all 108 unit tests and two loaded Chromium extension scenarios passed. The separate extension suite verifies real popup creation and closing, saving through login, session reuse, duplicate editing, clicked-link and selection routing, empty add windows, and opening the library. Firefox lint reports zero errors and the same two cross-browser/Android warnings. Physical browser toolbar/menu/shortcut gestures and personal Firefox signing remain manual checks.

## Database decisions

All user data tables enable RLS, and the RPC functions run as the caller. Composite foreign keys require each link and tag to share an owner. The join-table primary key includes `user_id` so PostgREST recognizes the composite many-to-many relationship. A security-invoker view supplies tag counts; a security-invoker RPC returns distinct used sources without truncating them to the first page of links.

Column grants protect `user_id`, IDs, `created_at`, and `updated_at` from client writes. Profile usernames are read-only to keep the username/email mapping consistent. Tag updates only change their names; deletes cascade to tag associations and keep links. Profile creation is the only security-definer trigger. Every RPC is denied to anonymous callers, and anonymous roles have no table access.

## Publish

Build with `npm run build` and publish `dist/` to your preferred static host. Set the three `VITE_*` values in the host's build environment before building, then set the Supabase Auth Site URL to the final HTTPS address. The public key is expected to be visible in the built JavaScript; data isolation is enforced by RLS.

The production app is hosted at [scratch-pad-omega.vercel.app](https://scratch-pad-omega.vercel.app) in the `prof-pixs-projects/scratch-pad` Vercel project. The project is connected to the GitHub repository, and the three public `VITE_*` values are configured for production and preview builds. The Supabase Auth Site URL is set to the production address.

`vercel.json` sets the Vite framework, build command `npm run build`, output directory `dist`, and the fallback for routes such as `/tags` and `/settings`. `.vercelignore` excludes local environment files, signing keys, and test output from uploads. This checkout is linked through the gitignored `.vercel/` directory; redeploy it with `vercel deploy --prod --yes`. A fresh checkout can use `vercel link --project scratch-pad --scope prof-pixs-projects --yes` first. Netlify and Cloudflare Pages can use the included `public/_redirects` if you move hosts.

# scratch-pad
