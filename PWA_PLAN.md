# Scratch-Pad — PWA Plan

A plan to make the **existing** Scratch-Pad app installable and to let your phone's **Share** menu send links straight into it.

[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) lists this as the top "Later" item ("Mobile share target"). This plan is based on the current code in `src/`. It adds no other features. Bookmarklets, bulk import, and offline editing stay out of scope.

**Implementation status:** Phases 1–3 implemented October 1, 2026. Automated verification is recorded in the README; the physical-device checklist in §7.2 remains pending. Optional offline reading (§8) remains out of scope.

---

## 1. Goals and Non-Goals

**Goals**

1. **Installable** on Android (Chrome, Edge, Samsung Internet) and desktop Chrome/Edge, and addable to the iOS/iPadOS home screen.
2. **Share target.** Sharing from YouTube, Reddit, Messenger, or a browser opens Scratch-Pad's add dialog with the URL and title filled in.
3. **Fast, offline-tolerant shell.** The app opens from the home screen without a network round-trip for HTML/JS/CSS. With no network, it explains the problem instead of showing a browser error page.
4. **Safe updates.** A new deploy never reloads the page while a dialog has unsaved input.

**Non-goals**

- Offline reading or writing of links (see §8, optional).
- Push notifications, background sync, periodic sync.
- Native wrappers (TWA, Capacitor).
- iOS share-sheet support. **Safari does not implement the Web Share Target API**, so the share menu works only on Chromium-based Android browsers and installed desktop Chromium apps. §5.6 covers the iOS fallback.

---

## 2. Where the App Stands Today

| Already in place                                                                   | Where                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------- |
| `viewport-fit=cover`, safe-area insets on toasts, dialogs, and sheets              | `index.html`, `Toast.tsx`, `primitives.tsx` |
| Light/dark `theme-color` meta tags, updated before React loads and on theme change | `index.html`, `useTheme.tsx`                |
| Lazy-loaded routes, so the shell is small                                          | `App.tsx`                                   |
| URL normalization and readable fallback titles                                     | `src/lib/url.ts`                            |
| Add dialog accepts an `initialUrl` and detects the source                          | `LinkFormDialog.tsx`                        |
| Duplicate notice with "edit existing" path                                         | `LinkFormDialog.tsx`, `hooks.ts`            |
| SPA fallback for deep links                                                        | `vercel.json`, `public/_redirects`          |
| Hosted on HTTPS (Vercel), which PWAs require                                       | README → Deployment                         |

### Gaps

| #   | Gap                                                                                                                                                                                               | Where                                        | Sev  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---- |
| P1  | **No web app manifest.** The browser can't install the app.                                                                                                                                       | `index.html`, `public/`                      | High |
| P2  | **No raster icons.** Only a 32px `favicon.svg` exists. Install needs 192px and 512px PNGs, plus a maskable icon for Android and a 180px `apple-touch-icon` for iOS.                               | `public/`                                    | High |
| P3  | **No service worker.** Each launch fetches the shell from the network. Offline launch shows the browser's error page.                                                                             | —                                            | High |
| P4  | **No route to receive shares.** There is no `/share` route, and `LinkFormDialog` can't take an initial title.                                                                                     | `App.tsx`, `LinkFormDialog.tsx`              | High |
| P5  | **Login drops the destination.** `RequireAuth` redirects to `/login` without remembering where you were going, and `AuthPage` always returns to `/`. A share made while signed out would be lost. | `App.tsx` → `RequireAuth`, `AuthPage.tsx:21` | High |
| P6  | **Saves hang offline.** TanStack Query's default `networkMode: 'online'` _pauses_ mutations when offline, so Save would show "Saving…" indefinitely instead of failing.                           | `App.tsx` → `QueryClient`                    | Med  |
| P7  | **Toasts have no action button.** An "Update available — Reload" prompt needs one.                                                                                                                | `Toast.tsx`                                  | Med  |
| P8  | **Hosting rules don't cover PWA files.** `sw.js` must not be cached long-term, and the SPA rewrite should not answer requests for `manifest.webmanifest`, `sw.js`, `workbox-*.js`, or icons.      | `vercel.json`                                | Med  |

---

## 3. Approach and Tooling

Use **[`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/)** (v1.3, peer-supports Vite 8) in `generateSW` mode:

- It generates the manifest, injects `<link rel="manifest">`, and builds a Workbox service worker that precaches the hashed files in `dist/assets/`.
- `registerType: 'prompt'` plus the `virtual:pwa-register/react` hook gives us control over when an update applies (Goal 4).
- No custom service worker code is needed. The share target uses **GET**, so the browser opens a normal URL and the SPA handles it (§5). POST/multipart share targets need a hand-written fetch handler. We don't need one because we never accept files.

For icons, run **`@vite-pwa/assets-generator`** once from `public/favicon.svg` and commit the PNGs. Pin it to `^1` because the plugin's optional peer range is `^1.0.0` and 2.0 is now latest. If the generated maskable icon looks cramped, hand-tune a padded SVG source.

Rejected alternative: a hand-written `manifest.webmanifest` and `sw.js`. This needs fewer dependencies, but then we must maintain the precache list for hashed assets ourselves. Updates are also easy to break.

---

## 4. Phase 1 — Installable App Shell (P1, P2, P3, P8)

### 4.1 Dependencies

```sh
npm i -D vite-plugin-pwa @vite-pwa/assets-generator@^1
```

### 4.2 Icons

Add `pwa-assets.config.ts` with the `minimal2023Preset` preset and `public/favicon.svg` as the source. Generate:

| File                                  | Size | Purpose                                                                                      |
| ------------------------------------- | ---- | -------------------------------------------------------------------------------------------- |
| `public/pwa-64x64.png`                | 64   | Small fallback                                                                               |
| `public/pwa-192x192.png`              | 192  | Android launcher                                                                             |
| `public/pwa-512x512.png`              | 512  | Splash screen, install UI                                                                    |
| `public/maskable-icon-512x512.png`    | 512  | `purpose: "maskable"`, keep the bookmark glyph inside the 80% safe zone on a `#386349` field |
| `public/apple-touch-icon-180x180.png` | 180  | iOS home screen (no transparency)                                                            |

Add a `"pwa:icons": "pwa-assets-generator"` script so the icons can be regenerated, and commit the outputs. The build must not depend on the generator.

### 4.3 Manifest (via `VitePWA({ manifest })` in `vite.config.ts`)

```ts
manifest: {
  id: '/',
  name: 'Scratch-Pad',
  short_name: 'Scratch-Pad',
  description: 'Save links, add a few tags, and find your way back.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'any',
  background_color: '#f8f8f7',
  theme_color: '#f8f8f7',
  icons: [ /* the files from §4.2, maskable one marked purpose: 'maskable' */ ],
  share_target: { /* §5.1 */ },
  shortcuts: [{ name: 'Add a link', url: '/?add=1', icons: [/* 192 */] }],
}
```

- `theme_color` matches the light `meta[name=theme-color]`. The existing per-theme meta tags still override it at runtime, so dark mode keeps its dark bar.
- `display: 'standalone'` works with the existing `viewport-fit=cover` and safe-area padding. Re-check the sticky phone search and header in standalone mode (§7).
- The `?add=1` shortcut needs a small hook in `LibraryPage` that opens `setForm({})` and then removes the param with `replace`. The `n` key already does the same.

### 4.4 Service worker (via `VitePWA({ workbox })`)

```ts
registerType: 'prompt',
injectRegister: false,          // registered from React, see §6
workbox: {
  globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
  navigateFallback: '/index.html',
  cleanupOutdatedCaches: true,
  // No runtimeCaching for Supabase: auth and data requests always go to the network.
},
devOptions: { enabled: false },
```

- **Supabase requests are never cached.** They're cross-origin and not in the precache, so Workbox leaves them alone. Do not add `runtimeCaching` for `*.supabase.co`. Cached auth or REST responses could leak across accounts on a shared device.
- With `navigateFallback`, a deep link such as `/tags` or `/share?...` opened offline serves the cached shell. React Router handles the rest.
- Lazy route chunks (`AuthPage`, `LibraryPage`, …) are hashed files under `assets/`, so they're precached too. The first offline open doesn't need to fetch them.

### 4.5 `index.html`

- Add `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />`.
- Add `<meta name="apple-mobile-web-app-title" content="Scratch-Pad" />`.
- Leave `<meta name="mobile-web-app-capable">` out. The manifest covers Android, and iOS 16.4+ reads the manifest's `display`.
- The plugin injects the manifest `<link>`.

### 4.6 Hosting (`vercel.json`, `public/_redirects`)

```json
{
  "headers": [
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    {
      "source": "/manifest.webmanifest",
      "headers": [{ "key": "Content-Type", "value": "application/manifest+json" }]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!assets/|favicon.svg|sw.js|workbox-|manifest.webmanifest|pwa-|maskable-|apple-touch-).*)",
      "destination": "/index.html"
    }
  ]
}
```

Keep the existing `framework`, `buildCommand`, and `outputDirectory` keys. Vercel serves real files before rewrites, so the expanded exclusion only makes a missing PWA file return 404 instead of HTML. Without it, a browser can try to parse `index.html` as a service worker. `public/_redirects` (Netlify/Cloudflare) already serves existing files first, so it needs no change.

---

## 5. Phase 2 — Share Target (P4, P5)

### 5.1 Manifest entry

```ts
share_target: {
  action: '/share',
  method: 'GET',
  params: { title: 'title', text: 'text', url: 'url' },
},
```

### 5.2 What apps actually send

Android apps fill these fields inconsistently. The parser must handle all of these cases:

| Source (typical)         | `url`    | `text`                                       | `title`     |
| ------------------------ | -------- | -------------------------------------------- | ----------- |
| Chrome "Share…"          | page URL | empty or selected text                       | page title  |
| YouTube app              | empty    | `https://youtu.be/…`                         | video title |
| Reddit / Messenger / X   | empty    | `Look at this https://… ` (URL inside prose) | sometimes   |
| Notes / plain text share | empty    | arbitrary text, maybe no URL                 | empty       |

### 5.3 `src/lib/share.ts` (pure, unit-tested)

```ts
export type SharedLink = { url: string; title: string } | { error: string }
export function parseShare(params: URLSearchParams): SharedLink
```

1. Candidate URL: the `url` param, else the first `https?://…` match in `text`, else the first match in `title`.
2. Run the candidate through the existing `normalizeUrl`. Strip trailing punctuation such as `)` `.` `,` `!` from prose matches first.
3. Title: `title` if it is non-empty and isn't just the URL. Else use `text` with the URL removed, trimmed, and capped at the title field's limit. Else `''`, which lets `defaultTitle` apply on save, as it does today.
4. If no URL is found, return `{ error: "That share didn't include a web link." }`.

Add `src/lib/share.test.ts` covering each row of §5.2 plus `javascript:`/`data:` URLs (rejected by `normalizeUrl`), a URL with an encoded query, and an oversized `text`.

### 5.4 `/share` route

- Add a lazy `SharePage` inside `RequireAuth` (no `AppLayout`) in `App.tsx`.
- It calls `parseShare(location.search)`, then `navigate('/', { replace: true, state: { share: result } })`. Using `replace` means Back doesn't return to `/share` and reopen the dialog.
- `LibraryPage` reads `location.state?.share` once on mount:
  - A URL opens `setForm({ url, title })`.
  - An error shows a toast.
  - Afterward it clears the state with `navigate('.', { replace: true, state: null })` so a reload doesn't reopen the dialog.
- `LinkFormDialog` gains an `initialTitle` prop, used when not editing. The `key` in `LibraryPage` already includes `form.url`, so a second share remounts the dialog.
- The duplicate notice keeps working unchanged. Sharing an already-saved link shows "already saved — edit it?"

### 5.5 Remember the destination across login (P5)

- `RequireAuth`: `<Navigate to="/login" replace state={{ from: location }} />`.
- `AuthPage`: after a session exists, `<Navigate to={from ?? '/'} replace />`, where `from` is read from `location.state`. Only accept same-origin paths. They're `Location` objects from our own router, so take `pathname + search` and require that it starts with `/`.
- The signup link should forward the same `state`, so "share → no account yet → sign up" still lands in the dialog.

### 5.6 iOS fallback (documentation only)

Safari has no share target. Document two workarounds in the README:

- An **iOS Shortcut** that takes the shared URL and opens `https://<host>/share?url=<URL>`.
- **Paste on open.** The library's existing paste handler already opens Add when a URL is pasted outside an input.

A future bookmarklet can reuse the same `/share?url=&title=` entry point.

---

## 6. Phase 3 — Updates and Connectivity (P6, P7)

### 6.1 Update prompt

- `src/components/PwaUpdater.tsx` uses `useRegisterSW` from `virtual:pwa-register/react`. Mount it inside `ToastProvider`.
- When `needRefresh` becomes true, show a persistent toast: "A new version is ready." with a **Reload** button that calls `updateServiceWorker(true)`. Never auto-reload. An open add/edit dialog could lose input.
- Check for updates on `visibilitychange` → visible, at most hourly, with `registration.update()`. Home-screen apps can stay open for days.
- `Toast.tsx` needs an optional `action: { label, onClick }` and a `persist` flag that skips the 4.5s timeout. Keep the current `(message) => void` call signature working for existing callers.
- Add `/// <reference types="vite-plugin-pwa/react" />` (or `vite-plugin-pwa/client`) to the Vite env types.

### 6.2 Offline behavior

- Set `networkMode: 'always'` on mutations in the `QueryClient` defaults. Offline saves then fail right away with the existing error UI instead of hanging.
- Add a `useOnlineStatus` hook (`navigator.onLine` + `online`/`offline` events). When offline:
  - Show a slim banner in `AppLayout`: "You're offline. Saved links will load when you reconnect."
  - Disable Save in `LinkFormDialog` with the hint "Reconnect to save." Keep the typed input.
- Queries already pause offline (the default `networkMode: 'online'`) and refetch on reconnect. Leave them as they are.
- Login/signup offline: `errorMessage` should map Supabase's fetch failure to "You're offline. Connect and try again." Check `src/lib/errors.ts` for the current wording.

---

## 7. Verification

### 7.1 Automated

| Check                              | How                                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Share parsing                      | `npm test`, which runs `share.test.ts` (§5.3)                                                                                                                                      |
| Manifest is valid and linked       | New `tests/pwa.spec.ts`: fetch `/manifest.webmanifest`, assert `name`, `start_url`, `display`, `share_target.action === '/share'`, and that every icon URL returns 200 `image/png` |
| SW registers and controls the page | Same spec, against a **production build** (`vite build && vite preview`), because `devOptions` is off. Add a Playwright project or a second `webServer` on port 5175 for it        |
| Offline shell                      | `context.setOffline(true)`, reload `/`, and expect the app shell plus the offline banner, not a browser error                                                                      |
| Share flow, signed in              | Visit `/share?text=Watch%20this%20https://youtu.be/abc123&title=Video` and expect the add dialog with the URL and title filled in. Back must not reopen it                         |
| Share flow, signed out             | Same URL logged out → log in → dialog opens with the shared values                                                                                                                 |
| No-URL share                       | `/share?text=hello` → library + toast, no dialog                                                                                                                                   |
| Update prompt                      | Unit-test `PwaUpdater` with a mocked `useRegisterSW`. A full SW-swap E2E is not worth the flakiness                                                                                |
| Existing suites                    | `npm run lint`, `format:check`, `build`, the 23 unit tests, and all Playwright projects stay green. axe runs on the offline banner and the toast action                            |

### 7.2 Manual, on devices

- [ ] Android Chrome: install prompt appears; icon is not cropped (maskable); splash uses `background_color`.
- [ ] Android: "Share → Scratch-Pad" appears after install and works from Chrome, YouTube, Reddit, and Messenger.
- [ ] Android: sharing while the app is already open in the background opens the dialog with the new link.
- [ ] Standalone mode: header, sticky search, bottom sheets, and toasts respect the status bar and gesture-bar safe areas in light and dark.
- [ ] Dark theme: status bar color follows the in-app theme, not only the manifest `theme_color`.
- [ ] iOS Safari: "Add to Home Screen" uses the apple-touch-icon and opens standalone; the session persists after relaunch.
- [ ] Desktop Chrome/Edge: install from the address bar; the "Add a link" shortcut works from the dock/taskbar.
- [ ] Deploy a second build: the update toast appears, Reload applies it, and no stale chunk errors appear.
- [ ] Airplane mode: the app opens and shows the offline banner; Save is disabled; reconnecting refetches.
- [ ] Chrome DevTools → Application → Manifest shows no installability warnings. Lighthouse 12 has no PWA category, so use this panel instead.

---

## 8. Optional — Offline Reading (not in this plan's scope)

If read-only offline access turns out to matter:

- Persist the TanStack Query cache with `@tanstack/query-sync-storage-persister` (or IndexedDB) for `links`, `tags`, and `sources` only.
- Key the persisted cache by `session.user.id`, and **clear it on sign-out** in `AuthProvider` so a shared device never shows the previous user's links.
- Set a `maxAge` (for example, 7 days) and a cache `buster` tied to the app version.

Offline _writes_ (a queued outbox) need conflict and duplicate handling against the transactional save RPC. That's a separate design.

---

## 9. Files Touched

| File                                        | Change                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `package.json`                              | `vite-plugin-pwa`, `@vite-pwa/assets-generator@^1`, `pwa:icons` script                 |
| `vite.config.ts`                            | `VitePWA({...})` with manifest, share target, workbox                                  |
| `pwa-assets.config.ts`                      | New: icon generation config                                                            |
| `public/*.png`                              | New: generated icons                                                                   |
| `index.html`                                | apple-touch-icon, apple app title                                                      |
| `vercel.json`                               | SW/manifest headers; widen rewrite exclusions                                          |
| `src/vite-env.d.ts` (or `tsconfig` types)   | PWA virtual module types                                                               |
| `src/lib/share.ts`, `src/lib/share.test.ts` | New: share parsing                                                                     |
| `src/features/share/SharePage.tsx`          | New: `/share` route                                                                    |
| `src/App.tsx`                               | `/share` route, `RequireAuth` `from` state, mutation `networkMode`, mount `PwaUpdater` |
| `src/features/auth/AuthPage.tsx`            | Redirect to `from` after login/signup                                                  |
| `src/features/links/LibraryPage.tsx`        | Open dialog from share state and `?add=1`                                              |
| `src/features/links/LinkFormDialog.tsx`     | `initialTitle` prop; disable Save offline                                              |
| `src/components/ui/Toast.tsx`               | Optional action button + persistent toasts                                             |
| `src/components/PwaUpdater.tsx`             | New: update prompt                                                                     |
| `src/hooks/useOnlineStatus.ts`              | New                                                                                    |
| `src/components/layout/AppLayout.tsx`       | Offline banner                                                                         |
| `src/lib/errors.ts`                         | Offline error wording                                                                  |
| `tests/pwa.spec.ts`, `playwright.config.ts` | New spec; production-build server                                                      |
| `README.md`, `DEVELOPMENT_PLAN.md`          | Install/share instructions, iOS Shortcut, mark "Mobile share target" done              |

## 10. Suggested Order

1. **Phase 1** (§4): ship and confirm install works on a real Android phone before going further.
2. **Phase 2** (§5): the feature that matters. §5.5 (login redirect) belongs in the same change.
3. **Phase 3** (§6): needed before relying on the installed app day to day, so stale versions don't linger.
4. §8 only if offline reading is actually missed.
