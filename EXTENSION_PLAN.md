# Scratch-Pad — Browser Extension Plan

A plan for a small personal browser extension that saves the page you're on, or a link you right-click, to Scratch-Pad without first opening the site.

[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) lists a bookmarklet as the first "Later" item. This plan covers the same need with fewer clicks and adds a bookmarklet as a fallback (§7). It is based on the current code in `src/` and the share flow from [PWA_PLAN.md](PWA_PLAN.md).

**Implementation status:** Phases 1–3 implemented October 4, 2026, including extension assets, popup closing, automated tests, install documentation, and the bookmarklet. October 7 follow-up adds repeatable menu installation, defensive handling of unavailable tab metadata, a minimum Chrome version, loaded Chromium extension tests, and [step-by-step installation instructions](EXTENSION_INSTALL.md). Physical browser UI verification (§8.2) and personal Firefox signing/installation remain pending. The optional fallback (§5.3) is deferred unless native testing shows it is needed; the direct-save form (§9) is outside this implementation.

Implementation adjustments: the empty-add fallback includes `popup=1`; Vitest's explicit include list now picks up extension tests; `LinkFormDialog` distinguishes successful saves from cancellation; and Firefox's minimum is 140 with data declarations required by its current signing process. Only `contextMenus` and `activeTab` API permissions are requested.

---

## 1. Goals and Non-Goals

**Goals**

1. **One action from any page.** A toolbar button or keyboard shortcut opens Scratch-Pad's add dialog with the current page's URL and title filled in.
2. **Right-click to save.** Save a link without opening it first, or save the selected text when it contains a URL, as in chat messages that aren't links.
3. **Out of the way.** The add dialog opens in a small popup window and closes after you save or cancel, so you stay on the page you were reading.
4. **No second copy of the app.** Login, tags, source detection, duplicate notices, and validation all stay in the web app.
5. **Minimal permissions.** The extension never reads page content or other sites' data.

**Non-goals**

- Chrome Web Store or public addons.mozilla.org listing. This is for personal use.
- Saving directly from an extension popup without opening the app (§9, possible later).
- Safari. It needs an Xcode-wrapped app extension, which isn't worth it for one user.
- Mobile browsers. Android already has Share → Scratch-Pad through the PWA.

---

## 2. Where the App Stands Today

Most of the work is already done. The `/share` route built for the PWA share target accepts any GET request.

| Already in place                                                                      | Where                                     |
| ------------------------------------------------------------------------------------- | ----------------------------------------- |
| `/share?url=&title=&text=` opens the add dialog with the URL and title                | `SharePage.tsx`, `LibraryPage.tsx`        |
| Extracts the first URL from free text (`text=`), trimming trailing punctuation        | `src/lib/share.ts`                        |
| Rejects non-http(s) URLs with a toast instead of a broken dialog                      | `src/lib/share.ts`, `src/lib/url.ts`      |
| Keeps the shared link through login and signup, using `replace` navigation            | `App.tsx` → `RequireAuth`, `AuthPage.tsx` |
| Falls back to a readable title when none is given                                     | `LinkFormDialog.tsx`, `defaultTitle()`    |
| Shows a duplicate notice with "edit existing"                                         | `LinkFormDialog.tsx`                      |
| Phone-width layout keeps Save in the dialog header, which suits a ~480px popup window | `RESPONSIVE_PLAN.md`                      |
| Cached app shell, so the popup window opens quickly                                   | `vite.config.ts` → `VitePWA`              |

### Gaps

| #   | Gap                                                                                                                                        | Where              | Sev  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ---- |
| E1  | **No extension.** Nothing in the browser UI opens `/share`.                                                                                | —                  | High |
| E2  | **Nothing closes the window after saving.** Saving closes the dialog, but the popup window stays open on the library page.                 | `LibraryPage.tsx`  | Med  |
| E3  | **Lint doesn't know extension globals.** `js.configs.recommended` applies to every `.js` file, so `chrome` would be reported as undefined. | `eslint.config.js` | Low  |

---

## 3. Approach

**A plain-JavaScript Manifest V3 extension with no build step**, in `extension/` at the repo root. All it does is build a `/share` URL and open it.

- **No bundler or dependencies.** About 80 lines of JS. Chrome loads the folder directly.
- **Works in Chrome, Edge, Brave, and Firefox from one manifest.** `chrome.*` APIs work in Firefox too. The manifest declares both `background.service_worker` (used by Chromium) and `background.scripts` (used by Firefox). Chrome 121+ and Firefox 121+ each ignore the key meant for the other. The implemented extension requires Firefox 140+ to use its current built-in data consent for signing.
- **Uses only `contextMenus` and `activeTab`.** `activeTab` gives the tab's URL and title only after you click the button, use the shortcut, or choose a menu item. No host permissions are needed (but see §5.3 for the optional fallback).

**Rejected: an extension popup that saves through Supabase directly.** It's faster to use, but it needs a second login, a Vite build for the extension, and a second form UI that has to stay in step with `LinkFormDialog`. See §9.

**Rejected: a content script that injects a "Save" button into pages.** It needs `<all_urls>` host permissions and breaks on some sites. It adds nothing that the toolbar button doesn't already do.

---

## 4. Phase 1 — The Extension (E1, E3)

### 4.1 Files

```
extension/
  manifest.json
  background.js        # event handlers
  share-url.js         # pure: builds the /share URL (unit-tested)
  share-url.test.js
  icons/icon-64.png    # copied from public/pwa-64x64.png
  icons/icon-192.png   # copied from public/pwa-192x192.png
```

Commit the copied icons. They only change if the favicon changes.

### 4.2 `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Scratch-Pad",
  "version": "1.0.0",
  "description": "Save the current page or a link to Scratch-Pad.",
  "icons": { "64": "icons/icon-64.png", "192": "icons/icon-192.png" },
  "action": { "default_title": "Save to Scratch-Pad" },
  "background": {
    "service_worker": "background.js",
    "scripts": ["background.js"],
    "type": "module"
  },
  "permissions": ["contextMenus", "activeTab"],
  "commands": {
    "_execute_action": {
      "suggested_key": { "default": "Alt+Shift+S" },
      "description": "Save the current page"
    }
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "scratch-pad@lindtseyyy",
      "strict_min_version": "140.0",
      "data_collection_permissions": {
        "required": ["browsingActivity", "websiteContent"]
      }
    }
  }
}
```

- The manifest has no `default_popup`, so clicking the button fires `chrome.action.onClicked`. `_execute_action` makes the shortcut fire the same event.
- Firefox requires the `gecko.id` for signing (§6.2). Chrome ignores it.
- Users can change the shortcut at `chrome://extensions/shortcuts` or in Firefox's add-on settings.

### 4.3 `share-url.js` (pure, unit-tested)

```js
export const APP_URL = 'https://scratch-pad-omega.vercel.app'

/** Returns the URL to open for a page, link, or text selection. */
export function shareUrl({ url = '', title = '', text = '' }, app = APP_URL) {
  if (!/^https?:\/\//i.test(url) && !text) return `${app}/?add=1&popup=1`
  const params = new URLSearchParams()
  if (/^https?:\/\//i.test(url)) params.set('url', url)
  if (title) params.set('title', title)
  if (text) params.set('text', text)
  params.set('popup', '1')
  return `${app}/share?${params}`
}
```

- **Pages that aren't web pages** (`chrome://`, `about:`, `file://`, the new-tab page) open an empty add dialog instead of an error toast.
- **Validation stays in the app.** `share.ts` and `normalizeUrl()` still check every URL, so the extension does only a quick scheme check.
- **For local testing,** change `APP_URL` to `http://127.0.0.1:5173`. An options page isn't worth it for one user.

### 4.4 `background.js`

```js
import { APP_URL, shareUrl } from './share-url.js'

const open = (url) =>
  chrome.windows.create({ url, type: 'popup', width: 480, height: 720, focused: true })

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'link', title: 'Save link to Scratch-Pad', contexts: ['link'] })
  chrome.contextMenus.create({ id: 'page', title: 'Save page to Scratch-Pad', contexts: ['page'] })
  chrome.contextMenus.create({
    id: 'selection',
    title: 'Save link in selection',
    contexts: ['selection'],
  })
  chrome.contextMenus.create({ id: 'library', title: 'Open Scratch-Pad', contexts: ['action'] })
})

chrome.action.onClicked.addListener((tab) => open(shareUrl({ url: tab.url, title: tab.title })))

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'link') open(shareUrl({ url: info.linkUrl, title: info.linkText }))
  if (info.menuItemId === 'page') open(shareUrl({ url: tab.url, title: tab.title }))
  if (info.menuItemId === 'selection') open(shareUrl({ text: info.selectionText }))
  if (info.menuItemId === 'library') chrome.tabs.create({ url: APP_URL })
})
```

Notes:

- **Link titles.** Firefox provides `info.linkText`. Chrome doesn't, so the title falls back to `defaultTitle()` from the URL, which you can edit in the dialog.
- **Selections.** `share.ts` already pulls the first URL out of `text=` and uses the rest as the title. If the selection contains no URL, the app shows "That share didn't include a web link."
- **Sessions.** The popup window shares the normal profile's storage, so an existing Supabase session is used and you don't sign in again. Private windows have separate storage, and extensions are off there by default anyway.
- **Event registration.** Register listeners at the top level and create menus in `onInstalled`, because MV3 background scripts are unloaded when idle.

### 4.5 Lint and test wiring (E3)

- `eslint.config.js`: add `{ files: ['extension/**/*.js'], languageOptions: { globals: { ...globals.browser, ...globals.webextensions } } }`.
- `vite.config.ts`: extend the existing explicit Vitest include list with `extension/**/*.test.js`, so `npm test` picks up the URL builder tests.
- `.vercelignore`: add `extension/`. It isn't part of `dist/`, but this keeps it out of deploy uploads.

---

## 5. Phase 2 — Close the Window After Saving (E2)

The extension adds `popup=1` to `/share` URLs. The app uses that flag to close the window once the dialog has done its job.

### 5.1 Carry the flag

- `SharePage.tsx`: pass `popup: params.get('popup') === '1'` in the navigation `state` alongside `share`.
- `LibraryPage.tsx`: record `popup` in the initial `form` state, next to `url`, `title`, and `entry`. Keep it when `onEditDuplicate` switches the dialog to the existing link.
- `/?add=1&popup=1`, used for non-web pages, should work the same way. Read `popup` from the search params there and remove it when `add` is removed.

### 5.2 Close

When the dialog closes after a save, a cancel, or Escape, and `popup` is set:

- **After a save,** wait about 600 ms so the "Link saved for later." toast can be seen, then call `window.close()`.
- **After a cancel,** call `window.close()` immediately.

Browsers allow scripts to close a window that has only one history entry. The extension-opened window qualifies: `/share` → `/` and the login redirects all use `replace` navigation. If `popup=1` appears in an ordinary tab with more history, `window.close()` does nothing, which is harmless.

### 5.3 Fallback if `window.close()` is blocked

If manual testing (§8.2) shows a browser ignoring `window.close()`, do two things:

- Have the app navigate to `/?saved=1` after a popup save.
- Have the extension watch its own window with `chrome.tabs.onUpdated` and close it with `chrome.windows.remove`.

Reading the tab's URL requires `"host_permissions": ["https://scratch-pad-omega.vercel.app/*"]`. That permission covers only your own site. Add it only if it's needed.

---

## 6. Phase 3 — Install and Document

### 6.1 Chrome, Edge, and Brave

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `extension/`. It stays installed across restarts. After editing files, click the extension's reload icon.

### 6.2 Firefox

`about:debugging` → **Load Temporary Add-on** is fine for testing, but the add-on is removed when Firefox restarts. To install it permanently:

1. Create an addons.mozilla.org account and API keys (free).
2. Run `npx web-ext lint -s extension --ignore-files '**/*.test.js'`, then `npx web-ext sign -s extension --channel=unlisted --ignore-files '**/*.test.js' --api-key=… --api-secret=…`.
3. Install the signed `.xpi` it downloads. The add-on is unlisted, so only you have it. Bump `version` before each re-sign.

Don't add `web-ext` to `package.json`. Running it occasionally through `npx` is enough.

New add-ons must declare transmitted data for [Firefox's built-in data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/). The implementation declares browsing activity and website content and requires Firefox 140+, where this consent is built in. Generated `web-ext-artifacts/` files are ignored by Git and Vercel.

### 6.3 README

Add a "Browser extension" section covering install steps, the shortcut, the right-click menus, the `APP_URL` change for local testing, and the bookmarklet (§7).

---

## 7. Bookmarklet (documentation only)

This covers browsers where you don't want to install anything and closes the DEVELOPMENT_PLAN "Bookmarklet" item:

```js
javascript: void window.open(
  'https://scratch-pad-omega.vercel.app/share?popup=1&url=' +
    encodeURIComponent(location.href) +
    '&title=' +
    encodeURIComponent(document.title),
  'scratchpad',
  'popup,width=480,height=720',
)
```

Some sites' Content Security Policy blocks bookmarklets, and that's why the extension is the main path.

---

## 8. Verification

### 8.1 Automated

Verified October 4, 2026: 75 unit tests and 25 browser scenarios passed (24 in the full run, plus a focused successful rerun of the actual-close check after correcting its initial history setup). Lint, formatting, and the production build passed. Firefox extension lint had no errors; its two warnings concern the intentionally shared Chromium background key and Android's separate minimum version. Actual Chrome window closing with one history entry is tested without a stub; the extension's native UI remains on the manual checklist below.

- `extension/share-url.test.js` (Vitest), checking that:
  - A page URL and title are encoded correctly.
  - `chrome://`, `about:blank`, and `file://` give `/?add=1&popup=1`.
  - A selection becomes `text=`.
  - `popup=1` is always present.
  - Unicode titles and URLs containing `&`, `#`, and `?` round-trip through `parseShare()`.
- `tests/pwa.spec.ts` (existing production project), with `window.close` stubbed through `page.addInitScript`. Check that:
  - `/share?url=…&popup=1` → Save calls `close()` after the toast.
  - Cancel calls it immediately.
  - Without `popup=1`, it's never called.
  - Login in between still closes after saving.
  - "Edit existing" on a duplicate keeps the flag.
- `npm run lint`, `npm run format:check`, `npm run build`.

`npm run test:extension` now uses Playwright's bundled Chromium in a separate configuration to load the extension in an isolated profile. It invokes the actual registered handlers through a bridge added only to a disposable test copy. Browser popup creation, app navigation, login/session reuse, saving, duplicate editing, cancellation, and closing use the real extension and browser APIs. The hosted URL is unchanged. Native toolbar, menu, and shortcut gestures still require the manual checks below. `extension/background.test.js` covers menu replacement on updates, immediate event registration, and page/link/selection/library routing.

Verified October 7, 2026: 108 unit tests and both loaded Chromium extension scenarios passed. Firefox extension lint reports zero errors and the same two warnings described above.

### 8.2 Manual (Chrome and Firefox)

- [ ] The toolbar button on an article opens the popup with its URL and title, and Save closes the window.
- [ ] `Alt+Shift+S` does the same.
- [ ] Right-clicking a link saves that link, not the page.
- [ ] Selecting "check this https://example.com/x." in a chat page saves `https://example.com/x`.
- [ ] On `chrome://extensions` or a new-tab page, an empty add dialog opens.
- [ ] Signed out: login in the popup, the dialog opens with the link, and Save closes the window.
- [ ] A duplicate shows the notice, and "Edit existing" then Save closes the window.
- [ ] Cancel and Escape close the window.
- [ ] The popup follows the system dark theme.
- [ ] Firefox: the signed `.xpi` survives a restart.

---

## 9. Possible Later — Save Without Opening the App

Do this only if the popup window still feels slow after daily use.

- The extension popup becomes its own form (title, tags, note, Save), built with Vite as a second entry point. It reuses `src/lib/url.ts`, `source.ts`, `share.ts`, and `auth-email.ts`.
- It calls the same `save_link` RPC and duplicate lookup as `src/features/links/api.ts`. **No database changes are needed**, because RLS already limits everything to the signed-in user.
- The extension has its own username/password login. The Supabase session is stored in `chrome.storage.local` through supabase-js's custom `storage` option. The build needs the same three `VITE_*` values.
- Cost: a second login, a build pipeline, a second form to maintain, and `host_permissions` for the Supabase URL. Expect roughly a day of work.

---

## 10. Files Touched

| File                                    | Change                                                       |
| --------------------------------------- | ------------------------------------------------------------ |
| `extension/manifest.json`               | New                                                          |
| `extension/background.js`               | New: action, shortcut, context menus                         |
| `extension/share-url.js`, `.test.js`    | New: URL builder and tests                                   |
| `extension/icons/*.png`                 | New: copied from `public/`                                   |
| `eslint.config.js`                      | `webextensions` globals for `extension/**`                   |
| `.vercelignore`                         | Exclude `extension/`                                         |
| `src/features/share/SharePage.tsx`      | Pass `popup` in navigation state                             |
| `src/features/links/LibraryPage.tsx`    | Keep `popup` in form state; close the window on dialog close |
| `src/features/links/LinkFormDialog.tsx` | Report whether closing follows a save or cancellation        |
| `vite.config.ts`                        | Include extension unit tests                                 |
| `.gitignore`                            | Ignore generated Firefox signing artifacts                   |
| `tests/pwa.spec.ts`                     | Popup close tests                                            |
| `README.md`, `DEVELOPMENT_PLAN.md`      | Extension and bookmarklet docs; mark "Bookmarklet" done      |

## 11. Suggested Order

1. **Phase 1** (§4): load it unpacked and use it for a day. It works even without Phase 2, but you close the window yourself.
2. **Phase 2** (§5): the app change and its tests. Use §5.3 only if manual testing shows `window.close()` being blocked.
3. **Phase 3** (§6, §7): Firefox signing if you use Firefox, plus the README and bookmarklet.
4. §9 only if saving through the app window turns out to be too slow.
